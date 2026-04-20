class TransactionService {
  constructor(transactionRepository, transactionLedgerService) {
    this.transactionRepository = transactionRepository;
    this.transactionLedgerService = transactionLedgerService;
  }

  async create(data, db, existingClient = null) {
    const client = existingClient || (await db.connect());
    try {
      if (!existingClient) await client.query("BEGIN");

      const {
        tenant_id,
        transaction_type,
        reference_id,
        description,
        amount,
        account_id,
        from_account_id,
        to_account_id,
        cost_center_id,
        done_by_id,
      } = data;

      if (transaction_type === 'transfer') {
        const withdrawalTransaction = await this.transactionRepository.createTransaction(
          client,
          {
            tenant_id,
            transaction_type: 'transfer', 
            reference_id,
            description: `${description || ''}`.trim(),
            cost_center_id,
            done_by_id,
          }
        );

        await this.transactionLedgerService.create(
          {
            tenant_id,
            transaction_id: withdrawalTransaction.id,
            account_id: from_account_id,
            debit: amount,
            credit: 0,
          },
          client
        );

        const depositTransaction = await this.transactionRepository.createTransaction(
          client,
          {
            tenant_id,
            transaction_type: 'received',  
            reference_id,
            description: `${description || ''}`.trim(),
            cost_center_id,
            done_by_id,
          }
        );

        await this.transactionLedgerService.create(
          {
            tenant_id,
            transaction_id: depositTransaction.id,
            account_id: to_account_id,
            credit: amount,
            debit: 0,
          },
          client
        );

        if (!existingClient) await client.query("COMMIT");
        return [withdrawalTransaction, depositTransaction];
      }

      const transaction = await this.transactionRepository.createTransaction(
        client,
        {
          tenant_id,
          transaction_type,
          reference_id,
          description,
          cost_center_id,
          done_by_id
        }
      );

      switch (transaction_type) {
        case "deposit":
        case "sale":
        case "service":
        case "partnership":
        case "purchase_return":
          await this.transactionLedgerService.create(
            {
              tenant_id,
              transaction_id: transaction.id,
              account_id,
              credit: amount,
              debit: 0,
            },
            client
          );
          break;

        case "withdrawal":
        case "purchase":
        case "expense":
        case "brokerage":
        case "sale_return":
          await this.transactionLedgerService.create(
            {
              tenant_id,
              transaction_id: transaction.id,
              account_id,
              debit: amount,
              credit: 0,
            },
            client
          );
          break;
        
        default:
          throw new Error(`Invalid transaction type: ${transaction_type}`);
      }

      if (!existingClient) await client.query("COMMIT");
      return {
        status: "success",
        data: transaction,
      };
    } catch (error) {
      if (!existingClient) await client.query("ROLLBACK");
      return {
        status: "failed",
        message: error.message || "Something went wrong",
      };
    } finally {
      if (!existingClient) client.release();
    }
  }

  async getById(id, tenantId, db) {
    const transaction = await this.transactionRepository.getById(db, id, tenantId);
    if (!transaction) {
      throw new Error("Transaction not found or not authorized");
    }
    return transaction;
  }

  async getAll(tenantId, filters, db) {
    return await this.transactionRepository.getAllByTenantId(db, tenantId, filters);
  }

  async getPaginated(tenantId, filters, db) {
    const { entries, totalCount } =
      await this.transactionRepository.getPaginatedTransactions(
        db,
        tenantId,
        filters
      );

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return {
      data: entries,
      count: totalCount,
      page_count,
    };
  }

  async updateByReference(data, db, existingClient = null) {
    const client = existingClient || (await db.connect());
    try {
        if (!existingClient) await client.query('BEGIN');

        const { tenant_id, transaction_type, reference_id, amount, account_id, description, cost_center_id } = data;

        const existingTransaction = await this.transactionRepository.findByReference(
            client, tenant_id, transaction_type, reference_id
        );

        if (existingTransaction) {
            const transaction_id = existingTransaction.id;

             await this.transactionRepository.updateTransaction(
              client,
              transaction_id,
              tenant_id,
              { description, cost_center_id }
            );

            await this.transactionLedgerService.deleteByTransactionId(transaction_id, client);

            if (amount > 0 && account_id) {
                 switch (transaction_type) {
                    case "deposit":
                    case "sale":
                    case "service": // Added service here
                    case "partnership":
                    case "purchase_return":
                      await this.transactionLedgerService.create({
                          tenant_id,
                          transaction_id,
                          account_id,
                          credit: amount,
                          debit: 0,
                      }, client);
                      break;

                    case "withdrawal":
                    case "purchase":
                    case "expense":
                    case "brokerage":
                    case "sale_return":
                      await this.transactionLedgerService.create({
                          tenant_id,
                          transaction_id,
                          account_id,
                          debit: amount,
                          credit: 0,
                      }, client);
                      break;

                    default:
                      break;
                }
            }

        } else if (amount > 0 && account_id) {
            // Transaction doesn't exist and there's a payment, so create a new one.
            await this.create(data, db, client);
        }

        if (!existingClient) await client.query('COMMIT');
    } catch (error) {
        if (!existingClient) await client.query('ROLLBACK');
        throw error;
    } finally {
        if (!existingClient) client.release();
    }
  }

  async deleteById(id, tenantId, db, existingClient = null) {
    const client = existingClient || (await db.connect());
    try {
        if (!existingClient) await client.query('BEGIN');

        // 1. Explicitly delete the ledger entries first
        await this.transactionLedgerService.deleteByTransactionId(id, client);

        // 2. Delete the transaction
        const result = await this.transactionRepository.deleteTransactionById(client, id, tenantId);

        if (!existingClient) await client.query('COMMIT');
        return {
            status: 'success',
            data: result,
        };
    } catch (error) {
        if (!existingClient) await client.query('ROLLBACK');
       return {
            status: 'failed',
            message: error.message || 'Something went wrong',
        };
    } finally {
        if (!existingClient) client.release();
    }
  }
   async getRecent(tenantId, db) {
    return await this.transactionRepository.getRecentByTenantId(db, tenantId);
  }

  async deleteByReference(tenantId, transactionType, referenceId, client) {
    const transaction = await this.transactionRepository.findByReference(
        client,
        tenantId,
        transactionType,
        referenceId
    );

    if (!transaction) {
        return null;
    }

    await this.transactionLedgerService.deleteByTransactionId(transaction.id, client);

    return await this.transactionRepository.deleteTransactionById(
        client,
        transaction.id,
        tenantId
    );
  }
}

module.exports = TransactionService;