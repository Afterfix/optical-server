class TransactionPaymentsRepository { 

  async createManySaleReturnPayment(client, saleReturnId, tenantId, payments) {
    const query = `
        INSERT INTO transaction_payments (sale_return_id, tenant_id, account_id, amount, mode_of_payment_id)
        VALUES ($1, $2, $3, $4, $5);
    `;
    for (const payment of payments) {
      await client.query(query, [
        saleReturnId,
        tenantId,
        payment.account_id,
        payment.amount,
        payment.mode_of_payment_id
      ]);
    }
  }

  async deleteSaleReturnPaymentById(client, saleReturnId) {
    await client.query("DELETE FROM transaction_payments WHERE sale_return_id = $1", [
      saleReturnId,
    ]);
  }
  async createManyPurchaseReturnPayment(client, purchaseReturnId, tenantId, payments) {
    const query = `
        INSERT INTO transaction_payments (purchase_return_id, tenant_id, account_id, amount, mode_of_payment_id)
        VALUES ($1, $2, $3, $4, $5);
    `;
    for (const payment of payments) {
      await client.query(query, [
        purchaseReturnId,
        tenantId,
        payment.account_id,
        payment.amount,
        payment.mode_of_payment_id
      ]);
    }
  }

  async deletePurchaseReturnPaymentById(client, purchaseReturnId) {
    await client.query("DELETE FROM transaction_payments WHERE purchase_return_id = $1", [
      purchaseReturnId,
    ]);
  }


  async createManySalesPayment(client, saleId, tenantId, payments) {
    const query = `
        INSERT INTO transaction_payments (sale_id, tenant_id, account_id, amount, mode_of_payment_id)
        VALUES ($1, $2, $3, $4, $5);
    `
    for (const payment of payments) {
      if (payment.amount > 0) {
        await client.query(query, [
          saleId,
          tenantId,
          payment.account_id,
          payment.amount,
          payment.mode_of_payment_id
        ])
      }
    }
  }


  async deleteSalePaymentById(client, saleId) {
    await client.query('DELETE FROM transaction_payments WHERE sale_id = $1', [saleId])
  }

  async createManyPurchasePayment(client, purchaseId, tenantId, payments) {
    const query = `
        INSERT INTO transaction_payments (purchase_id, tenant_id, account_id, amount, mode_of_payment_id)
        VALUES ($1, $2, $3, $4, $5);
    `;
    for (const payment of payments) {
      await client.query(query, [
        purchaseId,
        tenantId,
        payment.account_id,
        payment.amount,
        payment.mode_of_payment_id,
      ]);
    }
  }

  async deletePurchasePaymentById(client, purchaseId) {
    await client.query("DELETE FROM transaction_payments WHERE purchase_id = $1", [
      purchaseId,
    ]);
  }
}

module.exports = TransactionPaymentsRepository;