class VoucherService {
  constructor(
    voucherRepository,
    voucherTransactionsService,
    salesService,
    purchaseService,
    saleReturnService,
    purchaseReturnService,
    ledgerService,
    expenseService
  ) {
    this.repository = voucherRepository;
    this.voucherTransactionsService = voucherTransactionsService;
    this.salesService = salesService;
    this.purchaseService = purchaseService;
    this.saleReturnService = saleReturnService;
    this.purchaseReturnService = purchaseReturnService;
    this.ledgerService = ledgerService;
    this.expenseService = expenseService;
  }

  async _updateLedgerBalances(
    client,
    fromLedgerId,
    toLedgerId,
    tenantId,
    amount,
    operation = "add"
  ) {
    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount)) return;
    const fromAdjustment = operation === "add" ? -totalAmount : totalAmount;
    const toAdjustment = operation === "add" ? totalAmount : -totalAmount;

    if (fromLedgerId)
      await this.ledgerService.adjustBalance(
        client,
        fromLedgerId,
        tenantId,
        fromAdjustment
      );
    if (toLedgerId)
      await this.ledgerService.adjustBalance(
        client,
        toLedgerId,
        tenantId,
        toAdjustment
      );
  }

  async _updateInvoicePayments(client, transactions, operation = "add") {
    if (!transactions || transactions.length === 0) return;

    for (const transaction of transactions) {
      const amount =
        operation === "add"
          ? parseFloat(transaction.received_amount)
          : -parseFloat(transaction.received_amount);
      if (isNaN(amount)) continue;

      switch (transaction.invoice_type) {
        case "SALE":
          await this.salesService.updatePaymentAndStatus(
            client,
            transaction.invoice_id,
            amount
          );
          break;
        case "PURCHASE":
          await this.purchaseService.updatePaymentAndStatus(
            client,
            transaction.invoice_id,
            amount
          );
          break;
        case "SALERETURN":
          await this.saleReturnService.updatePaymentAndStatus(
            client,
            transaction.invoice_id,
            amount
          );
          break;
        case "PURCHASERETURN":
          await this.purchaseReturnService.updatePaymentAndStatus(
            client,
            transaction.invoice_id,
            amount
          );
          break;
        case "EXPENSE":
          await this.expenseService.updatePaymentAndStatus(
            client,
            transaction.invoice_id,
            amount
          );
          break;
        default:
          console.warn(`Unknown type: ${transaction.invoice_type}`);
      }
    }
  }

  async create(user, voucherData, db) {
    const { transactions, ...voucherDetails } = voucherData;
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const newVoucher = await this.repository.create(client, {
        ...voucherDetails,
        tenant_id: user.tenant_id,
      });
      await this.voucherTransactionsService.createMany(
        client,
        newVoucher.id,
        transactions
      );
      await this._updateInvoicePayments(client, transactions, "add");
      await this._updateLedgerBalances(
        client,
        voucherData.from_ledger.ledger_id,
        voucherData.to_ledger.ledger_id,
        user.tenant_id,
        voucherData.amount,
        "add"
      );
      await client.query("COMMIT");
      // return this.repository.getById(db, newVoucher.id, user.tenant_id);
      return {
        status: "success",
        data: newVoucher,
      };
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

  async update(id, user, voucherData, db) {
    const existing = await this.repository.getById(db, id, user.tenant_id);
    if (!existing) throw new Error("Voucher not found");
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await this._updateInvoicePayments(
        client,
        existing.transactions,
        "subtract"
      );
      await this._updateLedgerBalances(
        client,
        existing.from_ledger_id,
        existing.to_ledger_id,
        user.tenant_id,
        existing.amount,
        "subtract"
      );
      const data = await this.repository.update(client, id, user.tenant_id, voucherData);
      await this.voucherTransactionsService.deleteByVoucherId(client, id);
      await this.voucherTransactionsService.createMany(
        client,
        id,
        voucherData.transactions
      );
      await this._updateInvoicePayments(
        client,
        voucherData.transactions,
        "add"
      );
      await this._updateLedgerBalances(
        client,
        voucherData.from_ledger.ledger_id,
        voucherData.to_ledger.ledger_id,
        user.tenant_id,
        voucherData.amount,
        "add"
      );
      await client.query("COMMIT");
      return {
        status: "success",
        data: data,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status: "failed",
        message: error.message || "Something went wrong"
      }
    } finally {
      client.release();
    }
  }

  async delete(id, user, db) {
    const existing = await this.repository.getById(db, id, user.tenant_id);
    if (!existing) throw new Error("Voucher not found");
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await this._updateInvoicePayments(
        client,
        existing.transactions,
        "subtract"
      );
      await this._updateLedgerBalances(
        client,
        existing.from_ledger_id,
        existing.to_ledger_id,
        user.tenant_id,
        existing.amount,
        "subtract"
      );
      const deleted = await this.repository.delete(client, id, user.tenant_id);
      await client.query("COMMIT");
      return {
        status: "success",
        data: deleted,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status :"failed",
        message: error.message || "Something went wrong"
      }
    } finally {
      client.release();
    }
  }

  async getById(id, tenantId, db) {
    return await this.repository.getById(db, id, tenantId);
  }
  async getAll(tenantId, filters, db) {
    return this.repository.getAll(db, tenantId, filters);
  }
  async getPaginated(tenantId, filters, db) {
    const { vouchers, totalCount, total_amount } =
      await this.repository.getPaginated(db, tenantId, filters);
    return {
      data: vouchers,
      count: totalCount,
      page_count: Math.ceil(totalCount / (filters.page_size || 10)),
      total_amount: parseFloat(total_amount || 0),
    };
  }
}

module.exports = VoucherService;
