class SalesService {
  constructor(repository, itemRepository, voucherService) {
    this.repository = repository;
    this.itemRepository = itemRepository;
    this.voucherService = voucherService;
  }

  async getAll(tenantId, filters, db) {
    return await this.repository.getByUserId(db, tenantId, filters);
  }

  async _processSaleItems(items, tenantId, db) {
    if (!items || items.length === 0) {
      return [];
    }

    const processedItems = [];

    for (const item of items) {
      if (!item.item_id) {
        throw new Error("Each sale item must have an item_id");
      }

      const itemData = await this.itemRepository.getById(
        db,
        item.item_id,
        tenantId,
      );
      if (!itemData) throw new Error(`Item ${item.item_id} not found`);

      if (itemData.stock_quantity < item.quantity) {
        throw new Error(`Not enough stock for item: ${itemData.name}.`);
      }

      const quantity = parseFloat(item.quantity) || 1;
      const unitPrice =
        parseFloat(
          item.unit_price || item.item_price || itemData.selling_price,
        ) || 0;

      const basePrice = quantity * unitPrice;

      const taxRate = parseFloat(itemData.tax || 0);
      const taxAmount = (basePrice * taxRate) / 100;
      const totalPrice = basePrice + taxAmount;

      processedItems.push({
        ...item,
        unit_price: unitPrice,
        tax_amount: taxAmount,
        total_price: totalPrice,
      });
    }

    return processedItems;
  }

  _getItemUniqueKey(item) {
    if (item.item_id) return `item_${item.item_id}`;
    return "unknown";
  }

  _deduplicateAndCleanItems(items) {
    const uniqueItemsMap = new Map();
    items.forEach((item) => {
      const quantity = parseFloat(item.quantity) || 0;
      if (quantity <= 0) return;

      const key = this._getItemUniqueKey(item);
      if (uniqueItemsMap.has(key)) {
        uniqueItemsMap.get(key).quantity += quantity;
      } else {
        uniqueItemsMap.set(key, { ...item, quantity });
      }
    });
    return Array.from(uniqueItemsMap.values());
  }
  _processStatusDate(status, existingActualDelivery) {
    if (status === "completed" && !existingActualDelivery) {
      return new Date(); // Set current date if status is completed
    }
    return existingActualDelivery;
  }
  async create(user, saleData, db) {
    const tenantId = user.tenant_id;
    const {
      items,
      discount = 0,
      payment_methods = [],
      note = null,
      account_id = null,
      change_return = 0,
      order_date = null,
      expected_delivery = null,
      actual_delivery = null,
      order_status = "pending",
      payment_status,
      ...saleDetails
    } = saleData;

    const uniqueInputItems = this._deduplicateAndCleanItems(items);
    const itemsWithDetails = await this._processSaleItems(
      uniqueInputItems,
      tenantId,
      db,
    );

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
      .filter((p) => p.amount !== 0 && p.account_id);

    const salePayload = {
      ...saleDetails,
      tenant_id: tenantId,
      account_id,
      discount: parseFloat(discount),
      total_amount: grandTotal,
      change_return: parseFloat(change_return),
      order_date: order_date || saleDetails.order_date || new Date(),
      expected_delivery,
      order_status: order_status,
      actual_delivery: this._processStatusDate(order_status, actual_delivery),
      payment_status,
      note,
    };

    const newSales = await this.repository.create(
      db,
      salePayload,
      itemsWithDetails,
    );

    // Update Stock for Items
    for (const item of itemsWithDetails) {
      if (item.item_id) {
        await this.itemRepository.updateStock(db, item.item_id, -item.quantity);
      }
    }

    if (newSales && validPayments.length > 0) {
      await this._processVouchersForPayments(newSales, user, validPayments, db);
    }

    const result = await this.getById(newSales.id, tenantId, db);
    return {
      status: "success",
      data: result,
    };
  }

  async update(id, user, saleData, db) {
    const tenantId = user.tenant_id;
    const originalSale = await this.repository.getById(db, id, tenantId);
    if (!originalSale) {
      throw new Error("Sale not found or not authorized to update");
    }

    const {
      items: updatedItems,
      discount = 0,
      payment_methods = [],
      note = null,
      account_id = null,
      change_return = 0,
      order_date,
      expected_delivery,
      actual_delivery,
      order_status,
      payment_status,
      ...saleDetails
    } = saleData;

    const uniqueInputItems = this._deduplicateAndCleanItems(updatedItems);
    const itemsWithDetails = await this._processSaleItems(
      uniqueInputItems,
      tenantId,
      db,
    );

    const itemsSubtotal = itemsWithDetails.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );
    const grandTotal = itemsSubtotal - parseFloat(discount);

    const validIncomingPayments = payment_methods
      .map((p) => ({
        account_id: p.account_id,
        amount: parseFloat(p.amount) || 0,
        mode_of_payment_id: p.mode_of_payment_id,
        voucher_id: p.voucher_id,
      }))
      .filter((p) => p.amount !== 0 && p.account_id);

    const incomingVoucherIds = new Set(
      validIncomingPayments
        .map((p) => p.voucher_id)
        .filter((vid) => vid != null),
    );

    const existingVouchers = originalSale.payment_methods || [];
    for (const existingVoucher of existingVouchers) {
      if (
        existingVoucher.voucher_id &&
        !incomingVoucherIds.has(existingVoucher.voucher_id)
      ) {
        await this.voucherService.delete(existingVoucher.voucher_id, user, db);
      }
    }

    const salePayload = {
      ...saleDetails,
      account_id,
      discount: parseFloat(discount),
      total_amount: grandTotal,
      change_return: parseFloat(change_return),
      order_date,
      expected_delivery,
      order_status: order_status,
      actual_delivery: this._processStatusDate(order_status, originalSale.actual_delivery || actual_delivery),
      payment_status,
      note,
    };

    // Calculate Stock Differences for Items
    const stockAdjustments = new Map();

    (originalSale.items || []).forEach((item) => {
      if (item.item_id) {
        const key = item.item_id;
        stockAdjustments.set(
          key,
          (stockAdjustments.get(key) || 0) + item.quantity,
        );
      }
    });

    (itemsWithDetails || []).forEach((item) => {
      if (item.item_id) {
        const key = item.item_id;
        stockAdjustments.set(
          key,
          (stockAdjustments.get(key) || 0) - item.quantity,
        );
      }
    });

    const updatedSales = await this.repository.update(
      db,
      id,
      tenantId,
      salePayload,
      itemsWithDetails,
    );

    if (!updatedSales) {
      throw new Error("Failed to update the sale.");
    }

    for (const [itemId, quantityChange] of stockAdjustments.entries()) {
      if (quantityChange !== 0) {
        await this.itemRepository.updateStock(db, itemId, quantityChange);
      }
    }

    if (updatedSales && validIncomingPayments.length > 0) {
      await this._processVouchersForPayments(
        updatedSales,
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

  async _processVouchersForPayments(sale, user, payment_methods, db) {
    // if (!sale.party_ledger_id) {
    //   throw new Error(
    //     `The customer '${sale.party_name}' does not have a linked Ledger account.`,
    //   );
    // }

    for (const payment of payment_methods) {
      const amount = parseFloat(payment.amount);
      if (amount === 0) continue;

      const isReceipt = amount > 0;
      const absAmount = Math.abs(amount);

      const voucherData = {
        tenant_id: user.tenant_id,
        amount: absAmount,
        date: sale.order_date,
        description: `Payment for Sale Invoice #${sale.invoice_number}`,
        voucher_no:
          payment.voucher_no ||
          `VS-${sale.invoice_number}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,

        voucher_type: isReceipt ? 1 : 0,

        from_ledger: {
          ledger_id: isReceipt ? sale.party_ledger_id : payment.account_id,
        },
        to_ledger: {
          ledger_id: isReceipt ? payment.account_id : sale.party_ledger_id,
        },

        cost_center_id: sale.cost_center_id,
        done_by_id: sale.done_by_id,
        mode_of_payment_id: payment.mode_of_payment_id,

        transactions: [
          {
            invoice_id: sale.id,
            invoice_type: "SALE",
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

  async updatePaymentAndStatus(client, saleId, amountChange) {
    return this.repository.updatePaymentAndStatus(client, saleId, amountChange);
  }

  async getPaginatedBytenantId(tenantId, filters, db) {
    const { sales, totalCount, total_amount, paid_amount } =
      await this.repository.getPaginatedBytenantId(db, tenantId, filters);

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    const totalAmount = parseFloat(total_amount || 0);
    const paidAmount = parseFloat(paid_amount || 0);
    const pending_amount = totalAmount - paidAmount;

    return {
      data: sales,
      count: totalCount,
      page_count,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      pending_amount,
    };
  }

  _normalizeImageUrl(url) {
    if (typeof url !== "string") return url;
    if (url.startsWith("//")) url = url.replace(/^\/+/, "/");
    url = url.replace(/\s/g, "%20");
    if (url.includes("inventoryx"))
      url = url.replace(/inventoryx/g, "inventoryx");
    return url;
  }

  async getById(id, tenantId, db) {
    const sales = await this.repository.getById(db, id, tenantId);
    if (!sales) throw new Error("Sales not found or not authorized");
    if (sales.store) {
      if (sales.store.header_image_url)
        sales.store.header_image_url = this._normalizeImageUrl(
          sales.store.header_image_url,
        );
      if (sales.store.full_header_image_url)
        sales.store.full_header_image_url = this._normalizeImageUrl(
          sales.store.full_header_image_url,
        );
    }
    return sales;
  }

  async delete(id, user, db) {
    const tenantId = user.tenant_id;
    const saleToDelete = await this.repository.getById(db, id, tenantId);
    if (!saleToDelete) throw new Error("Sale not found");

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      if (saleToDelete.payment_methods) {
        for (const payment of saleToDelete.payment_methods) {
          await this.voucherService.delete(
            payment.voucher_id,
            user,
            db,
            client,
          );
        }
      }

      await this.repository.delete(client, id, tenantId);

      for (const item of saleToDelete.items) {
        if (item.item_id) {
          await this.itemRepository.updateStock(
            client,
            item.item_id,
            item.quantity,
          );
        }
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
}

module.exports = SalesService;
