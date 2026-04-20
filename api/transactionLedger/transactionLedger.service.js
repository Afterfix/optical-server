
class TransactionLedgerService {
  constructor(transactionLedgerRepository) {
    this.repository = transactionLedgerRepository;
  }
  async create(ledgerData, client) {
    return await this.repository.create(client, ledgerData);
  }
   async deleteByTransactionId(transactionId, client) {
    return await this.repository.deleteByTransactionId(client, transactionId);
  }
}

module.exports = TransactionLedgerService;