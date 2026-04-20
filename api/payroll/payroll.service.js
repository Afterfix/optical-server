class PayrollService {
  constructor(payrollRepository, tenantRepository, transactionService) {
    this.repository = payrollRepository;
    this.tenantRepository = tenantRepository;
    this.transactionService = transactionService;
  }

  // ADDED: db param
  async getAll(user, filters, db) {
    let tenantId;
    if (user.role === "super_admin") {
      if (!filters.tenant_id) {
        const error = new Error(
          "Bad Request: Super admin must specify a 'tenant_id' in the query parameters."
        );
        error.statusCode = 400;
        throw error;
      }
      tenantId = filters.tenant_id;
    } else {
      tenantId = user.tenant_id;
    }
    // Pass db to repo
    return this.repository.getAllByUser(db, tenantId, filters);
  }

  // ADDED: db param
  async getAllPaginated(user, filters, db) {
    let tenantId;
    if (user.role === "super_admin") {
      if (!filters.tenant_id) {
        const error = new Error(
          "Bad Request: Super admin must specify a 'tenant_id' in the query parameters."
        );
        error.statusCode = 400;
        throw error;
      }
      tenantId = filters.tenant_id;
    } else {
      tenantId = user.tenant_id;
    }
    // Pass db to repo
    const { payrollRecords, totalCount } =
      await this.repository.getPaginatedByTenantId(db, tenantId, filters);
    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return { data: payrollRecords, count: totalCount, page_count };
  }

  // ADDED: db param
  async getById(id, user, db) {
    const tenantId = user.role === "super_admin" ? null : user.tenant_id;
    // Pass db to repo
    const payroll = await this.repository.getById(db, id, tenantId);
    if (!payroll) {
      throw new Error("Payroll record not found or not authorized");
    }
    return payroll;
  }

  // ADDED: db param
  async create(payrollData, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      let tenantIdForNewEntry;
      if (user.role === "super_admin") {
        if (!payrollData.tenant_id) {
          throw new Error("Super admin must specify a 'tenant_id' in the request body.");
        }
        tenantIdForNewEntry = payrollData.tenant_id;
      } else {
        tenantIdForNewEntry = user.tenant_id;
      }

      const dataToSave = {
        ...payrollData,
        tenant_id: tenantIdForNewEntry,
        done_by_id: payrollData.done_by_id || null, 
      };

      // 1. Create Payroll Record (Pass client)
      const newPayroll = await this.repository.create(client, dataToSave);

      // 2. Create Transaction (Pass client)
      await this.transactionService.create(
        {
          tenant_id: newPayroll.tenant_id,
          transaction_type: "expense", 
          reference_id: newPayroll.id,
          account_id: newPayroll.account_id,
          amount: parseFloat(newPayroll.salary),
          description: `Payroll Payment - ${newPayroll.pay_date}`,
          cost_center_id: newPayroll.cost_center_id,
          done_by_id: newPayroll.done_by_id, 
        },
        user, // Pass user if required by signature
        client
      );

      await client.query("COMMIT");
      // return this.repository.getById(
      //   db,
      //   newPayroll.id,
      //   user.role === "super_admin" ? null : user.tenant_id
      // );
      return {
        status: "success",
        data:newPayroll};
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status: "failed",
        message: error.message || "Something went wrong",
      };
    } finally {
      client.release();
    }
  }

  // ADDED: db param
  async createBulk(bulkData, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      let tenantId;
      let payrolls;

      if (user.role === "super_admin") {
        if (!bulkData.tenant_id) {
          throw new Error("Super admin must specify a 'tenant_id' at the top level.");
        }
        tenantId = bulkData.tenant_id;
        payrolls = bulkData.payrolls;
      } else {
        tenantId = user.tenant_id;
        payrolls = bulkData;
      }

      const payrollsPrepared = payrolls.map((p) => ({
        ...p,
        done_by_id: p.done_by_id || null, 
      }));

      // 1. Bulk Insert Payrolls (Pass client)
      const newPayrolls = await this.repository.createBulk(client, payrollsPrepared, tenantId);

      // 2. Loop to create Transactions for each (Pass client)
      for (const p of newPayrolls) {
        await this.transactionService.create(
          {
            tenant_id: p.tenant_id,
            transaction_type: "expense",
            reference_id: p.id,
            account_id: p.account_id,
            amount: parseFloat(p.salary),
            description: `Payroll Payment`, 
            cost_center_id: p.cost_center_id,
            done_by_id: p.done_by_id,
          },
          user,
          client
        );
      }

      await client.query("COMMIT");
      return {
        status: "success",
        data: newPayrolls,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status: "failed",
        message: error.message || "Something went wrong",
      }
    } finally {
      client.release();
    }
  }

  // ADDED: db param
  async update(id, payrollData, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const { tenant_id, ...updateData } = payrollData;
      const tenantIdToUpdate = user.role === "super_admin" ? null : user.tenant_id;

      const updatedPayroll = await this.repository.update(
        client,
        id,
        tenantIdToUpdate,
        updateData
      );

      if (!updatedPayroll) {
        throw new Error("Payroll record not found or not authorized to update");
      }

      await this.transactionService.updateByReference(
        {
          tenant_id: updatedPayroll.tenant_id,
          transaction_type: "expense",
          reference_id: updatedPayroll.id,
          account_id: updatedPayroll.account_id,
          amount: parseFloat(updatedPayroll.salary),
          description: `Payroll Payment - ${new Date(updatedPayroll.pay_date).toISOString().split('T')[0]}`,
          cost_center_id: updatedPayroll.cost_center_id,
        },
        client
      );

      await client.query("COMMIT");
      return{
        status: "success",
        data: updatedPayroll,
      }
      // return this.repository.getById(db, id, tenantIdToUpdate);
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status: "failed",
        message: error.message || "Something went wrong",
      }
    } finally {
      client.release();
    }
  }

  // ADDED: db param
  async delete(id, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const tenantIdToDelete = user.role === "super_admin" ? null : user.tenant_id;

      const recordToDelete = await this.repository.getById(client, id, tenantIdToDelete);
      if(!recordToDelete) {
         throw new Error("Payroll record not found or not authorized to delete");
      }

      // 1. Delete Transaction (Pass client)
      await this.transactionService.deleteByReference(
        recordToDelete.tenant_id,
        "expense",
        id,
        client
      );

      // 2. Delete Payroll (Pass client)
      const deletedPayroll = await this.repository.delete(client, id, tenantIdToDelete);

      await client.query("COMMIT");
      return {
        status: "success",
        data: deletedPayroll};
    } catch (error) {
      await client.query("ROLLBACK");
      
      return{
        status: "failed",
        message: error.message || "Something went wrong",
      }
    } finally {
      client.release();
    }
  }
}

module.exports = PayrollService;