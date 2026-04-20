class ExpenseService {
  constructor(
    expenseRepository,
    ledgerService,
    voucherRepository,
    voucherTransactionsService,
  ) {
    this.expenseRepository = expenseRepository;
    this.ledgerService = ledgerService;
    this.voucherRepository = voucherRepository;
    this.voucherTransactionsService = voucherTransactionsService;
  }

  async getAll(tenantId, filters, db) {
    return await this.expenseRepository.getAllByTenantId(db, tenantId, filters);
  }

  async create(expenseData, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const newExpense = await this.expenseRepository.create(
        client,
        expenseData,
      );

      // VOUCHER METHOD: If money is paid, create a Voucher and Voucher Transaction
      if (parseFloat(newExpense.amount_paid) > 0 && newExpense.ledger_id) {
        const voucherPayload = {
          tenant_id: user.tenant_id,
          amount: newExpense.amount_paid,
          date: newExpense.date,
          description: `Payment for Expense: ${newExpense.description}`,
          voucher_no: `VOU-EXP-${Date.now()}-${newExpense.id}`, // Ensured uniqueness
          voucher_type: 0, // 0 for Paid
          from_ledger: { ledger_id: newExpense.ledger_id },
          to_ledger: { ledger_id: null },
          cost_center_id: newExpense.cost_center_id,
          done_by_id: newExpense.done_by_id,
          mode_of_payment_id: null,
          expense_type_id: newExpense.expense_type_id, // FIX: Explicitly passing the ID
        };

        const newVoucher = await this.voucherRepository.create(
          client,
          voucherPayload,
        );

        // Create the record in voucher_transactions table
        await this.voucherTransactionsService.createMany(
          client,
          newVoucher.id,
          [
            {
              invoice_id: newExpense.id.toString(),
              invoice_type: "EXPENSE",
              received_amount: newExpense.amount_paid,
            },
          ],
        );

        // Adjust the Ledger balance
        await this.ledgerService.adjustBalance(
          client,
          newExpense.ledger_id,
          user.tenant_id,
          -parseFloat(newExpense.amount_paid),
        );
      }

      await client.query("COMMIT");
      const data = this.getById(newExpense.id, newExpense.tenant_id, db);
      return {
        status: "success",
        data:newExpense,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status: "failed",
        message: error.message,
      };
      // throw error;
    } finally {
      client.release();
    }
  }

  async updatePaymentAndStatus(client, id, amount) {
    return await this.expenseRepository.updatePaymentAndStatus(
      client,
      id,
      amount,
    );
  }

  async getPaginatedByTenantId(tenantId, filters, db) {
    const { expenses, totalCount, total_amount, total_amount_paid } =
      await this.expenseRepository.getPaginatedByTenantId(
        db,
        tenantId,
        filters,
      );
    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    return {
      data: expenses,
      count: totalCount,
      page_count: totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0,
      total_amount: parseFloat(total_amount || 0),
      total_amount_paid: parseFloat(total_amount_paid || 0),
    };
  }

  async getById(id, tenantId, db) {
    const expense = await this.expenseRepository.getById(db, id, tenantId);
    if (!expense) throw new Error("Expense not found or not authorized");
    return expense;
  }

  async update(id, tenantId, expenseData, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const oldExpense = await this.expenseRepository.getById(
        client,
        id,
        tenantId,
      );

      // Reverse old payment logic
      if (parseFloat(oldExpense.amount_paid) > 0 && oldExpense.ledger_id) {
        await this.ledgerService.adjustBalance(
          client,
          oldExpense.ledger_id,
          tenantId,
          parseFloat(oldExpense.amount_paid),
        );
      }

      const updatedExpense = await this.expenseRepository.update(
        client,
        id,
        tenantId,
        expenseData,
      );

      // Apply new payment logic and create Voucher
      if (
        parseFloat(updatedExpense.amount_paid) > 0 &&
        updatedExpense.ledger_id
      ) {
        const voucherPayload = {
          tenant_id: tenantId,
          amount: updatedExpense.amount_paid,
          date: updatedExpense.date,
          description: `Updated Payment for Expense: ${updatedExpense.description}`,
          voucher_no: `VOU-EXP-UP-${updatedExpense.id}-${Date.now()}`,
          voucher_type: 0,
          from_ledger: { ledger_id: updatedExpense.ledger_id },
          to_ledger: { ledger_id: null },
          cost_center_id: updatedExpense.cost_center_id,
          done_by_id: updatedExpense.done_by_id,
          mode_of_payment_id: null,
          expense_type_id: updatedExpense.expense_type_id, // FIX: Explicitly passing the ID
        };

        const newVoucher = await this.voucherRepository.create(
          client,
          voucherPayload,
        );

        await this.voucherTransactionsService.createMany(
          client,
          newVoucher.id,
          [
            {
              invoice_id: updatedExpense.id.toString(),
              invoice_type: "EXPENSE",
              received_amount: updatedExpense.amount_paid,
            },
          ],
        );

        await this.ledgerService.adjustBalance(
          client,
          updatedExpense.ledger_id,
          tenantId,
          -parseFloat(updatedExpense.amount_paid),
        );
      }

      await client.query("COMMIT");
      const data = await this.getById(id, tenantId, db);
      return {
        status: "success",
        data,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id, tenantId, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const expense = await this.expenseRepository.getById(
        client,
        id,
        tenantId,
      );

      if (parseFloat(expense.amount_paid) > 0 && expense.ledger_id) {
        await this.ledgerService.adjustBalance(
          client,
          expense.ledger_id,
          tenantId,
          parseFloat(expense.amount_paid),
        );
      }

      const result = await this.expenseRepository.delete(client, id, tenantId);
      await client.query("COMMIT");
      return {status: "success",
        data:result};
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = ExpenseService;
