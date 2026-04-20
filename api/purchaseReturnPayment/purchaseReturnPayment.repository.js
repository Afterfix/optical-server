class PurchaseReturnPaymentRepository {

  async createMany(client, purchaseReturnId, tenantId, payments) {
    const query = `
        INSERT INTO transaction_payments (purchase_return_id, tenant_id, account_id, amount)
        VALUES ($1, $2, $3, $4);
    `;
    for (const payment of payments) {
      await client.query(query, [
        purchaseReturnId,
        tenantId,
        payment.account_id,
        payment.amount,
      ]);
    }
  }

  async deleteByPurchaseReturnId(client, purchaseReturnId) {
    await client.query("DELETE FROM transaction_payments WHERE purchase_return_id = $1", [
      purchaseReturnId,
    ]);
  }
}

module.exports = PurchaseReturnPaymentRepository;