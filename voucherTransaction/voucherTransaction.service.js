
const VoucherTransactionsRepository = require('./voucherTransaction.repository');

class VoucherTransactionsService {
  constructor() {
    this.repository = new VoucherTransactionsRepository();
  }

  async createMany(client, voucherId, transactions) {
    return this.repository.createMany(client, voucherId, transactions);
  }

  async deleteByVoucherId(client, voucherId) {
    return this.repository.deleteByVoucherId(client, voucherId);
  }
}

module.exports = VoucherTransactionsService;
