class PayrollService {
  constructor(
    payrollRepository,
    tenantRepository,
    ledgerService,
    voucherRepository,
    voucherTransactionsService
  ) {
    this.repository = payrollRepository;
    this.tenantRepository = tenantRepository;
    this.ledgerService = ledgerService;
    this.voucherRepository = voucherRepository;
    this.voucherTransactionsService = voucherTransactionsService;
  }

  async getAll(user, filters, db) {
    let tenantId;
    if (user.role === "super_admin") {
      tenantId = filters.tenant_id || null;
    } else {
      tenantId = user.tenant_id;
    }
    return await this.repository.getAllByUser(db, tenantId, filters);
  }

  async getAllPaginated(user, filters, db) {
    let tenantId;
    if (user.role === "super_admin") {
      if (!filters.tenant_id) {
        throw new Error("Super admin must specify a 'tenant_id' in query parameters.");
      }
      tenantId = filters.tenant_id;
    } else {
      tenantId = user.tenant_id;
    }

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const { payrollRecords, totalCount } = await this.repository.getPaginatedByTenantId(db, tenantId, filters);
    
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return { data: payrollRecords, count: totalCount, page_count };
  }

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

      // 1. Create Payroll Record
      const newPayroll = await this.repository.create(client, dataToSave);

      // 2. VOUCHER METHOD: Create a Voucher and Voucher Transaction (if ledger_id exists)
      if (parseFloat(newPayroll.salary) > 0 && newPayroll.ledger_id) {
        const voucherPayload = {
          tenant_id: tenantIdForNewEntry,
          amount: newPayroll.salary,
          date: newPayroll.pay_date,
          description: `Payroll Payment - ${newPayroll.pay_date}`,
          voucher_no: `VOU-PAY-${Date.now()}-${newPayroll.id}`,
          voucher_type: 0, // 0 for Paid
          from_ledger: { ledger_id: newPayroll.ledger_id },
          to_ledger: { ledger_id: null },
          cost_center_id: newPayroll.cost_center_id,
          done_by_id: newPayroll.done_by_id,
          mode_of_payment_id: null,
        };

        const newVoucher = await this.voucherRepository.create(client, voucherPayload);

        // Create the record in voucher_transactions table
        await this.voucherTransactionsService.createMany(client, newVoucher.id, [
          {
            invoice_id: newPayroll.id.toString(),
            invoice_type: "PAYROLL",
            received_amount: newPayroll.salary,
          },
        ]);

        // Adjust the Ledger balance
        await this.ledgerService.adjustBalance(
          client,
          newPayroll.ledger_id,
          tenantIdForNewEntry,
          -parseFloat(newPayroll.salary)
        );
      }

      await client.query("COMMIT");
      return newPayroll;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

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

      // 1. Bulk Insert Payrolls
      const newPayrolls = await this.repository.createBulk(client, payrollsPrepared, tenantId);

      // 2. Loop to create Vouchers for each
      for (const p of newPayrolls) {
        if (parseFloat(p.salary) > 0 && p.ledger_id) {
          const voucherPayload = {
            tenant_id: tenantId,
            amount: p.salary,
            date: p.pay_date,
            description: `Bulk Payroll Payment`,
            voucher_no: `VOU-PAY-B-${Date.now()}-${p.id}`,
            voucher_type: 0,
            from_ledger: { ledger_id: p.ledger_id },
            to_ledger: { ledger_id: null },
            cost_center_id: p.cost_center_id,
            done_by_id: p.done_by_id,
            mode_of_payment_id: null,
          };

          const newVoucher = await this.voucherRepository.create(client, voucherPayload);

          await this.voucherTransactionsService.createMany(client, newVoucher.id, [
            {
              invoice_id: p.id.toString(),
              invoice_type: "PAYROLL",
              received_amount: p.salary,
            },
          ]);

          await this.ledgerService.adjustBalance(
            client,
            p.ledger_id,
            tenantId,
            -parseFloat(p.salary)
          );
        }
      }

      await client.query("COMMIT");
      return newPayrolls;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getById(id, user, db) {
    let tenantId;
    if (user.role !== "super_admin") {
      tenantId = user.tenant_id;
    }
    return await this.repository.getById(db, id, tenantId);
  }

  async update(id, payrollData, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      
      let tenantId;
      if (user.role !== "super_admin") {
        tenantId = user.tenant_id;
      }

      const oldPayroll = await this.repository.getById(client, id, tenantId);
      if (!oldPayroll) throw new Error("Payroll record not found or not authorized");

      // 1. Reverse old ledger adjustment
      if (parseFloat(oldPayroll.salary) > 0 && oldPayroll.ledger_id) {
        await this.ledgerService.adjustBalance(
          client,
          oldPayroll.ledger_id,
          oldPayroll.tenant_id,
          parseFloat(oldPayroll.salary)
        );
      }

      const updatedPayroll = await this.repository.update(client, id, tenantId, payrollData);

      // 2. Apply new ledger adjustment
      if (parseFloat(updatedPayroll.salary) > 0 && updatedPayroll.ledger_id) {
        const voucherPayload = {
          tenant_id: updatedPayroll.tenant_id,
          amount: updatedPayroll.salary,
          date: updatedPayroll.pay_date,
          description: `Updated Payroll Payment - ${updatedPayroll.pay_date}`,
          voucher_no: `VOU-PAY-UP-${Date.now()}-${updatedPayroll.id}`,
          voucher_type: 0,
          from_ledger: { ledger_id: updatedPayroll.ledger_id },
          to_ledger: { ledger_id: null },
          cost_center_id: updatedPayroll.cost_center_id,
          done_by_id: updatedPayroll.done_by_id,
          mode_of_payment_id: null,
        };

        const newVoucher = await this.voucherRepository.create(client, voucherPayload);

        await this.voucherTransactionsService.createMany(client, newVoucher.id, [
          {
            invoice_id: updatedPayroll.id.toString(),
            invoice_type: "PAYROLL",
            received_amount: updatedPayroll.salary,
          },
        ]);

        await this.ledgerService.adjustBalance(
          client,
          updatedPayroll.ledger_id,
          updatedPayroll.tenant_id,
          -parseFloat(updatedPayroll.salary)
        );
      }

      await client.query("COMMIT");
      return updatedPayroll;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      
      let tenantId;
      if (user.role !== "super_admin") {
        tenantId = user.tenant_id;
      }

      const payroll = await this.repository.getById(client, id, tenantId);
      if (!payroll) throw new Error("Payroll record not found or not authorized");

      // Reverse ledger adjustment
      if (parseFloat(payroll.salary) > 0 && payroll.ledger_id) {
        await this.ledgerService.adjustBalance(
          client,
          payroll.ledger_id,
          payroll.tenant_id,
          parseFloat(payroll.salary)
        );
      }

      const result = await this.repository.delete(client, id, tenantId);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PayrollService;