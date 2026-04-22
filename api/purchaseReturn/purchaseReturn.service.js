class PurchaseReturnService {
  constructor(
    purchaseReturnRepository,
    purchaseRepository,
    lensesRepository,
    lensAddonsRepository,
    frameVariantRepository,
    voucherService,
  ) {
    this.repository = purchaseReturnRepository;
    this.purchaseRepository = purchaseRepository;
    this.lensesRepository = lensesRepository;
    this.lensAddonsRepository = lensAddonsRepository;
    this.frameVariantRepository = frameVariantRepository;
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

      let itemDetails = null;
      if (returnDetails.frame_variant_id) {
          itemDetails = await this.frameVariantRepository.getById(client, returnDetails.frame_variant_id, user.tenant_id);
      } else if (returnDetails.lens_id) {
          itemDetails = await this.lensesRepository.getById(client, returnDetails.lens_id, user.tenant_id);
      } else if (returnDetails.lens_addon_id) {
          itemDetails = await this.lensAddonsRepository.getById(client, returnDetails.lens_addon_id, user.tenant_id);
      }

      if (!itemDetails) {
        throw new Error(`Item not found.`);
      }

      const taxRate = parseFloat(itemDetails.tax || 0);
      const baseAmount =
        parseFloat(returnDetails.return_quantity) * parseFloat(unit_price);
      const taxAmount = baseAmount * (taxRate / 100);
      const totalValueToRefund = baseAmount + taxAmount;

      const returnData = {
        ...returnDetails,
        tenant_id: user.tenant_id,
        total_refund_amount: totalValueToRefund,
      };

      const itemId = returnDetails.frame_variant_id || returnDetails.lens_id || returnDetails.lens_addon_id;

      await this.purchaseRepository.decreaseItemQuantity(
        client,
        returnData.purchase_id,
        itemId,
        returnData.return_quantity,
      );

      const newPurchaseReturn = await this.repository.create(
        client,
        returnData,
      );

      if (newPurchaseReturn.frame_variant_id) {
        await this.frameVariantRepository.updateStock(client, newPurchaseReturn.frame_variant_id, -newPurchaseReturn.return_quantity);
      } else if (newPurchaseReturn.lens_id) {
        await this.lensesRepository.updateStock(client, newPurchaseReturn.lens_id, -newPurchaseReturn.return_quantity);
      } else if (newPurchaseReturn.lens_addon_id) {
        await this.lensAddonsRepository.updateStock(client, newPurchaseReturn.lens_addon_id, -newPurchaseReturn.return_quantity);
      }

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

      let itemDetails = null;
      const itemId = existingReturn.frame_variant_id || existingReturn.lens_id || existingReturn.lens_addon_id;
      
      if (existingReturn.frame_variant_id) {
          itemDetails = await this.frameVariantRepository.getById(client, existingReturn.frame_variant_id, user.tenant_id);
      } else if (existingReturn.lens_id) {
          itemDetails = await this.lensesRepository.getById(client, existingReturn.lens_id, user.tenant_id);
      } else if (existingReturn.lens_addon_id) {
          itemDetails = await this.lensAddonsRepository.getById(client, existingReturn.lens_addon_id, user.tenant_id);
      }

      if (!itemDetails) {
        throw new Error(`Item not found.`);
      }

      const taxRate = parseFloat(itemDetails.tax || 0);
      const baseAmount =
        parseFloat(returnData.return_quantity) * parseFloat(unit_price);
      const taxAmount = baseAmount * (taxRate / 100);
      const totalValueToRefund = baseAmount + taxAmount;

      const quantityDifference =
        existingReturn.return_quantity - returnData.return_quantity;
      if (quantityDifference !== 0) {
          if (existingReturn.frame_variant_id) {
              await this.frameVariantRepository.updateStock(client, existingReturn.frame_variant_id, quantityDifference);
          } else if (existingReturn.lens_id) {
              await this.lensesRepository.updateStock(client, existingReturn.lens_id, quantityDifference);
          } else if (existingReturn.lens_addon_id) {
              await this.lensAddonsRepository.updateStock(client, existingReturn.lens_addon_id, quantityDifference);
          }
        await this.purchaseRepository.increaseItemQuantity(
          client,
          existingReturn.purchase_id,
          itemId,
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

      const itemId = returnToDelete.frame_variant_id || returnToDelete.lens_id || returnToDelete.lens_addon_id;

      if (returnToDelete.frame_variant_id) {
          await this.frameVariantRepository.updateStock(client, returnToDelete.frame_variant_id, returnToDelete.return_quantity);
      } else if (returnToDelete.lens_id) {
          await this.lensesRepository.updateStock(client, returnToDelete.lens_id, returnToDelete.return_quantity);
      } else if (returnToDelete.lens_addon_id) {
          await this.lensAddonsRepository.updateStock(client, returnToDelete.lens_addon_id, returnToDelete.return_quantity);
      }
      await this.purchaseRepository.increaseItemQuantity(
        client,
        returnToDelete.purchase_id,
        itemId,
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
