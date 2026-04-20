
class TransactionLedgerRepository {

  async create(db, ledgerData) {
    const { tenant_id, transaction_id, account_id, debit, credit } = ledgerData;
    const { rows } = await db.query(
      `
      INSERT INTO transaction_ledger (tenant_id, transaction_id, account_id, debit, credit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [tenant_id, transaction_id, account_id, debit, credit]
    );
    return rows[0];
  }
  async deleteByTransactionId(db, transactionId) {
    const { rows } = await db.query(
      `DELETE FROM transaction_ledger WHERE transaction_id = $1 RETURNING id`,
      [transactionId]
    );
    return rows;
  }
}

module.exports = TransactionLedgerRepository;