class PurchaseService {
  constructor(
    repository,
    itemRepository,
    voucherService,
  ) {
    this.repository = repository;
    this.itemRepository = itemRepository;
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

    const itemsWithDetails = await this._processPurchaseItems(items, tenantId, db);

    const itemsSubtotal = itemsWithDetails.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );
    const grandTotal = itemsSubtotal - parseFloat(discount);

    const validPayments = payment_methods
      .map((p) => ({
        account_id: p.account_id,
        amount: parseFloat(p.amount) || 0,
        mode_of_payment_id: p.mode_of_payment_id,
      }))
      .filter((p) => p.amount > 0 && p.account_id);

    // Use the top-level mode_of_payment_id from the payload (set by the form
    // field, covers credit purchases). Fall back to the first payment method's
    // mode if the form field was left blank.
    const preferredModeOfPaymentId =
      purchaseDetails.mode_of_payment_id ||
      payment_methods[0]?.mode_of_payment_id ||
      null;

    const purchasePayload = {
      ...purchaseDetails,
      tenant_id: tenantId,
      discount: parseFloat(discount),
      total_amount: grandTotal,
      date: purchaseDetails.date || new Date(),
      note,
      mode_of_payment_id: preferredModeOfPaymentId,
    };

    const newPurchase = await this.repository.create(
      db,
      purchasePayload,
      itemsWithDetails,
    );

    // Update Stock for identified item types
    for (const item of itemsWithDetails) {
      if (item.item_id) {
        await this.itemRepository.updateStock(db, item.item_id, item.quantity);
      }
    }

    if (newPurchase && validPayments.length > 0) {
      await this._processVouchersForPayments(newPurchase, user, validPayments, db);
    }

    const result = await this.getById(newPurchase.id, tenantId, db);
    return { status: "success", data: result };
  }

  async update(id, user, purchaseData, db) {
    const tenantId = user.tenant_id;
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

    const itemsWithDetails = await this._processPurchaseItems(updatedItems, tenantId, db);
    const itemsSubtotal = itemsWithDetails.reduce((sum, item) => sum + item.total_price, 0);
    const grandTotal = itemsSubtotal - parseFloat(discount);

    const validIncomingPayments = payment_methods
      .map((p) => ({
        account_id: p.account_id,
        amount: parseFloat(p.amount) || 0,
        mode_of_payment_id: p.mode_of_payment_id,
        voucher_id: p.voucher_id,
      }))
      .filter((p) => p.amount > 0 && p.account_id);

    // Use the top-level mode_of_payment_id from the payload (form field),
    // fall back to the first incoming payment method's mode.
    const preferredModeOfPaymentId =
      purchaseDetails.mode_of_payment_id ||
      payment_methods[0]?.mode_of_payment_id ||
      null;

    // Handle existing vouchers
    const incomingVoucherIds = new Set(validIncomingPayments.map((p) => p.voucher_id).filter((vid) => vid != null));
    const existingVouchers = originalPurchase.payment_methods || [];
    for (const existingVoucher of existingVouchers) {
      if (existingVoucher.voucher_id && !incomingVoucherIds.has(existingVoucher.voucher_id)) {
        await this.voucherService.delete(existingVoucher.voucher_id, user, db);
      }
    }

    // Calculate Stock Differences
    const itemAdjustments = new Map();

    (originalPurchase.items || []).forEach(item => {
      if (item.item_id) itemAdjustments.set(item.item_id, (itemAdjustments.get(item.item_id) || 0) - item.quantity);
    });

    (itemsWithDetails || []).forEach(item => {
      if (item.item_id) itemAdjustments.set(item.item_id, (itemAdjustments.get(item.item_id) || 0) + item.quantity);
    });

    const updatedPurchase = await this.repository.update(db, id, tenantId, { ...purchaseDetails, discount, total_amount: grandTotal, note, mode_of_payment_id: preferredModeOfPaymentId }, itemsWithDetails);

    // Apply stock changes
    for (const [sid, change] of itemAdjustments.entries()) if (change !== 0) await this.itemRepository.updateStock(db, sid, change);

    if (updatedPurchase && validIncomingPayments.length > 0) {
      await this._processVouchersForPayments(updatedPurchase, user, validIncomingPayments, db);
    }

    const result = await this.getById(id, tenantId, db);
    return { status: "success", data: result };
  }

  async _processPurchaseItems(items, tenantId, db) {
    if (!items || items.length === 0) return [];
    const processedItems = [];

    for (const item of items) {
      const itemId = item.item_id || item.id;
      const dbItem = await this.itemRepository.getById(db, itemId, tenantId);

      if (!dbItem) {
        throw new Error(`Item with ID ${itemId} not found.`);
      }

      const basePrice = parseFloat(item.quantity) * parseFloat(item.unit_price);
      const taxRate = parseFloat(dbItem.tax || 0);
      const taxAmount = (basePrice * taxRate) / 100;
      const totalPrice = basePrice + taxAmount;

      processedItems.push({
        ...item,
        item_id: itemId,
        tax_amount: taxAmount,
        total_price: totalPrice
      });
    }
    return processedItems;
  }

  async _processVouchersForPayments(purchase, user, payment_methods, db) {
    if (!purchase.party_ledger_id) {
      throw new Error(`The supplier '${purchase.party_name}' does not have a linked Ledger account.`);
    }

    for (const payment of payment_methods) {
      const amount = parseFloat(payment.amount);
      if (amount <= 0) continue;

      const voucherData = {
        tenant_id: user.tenant_id,
        amount: amount,
        date: purchase.date,
        description: `Payment for Purchase Invoice #${purchase.invoice_number}`,
        voucher_no: payment.voucher_no || `VP-${purchase.invoice_number}-${Date.now()}`,
        voucher_type: 0,
        from_ledger: { ledger_id: payment.account_id },
        to_ledger: { ledger_id: purchase.party_ledger_id },
        cost_center_id: purchase.cost_center_id,
        done_by_id: purchase.done_by_id,
        mode_of_payment_id: payment.mode_of_payment_id,
        transactions: [{ invoice_id: purchase.id, invoice_type: "PURCHASE", received_amount: amount }],
      };

      if (payment.voucher_id) {
        await this.voucherService.update(payment.voucher_id, user, voucherData, db);
      } else {
        await this.voucherService.create(user, voucherData, db);
      }
    }
  }

  async delete(id, user, db) {
    const tenantId = user.tenant_id;
    const purchaseToDelete = await this.repository.getById(db, id, tenantId);
    if (!purchaseToDelete) throw new Error("Purchase not found");

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      if (purchaseToDelete.payment_methods) {
        for (const pm of purchaseToDelete.payment_methods) {
          if (pm.voucher_id) await this.voucherService.delete(pm.voucher_id, user, db, client);
        }
      }
      await this.repository.delete(client, id, tenantId);
      for (const item of (purchaseToDelete.items || [])) {
        if (item.item_id) await this.itemRepository.updateStock(client, item.item_id, -item.quantity);
      }
      await client.query("COMMIT");
      return { status: "success" };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getPaginatedByUserId(tenantId, filters, db) {
    const { purchases, totalCount, total_amount, paid_amount } = await this.repository.getPaginatedByUserId(db, tenantId, filters);
    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    return {
      data: purchases,
      count: totalCount,
      page_count: totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0,
      total_amount: parseFloat(total_amount || 0),
      paid_amount: parseFloat(paid_amount || 0),
      pending_amount: parseFloat(total_amount || 0) - parseFloat(paid_amount || 0),
    };
  }

  async updatePaymentAndStatus(client, purchaseId, amountChange) {
    return this.repository.updatePaymentAndStatus(client, purchaseId, amountChange);
  }

  async getById(id, tenantId, db) {
    const purchase = await this.repository.getById(db, id, tenantId);
    if (!purchase) throw new Error("Purchase not found");
    return purchase;
  }
}

module.exports = PurchaseService;