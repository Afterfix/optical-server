class VoucherTransactionsRepository {
 
  async createMany(client, voucherId, transactions) {
    if (!transactions || transactions.length === 0) {
      return;
    }

    const query = `
      INSERT INTO voucher_transactions (voucher_id, invoice_id, invoice_type, received_amount)
      VALUES ($1, $2, $3, $4);
    `;

    for (const transaction of transactions) {
      const { invoice_id, invoice_type, received_amount } = transaction;
      await client.query(query, [voucherId, invoice_id, invoice_type, received_amount]);
    }
  }

  
  async deleteByVoucherId(client, voucherId) {
    await client.query('DELETE FROM voucher_transactions WHERE voucher_id = $1', [voucherId]);
  }
}

module.exports = VoucherTransactionsRepository;
