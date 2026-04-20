const ItemRepository = require("../item/item.repository");

class PurchaseService {
  constructor(repository, itemRepository, voucherService) {
    this.repository = repository;
    this.itemRepository = itemRepository || new ItemRepository();
    this.voucherService = voucherService;
  }

  async getAll(tenantId, filters, db) {
    return await this.repository.getByUserId(db, tenantId, filters);
  }

  async create(user, purchaseData, db) {
    const tenantId = user.tenant_id;
    const {
      items,
      discount = 0,
      payment_methods = [],
      note = null,
      ...purchaseDetails
    } = purchaseData;

    // 1. Process items and calculate totals
    const itemsWithDetails = await this._processPurchaseItems(
      items,
      tenantId,
      db,
    );
    const itemsSubtotal = itemsWithDetails.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );
    const grandTotal = itemsSubtotal - parseFloat(discount);

    // 2. Filter valid payments
    const validPayments = payment_methods
      .map((p) => ({
        account_id: p.account_id,
        amount: parseFloat(p.amount) || 0,
        mode_of_payment_id: p.mode_of_payment_id,
      }))
      .filter((p) => p.amount > 0 && p.account_id);

    const purchasePayload = {
      ...purchaseDetails,
      tenant_id: tenantId,
      discount: parseFloat(discount),
      total_amount: grandTotal,
      date: purchaseDetails.date || new Date(),
      note,
    };

    // 3. Create Purchase (Initial paid_amount is 0, updated via vouchers)
    const newPurchase = await this.repository.create(
      db,
      purchasePayload,
      itemsWithDetails,
    );

    // 4. Update Stock (Increase for Purchase)
    for (const item of itemsWithDetails) {
      await this.itemRepository.updateStock(db, item.item_id, item.quantity);
    }

    // 5. Create Vouchers for Payments
    if (newPurchase && validPayments.length > 0) {
      await this._processVouchersForPayments(
        newPurchase,
        user,
        validPayments,
        db,
      );
    }

    const result = await this.getById(newPurchase.id, tenantId, db);
    return {
      status: "success",
      data: result,
    };
  }

  async update(id, user, purchaseData, db) {
    const tenantId = user.tenant_id;

    // 1. Fetch Original Purchase (to check existing vouchers and stock)
    const originalPurchase = await this.repository.getById(db, id, tenantId);
    if (!originalPurchase) {
      throw new Error("Purchase not found or not authorized to update");
    }

    const {
      items: updatedItems,
      discount = 0,
      payment_methods = [],
      note = null,
      ...purchaseDetails
    } = purchaseData;

    const itemsWithDetails = await this._processPurchaseItems(
      updatedItems,
      tenantId,
      db,
    );
    const itemsSubtotal = itemsWithDetails.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );
    const grandTotal = itemsSubtotal - parseFloat(discount);

    // 2. Handle Payment Methods (Sync Vouchers)
    const validIncomingPayments = payment_methods
      .map((p) => ({
        account_id: p.account_id,
        amount: parseFloat(p.amount) || 0,
        mode_of_payment_id: p.mode_of_payment_id,
        voucher_id: p.voucher_id, // Important: ID passed from frontend to identify existing vouchers
      }))
      .filter((p) => p.amount > 0 && p.account_id);

    // Collect IDs of incoming vouchers to identify which ones to keep
    const incomingVoucherIds = new Set(
      validIncomingPayments
        .map((p) => p.voucher_id)
        .filter((vid) => vid != null),
    );

    // Get existing vouchers from the DB record
    const existingVouchers = originalPurchase.payment_methods || [];

    // Delete existing vouchers that are NOT in the incoming payload (user removed them)
    for (const existingVoucher of existingVouchers) {
      if (
        existingVoucher.voucher_id &&
        !incomingVoucherIds.has(existingVoucher.voucher_id)
      ) {
        await this.voucherService.delete(existingVoucher.voucher_id, user, db);
      }
    }

    // 3. Calculate Stock Differences
    const originalItemQuantities = new Map(
      (originalPurchase.items || []).map((item) => [
        item.item_id,
        item.quantity,
      ]),
    );
    const updatedItemQuantities = new Map(
      (itemsWithDetails || []).map((item) => [item.item_id, item.quantity]),
    );

    const stockAdjustments = new Map();
    const allItemIds = new Set([
      ...originalItemQuantities.keys(),
      ...updatedItemQuantities.keys(),
    ]);

    for (const itemId of allItemIds) {
      const originalQty = originalItemQuantities.get(itemId) || 0;
      const updatedQty = updatedItemQuantities.get(itemId) || 0;
      const difference = updatedQty - originalQty; // In Purchase, if updatedQty > originalQty, we add more to stock

      if (difference !== 0) {
        stockAdjustments.set(itemId, difference);
      }
    }

    const purchasePayload = {
      ...purchaseDetails,
      discount: parseFloat(discount),
      total_amount: grandTotal,
      note,
    };

    // 4. Update Purchase Details
    const updatedPurchase = await this.repository.update(
      db,
      id,
      tenantId,
      purchasePayload,
      itemsWithDetails,
    );

    if (!updatedPurchase) {
      throw new Error("Failed to update the purchase.");
    }

    // 5. Adjust Stock based on differences
    for (const [itemId, quantityChange] of stockAdjustments.entries()) {
      await this.itemRepository.updateStock(db, itemId, quantityChange);
    }

    // 6. Process Vouchers (Update existing or Create new)
    if (updatedPurchase && validIncomingPayments.length > 0) {
      await this._processVouchersForPayments(
        updatedPurchase,
        user,
        validIncomingPayments,
        db,
      );
    }

    const result = await this.getById(id, tenantId, db);
    return {
      status: "success",
      data: result,
    };
  }

  async _processVouchersForPayments(purchase, user, payment_methods, db) {
    if (!purchase.party_ledger_id) {
      throw new Error(
        `The supplier '${purchase.party_name}' does not have a linked Ledger account.`,
      );
    }

    for (const payment of payment_methods) {
      const amount = parseFloat(payment.amount);
      if (amount <= 0) continue;

      const voucherData = {
        tenant_id: user.tenant_id,
        amount: amount,
        date: purchase.date,
        description: `Payment for Purchase Invoice #${purchase.invoice_number}`,
        // Use existing voucher_no or generate a new one
        voucher_no:
          payment.voucher_no ||
          `VP-${purchase.invoice_number}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,

        voucher_type: 0, // 0 = Paid (Money Out)

        // For Purchase: Money goes FROM internal account TO supplier ledger
        from_ledger: { ledger_id: payment.account_id },
        to_ledger: { ledger_id: purchase.party_ledger_id },

        cost_center_id: purchase.cost_center_id,
        done_by_id: purchase.done_by_id,
        mode_of_payment_id: payment.mode_of_payment_id,

        transactions: [
          {
            invoice_id: purchase.id,
            invoice_type: "PURCHASE",
            received_amount: amount,
          },
        ],
      };

      if (payment.voucher_id) {
        await this.voucherService.update(
          payment.voucher_id,
          user,
          voucherData,
          db,
        );
      } else {
        await this.voucherService.create(user, voucherData, db);
      }
    }
  }

  async updatePaymentAndStatus(client, purchaseId, amountChange) {
    return this.repository.updatePaymentAndStatus(
      client,
      purchaseId,
      amountChange,
    );
  }

  async delete(id, user, db) {
    const tenantId = user.tenant_id;
    const purchaseToDelete = await this.repository.getById(db, id, tenantId);
    if (!purchaseToDelete)
      throw new Error("Purchase not found or not authorized");

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // First delete associated vouchers (logic handled by DB triggers or manually)
      // If your system doesn't automatically delete vouchers via DB triggers:
      if (purchaseToDelete.payment_methods) {
  for (const pm of purchaseToDelete.payment_methods) {
    if (pm.voucher_id) {
      // Pass the active 'client' here!
      await this.voucherService.delete(pm.voucher_id, user, db, client);
    }
  }}

      const deletedPurchase = await this.repository.delete(
        client,
        id,
        tenantId,
      );
      if (!deletedPurchase)
        throw new Error("Failed to delete purchase record.");

      // Revert Stock (Decrease for Purchase)
      if (Array.isArray(purchaseToDelete.items)) {
        for (const item of purchaseToDelete.items) {
          await this.itemRepository.updateStock(
            client,
            item.item_id,
            -item.quantity,
          );
        }
      }

      await client.query("COMMIT");
      return { status: "success", data: deletedPurchase };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getPaginatedByUserId(tenantId, filters, db) {
    const { purchases, totalCount, total_amount, paid_amount } =
      await this.repository.getPaginatedByUserId(db, tenantId, filters);

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
    const totalAmount = parseFloat(total_amount || 0);
    const paidAmount = parseFloat(paid_amount || 0);
    const pending_amount = totalAmount - paidAmount;

    return {
      data: purchases,
      count: totalCount,
      page_count,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      pending_amount,
    };
  }

  async getById(id, tenantId, db) {
    const purchase = await this.repository.getById(db, id, tenantId);
    if (!purchase) throw new Error("Purchase not found or not authorized");
    return purchase;
  }

  async _processPurchaseItems(items, tenantId, db) {
    if (!items || items.length === 0) return [];

    const itemIds = items.map((item) => item.item_id);
    const dbItems = await this.itemRepository.getByIds(db, itemIds, tenantId);

    if (dbItems.length !== itemIds.length) {
      throw new Error("One or more items not found.");
    }

    return items.map((item) => {
      const dbItem = dbItems.find((i) => i.id === item.item_id);
      const basePrice = item.quantity * item.unit_price;
      const taxAmount = (basePrice * (parseFloat(dbItem.tax) || 0)) / 100;
      const totalPrice = basePrice + taxAmount;
      return { ...item, tax_amount: taxAmount, total_price: totalPrice };
    });
  }
}

module.exports = PurchaseService;
