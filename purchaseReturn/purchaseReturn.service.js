// --- START OF FILE purchaseReturn.service.js ---

class PurchaseReturnService {
  constructor(
    purchaseReturnRepository,
    purchaseRepository,
    itemRepository,
    voucherService,
  ) {
    this.repository = purchaseReturnRepository;
    this.purchaseRepository = purchaseRepository;
    this.itemRepository = itemRepository;
    this.voucherService = voucherService;
  }

  async create(user, body, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const { payment_methods = [], unit_price = 0, ...returnDetails } = body;

      const originalPurchase = await this.purchaseRepository.getById(
        client,
        returnDetails.purchase_id,
        user.tenant_id,
      );
      if (!originalPurchase) throw new Error("Original purchase not found.");
      if (!originalPurchase.party_ledger_id)
        throw new Error(
          `Supplier '${originalPurchase.party_name}' has no linked Ledger.`,
        );

      const itemDetails = await this.itemRepository.getById(
        client,
        returnDetails.item_id,
        user.tenant_id,
      );
      if (!itemDetails) {
        throw new Error(`Item with ID ${returnDetails.item_id} not found.`);
      }

      const taxRate = parseFloat(itemDetails.tax) || 0;
      const baseAmount =
        parseFloat(returnDetails.return_quantity) * parseFloat(unit_price);
      const taxAmount = baseAmount * (taxRate / 100);
      const totalValueToRefund = baseAmount + taxAmount;

      const returnData = {
        ...returnDetails,
        tenant_id: user.tenant_id,
        total_refund_amount: totalValueToRefund,
      };

      await this.purchaseRepository.decreaseItemQuantity(
        client,
        returnData.purchase_id,
        returnData.item_id,
        returnData.return_quantity,
      );

      const newPurchaseReturn = await this.repository.create(
        client,
        returnData,
      );

      await this.itemRepository.updateStock(
        client,
        newPurchaseReturn.item_id,
        -newPurchaseReturn.return_quantity,
      );

      await client.query("COMMIT");

      if (payment_methods.length > 0) {
        await this._createVouchersForRefunds(
          user,
          newPurchaseReturn,
          originalPurchase.party_ledger_id,
          payment_methods,
          db,
        );
      }

      const result = await this.getById(
        newPurchaseReturn.id,
        user.tenant_id,
        db,
      );
      return {
        status: "success",
        data: result,
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

  async _createVouchersForRefunds(
    user,
    purchaseReturn,
    partyLedgerId,
    payment_methods,
    db,
  ) {
    for (const payment of payment_methods) {
      const amount = parseFloat(payment.amount);
      if (amount <= 0) continue;

      const voucherData = {
        amount: amount,
        date: purchaseReturn.date || new Date(),
        description: `Refund received for Purchase Return Invoice #${purchaseReturn.invoice_number}`,
        voucher_no: `PR-REF-${
          purchaseReturn.invoice_number
        }-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        voucher_type: 1,
        from_ledger: { ledger_id: partyLedgerId },
        to_ledger: { ledger_id: payment.account_id },
        cost_center_id: purchaseReturn.cost_center_id,
        done_by_id: purchaseReturn.done_by_id,
        mode_of_payment_id: payment.mode_of_payment_id,
        transactions: [
          {
            invoice_id: purchaseReturn.id,
            invoice_type: "PURCHASERETURN",
            received_amount: amount,
          },
        ],
      };

      await this.voucherService.create(user, voucherData, db);
    }
  }

  async update(id, user, body, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const { payment_methods = [], unit_price = 0, ...returnData } = body;

      const existingReturn = await this.repository.getById(
        client,
        id,
        user.tenant_id,
      );
      if (!existingReturn) throw new Error("Purchase return not found");

      const itemDetails = await this.itemRepository.getById(
        client,
        existingReturn.item_id,
        user.tenant_id,
      );
      if (!itemDetails) {
        throw new Error(`Item with ID ${existingReturn.item_id} not found.`);
      }

      const taxRate = parseFloat(itemDetails.tax) || 0;
      const baseAmount =
        parseFloat(returnData.return_quantity) * parseFloat(unit_price);
      const taxAmount = baseAmount * (taxRate / 100);
      const totalValueToRefund = baseAmount + taxAmount;

      const quantityDifference =
        existingReturn.return_quantity - returnData.return_quantity;
      if (quantityDifference !== 0) {
        await this.itemRepository.updateStock(
          client,
          existingReturn.item_id,
          quantityDifference,
        );
        await this.purchaseRepository.increaseItemQuantity(
          client,
          existingReturn.purchase_id,
          existingReturn.item_id,
          quantityDifference,
        );
      }

      const updatedPurchaseReturn = await this.repository.update(
        client,
        id,
        user.tenant_id,
        { ...returnData, total_refund_amount: totalValueToRefund },
      );

      await client.query("COMMIT");

      if (payment_methods.length > 0) {
        await this._createVouchersForRefunds(
          user,
          updatedPurchaseReturn,
          existingReturn.party_ledger_id,
          payment_methods,
          db,
        );
      }

      const result = await this.getById(updatedPurchaseReturn.id, user.tenant_id, db);
      return {
        status: "success",
        data: result,
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

  async delete(id, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const returnToDelete = await this.repository.getById(
        client,
        id,
        user.tenant_id,
      );
      if (!returnToDelete) throw new Error("Purchase return not found.");

      await this.itemRepository.updateStock(
        client,
        returnToDelete.item_id,
        returnToDelete.return_quantity,
      );
      await this.purchaseRepository.increaseItemQuantity(
        client,
        returnToDelete.purchase_id,
        returnToDelete.item_id,
        returnToDelete.return_quantity,
      );

      const result = await this.repository.delete(client, id, user.tenant_id);
      await client.query("COMMIT");
      return {
        status: "success",
        data: result,
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

  async getById(id, tenantId, db) {
    return this.repository.getById(db, id, tenantId);
  }

  async getAll(tenantId, filters, db) {
    return await this.repository.getAllByUserId(db, tenantId, filters);
  }

  async getPaginatedByUserId(tenantId, filters, db) {
    const {
      purchaseReturns,
      totalCount,
      total_refund_amount,
      total_refunded_amount,
    } = await this.repository.getPaginatedUserId(db, tenantId, filters);

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return {
      data: purchaseReturns,
      count: totalCount,
      page_count,
      total_refund_amount,
      total_refunded_amount,
    };
  }

  async updatePaymentAndStatus(client, purchaseReturnId, amountChange) {
    return this.repository.updatePaymentAndStatus(
      client,
      purchaseReturnId,
      amountChange,
    );
  }
}

module.exports = PurchaseReturnService;
