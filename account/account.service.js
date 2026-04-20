class AccountService {
  constructor(accountRepository, tenantRepository) {
    this.accountRepository = accountRepository;
    this.tenantRepository = tenantRepository;
  }

  async getAllAccounts(user, filters = {}, db) {
    let tenantId;
    if (user.role === "super_admin") {
      tenantId = filters.tenant_id || null;
    } else {
      tenantId = user.tenant_id;
    }
    return await this.accountRepository.getAllByTenantId(db, tenantId, filters);
  }

  async create(accountData, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      let tenantIdForNewAccount;

      // 1. Tenant Logic
      if (user.role === "super_admin") {
        if (!accountData.tenant_id) {
          const err = new Error("Super admin must specify a 'tenant_id'.");
          err.statusCode = 400;
          throw err;
        }
        const tenantExists = await this.tenantRepository.getById(
          client,
          accountData.tenant_id,
        );
        if (!tenantExists) {
          const err = new Error(
            `Tenant ID ${accountData.tenant_id} not found.`,
          );
          err.statusCode = 404;
          throw err;
        }
        tenantIdForNewAccount = accountData.tenant_id;
      } else {
        tenantIdForNewAccount = user.tenant_id;
      }

      // 2. Create Account
      const dataToSave = { ...accountData, tenant_id: tenantIdForNewAccount };
      const newAccount = await this.accountRepository.create(
        client,
        dataToSave,
      );

      await client.query("COMMIT");

      // 3. Return full object (with joins/calculated balance)
      return await this.accountRepository.getById(
        client,
        newAccount.id,
        newAccount.tenant_id,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      // Handle Postgres unique constraint violation
      if (error.code === "23505") {
        throw new Error(
          `Account name "${accountData.name}" already exists for this tenant.`,
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }
  async getById(id, user, db) {
    if (user.role === "super_admin") {
      return await this.accountRepository.getById(db, id);
    } else {
      return await this.accountRepository.getById(db, id, user.tenant_id);
    }
  }

  async update(id, data, user, db) {
    try {
      const tenantId = user.role === "super_admin" ? null : user.tenant_id;
      const updatedAccount = await this.accountRepository.update(
        db,
        id,
        data,
        tenantId,
      );

      return updatedAccount; // Return raw data
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(`The name "${data.name}" is already taken.`);
      }
      throw error;
    }
  }

  async delete(id, user, db) {
    try {
      let result;

      if (user.role === "super_admin") {
        result = await this.accountRepository.delete(db, id);
      } else {
        result = await this.accountRepository.delete(db, id, user.tenant_id);
      }

      return {
        status: "success",
        data: result,
      };
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;

      return {
        status: "failed",
        data: null,
        error: {
          message: error.message,
          statusCode: error.statusCode,
        },
      };
    }
  }
}

module.exports = AccountService;
