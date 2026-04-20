// --- START OF FILE saleReturn.service.js ---

class SaleReturnService {
    constructor(saleReturnRepository, saleRepository, itemRepository, voucherService) {
        this.repository = saleReturnRepository;
        this.saleRepository = saleRepository;
        this.itemRepository = itemRepository;
        this.voucherService = voucherService;
    }

    async create(user, body, db) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const { payment_methods = [], unit_price = 0, ...returnDetails } = body;

           const itemDetails = await this.itemRepository.getById(client, returnDetails.item_id, user.tenant_id);
            if (!itemDetails) {
                throw new Error(`Item with ID ${returnDetails.item_id} not found.`);
            }

            const taxRate = parseFloat(itemDetails.tax) || 0;
            const baseAmount = parseFloat(returnDetails.return_quantity) * parseFloat(unit_price);
            const taxAmount = baseAmount * (taxRate / 100);
            const totalValueToRefund = baseAmount + taxAmount;


            const originalSale = await this.saleRepository.getById(client, returnDetails.sale_id, user.tenant_id);
            if (!originalSale) throw new Error("Original sale not found.");
            if (!originalSale.party_ledger_id) throw new Error(`Customer '${originalSale.party_name}' has no linked Ledger.`);

            const returnData = {
                ...returnDetails,
                tenant_id: user.tenant_id,
                total_refund_amount: totalValueToRefund, // Use the new tax-inclusive total
            };

            await this.saleRepository.increaseItemReturnedQuantity(
                client, returnData.sale_id, returnData.item_id, returnData.return_quantity
            );

            const newSaleReturn = await this.repository.create(client, returnData);

            await this.itemRepository.updateStock(
                client, newSaleReturn.item_id, newSaleReturn.return_quantity
            );

            await client.query('COMMIT');

            if (payment_methods.length > 0) {
                await this._processVouchersForRefunds(user, newSaleReturn, originalSale.party_ledger_id, payment_methods, db);
            }

            const result = await this.getById(newSaleReturn.id, user.tenant_id, db);
            return {
                status: "success",
                data: result,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            return {
                status: "failed",
                message: error.message || "Something went wrong",
            };
        } finally {
            client.release();
        }
    }

    async _processVouchersForRefunds(user, saleReturn, partyLedgerId, payment_methods, db) {
        for (const payment of payment_methods) {
            const amount = parseFloat(payment.amount);
            if (amount <= 0) continue;

            const voucherData = {
                amount: amount,
                date: saleReturn.date || new Date(),
                description: `Refund for Sale Return Invoice #${saleReturn.invoice_number}`,
                voucher_no: payment.voucher_no || `SR-REF-${saleReturn.invoice_number}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                voucher_type: 0, // 0 for Paid (Business pays Customer)
                from_ledger: { ledger_id: payment.account_id },
                to_ledger: { ledger_id: partyLedgerId },
                cost_center_id: saleReturn.cost_center_id,
                done_by_id: saleReturn.done_by_id,
                mode_of_payment_id: payment.mode_of_payment_id,
                transactions: [{
                    invoice_id: saleReturn.id,
                    invoice_type: 'SALERETURN',
                    received_amount: amount
                }]
            };

            if (payment.voucher_id) {
                // UPDATE existing voucher
                await this.voucherService.update(payment.voucher_id, user, voucherData, db);
            } else {
                // CREATE new voucher
                await this.voucherService.create(user, voucherData, db);
            }
        }
    }

    async update(id, user, body, db) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const tenantId = user.tenant_id;
            const { payment_methods = [], unit_price = 0, ...returnData } = body;

            const existingReturn = await this.repository.getById(client, id, tenantId);
            if (!existingReturn) throw new Error('Sale return not found');

            const itemDetails = await this.itemRepository.getById(client, existingReturn.item_id, tenantId);
             if (!itemDetails) {
                throw new Error(`Item with ID ${existingReturn.item_id} not found.`);
            }

            const taxRate = parseFloat(itemDetails.tax) || 0;
            const baseAmount = parseFloat(returnData.return_quantity) * parseFloat(unit_price);
            const taxAmount = baseAmount * (taxRate / 100);
            const totalValueToRefund = baseAmount + taxAmount;

            const updatedReturnData = {
                ...returnData,
                total_refund_amount: totalValueToRefund, // Use the new tax-inclusive total
            };

            const quantityDifference = returnData.return_quantity - existingReturn.return_quantity;
            if (quantityDifference !== 0) {
                await this.itemRepository.updateStock(client, existingReturn.item_id, quantityDifference);
                if (quantityDifference > 0) {
                     await this.saleRepository.increaseItemReturnedQuantity(client, existingReturn.sale_id, existingReturn.item_id, quantityDifference);
                } else {
                     await this.saleRepository.decreaseItemReturnedQuantity(client, existingReturn.sale_id, existingReturn.item_id, -quantityDifference);
                }
            }

            // 2. Handle Payment Methods (Sync Vouchers)
            // Filter and map valid payments
            const validIncomingPayments = payment_methods
                .map((p) => ({
                    account_id: p.account_id,
                    amount: parseFloat(p.amount) || 0,
                    mode_of_payment_id: p.mode_of_payment_id,
                    voucher_id: p.voucher_id, // Ensure ID is passed if it exists
                }))
                .filter((p) => p.amount !== 0 && p.account_id);

            // Collect IDs of incoming vouchers to identify which existing ones should be kept
            const incomingVoucherIds = new Set(
                validIncomingPayments
                    .map(p => p.voucher_id)
                    .filter(id => id != null)
            );

            // Get existing vouchers from the DB record
            const existingVouchers = existingReturn.payment_methods || [];

            // Delete existing vouchers that are NOT in the incoming payload
            for (const existingVoucher of existingVouchers) {
                if (existingVoucher.voucher_id && !incomingVoucherIds.has(existingVoucher.voucher_id)) {
                    await this.voucherService.delete(existingVoucher.voucher_id, user, db);
                }
            }

            const updatedSaleReturn = await this.repository.update(client, id, tenantId, updatedReturnData);
            await client.query('COMMIT');

            if (validIncomingPayments.length > 0) {
                await this._processVouchersForRefunds(user, updatedSaleReturn, existingReturn.party_ledger_id, validIncomingPayments, db);
            }
            const updatedReturn = await this.getById(updatedSaleReturn.id, tenantId, db);

            return {
                status: "success",
                data: updatedReturn,
            };

        } catch (error) {
            await client.query('ROLLBACK');
            return{
                status:"failed",
                message: error.message || "Something went wrong"
            }
        } finally {
            client.release();
        }
    }

    async delete(id, user, db) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const tenantId = user.tenant_id;
            const saleReturnToDelete = await this.repository.getById(client, id, tenantId);
            if (!saleReturnToDelete) throw new Error('Sale return not found.');

            await this.itemRepository.updateStock(client, saleReturnToDelete.item_id, -saleReturnToDelete.return_quantity);
            await this.saleRepository.decreaseItemReturnedQuantity(client, saleReturnToDelete.sale_id, saleReturnToDelete.item_id, saleReturnToDelete.return_quantity);

            const result = await this.repository.delete(client, id, tenantId);
            await client.query('COMMIT');
            return {
                status: "success",
                data: result,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            return{
                status:"failed",
                message: error.message || "Something went wrong"
            }
        } finally {
            client.release();
        }
    }

    async getById(id, tenantId, db) {
        return this.repository.getById(db, id, tenantId);
    }

    async getAll(tenantId, filters, db) {
        return this.repository.getAllByUserId(db, tenantId, filters);
    }

    async getPaginatedByUserId(tenantId, filters, db) {
        return this.repository.getPaginatedByUserId(db, tenantId, filters);
    }

    async updatePaymentAndStatus(client, saleReturnId, amountChange) {
        return this.repository.updatePaymentAndStatus(client, saleReturnId, amountChange);
    }
}

module.exports = SaleReturnService;