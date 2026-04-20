class CustomerService {
  constructor(repo) {
    this.repo = repo;
  }

  async getAll(user, db) {
    return await this.repo.getAll(db, user.tenant_id);
  }

  async create(data, user, db) {
    try {
      return await this.repo.create(db, { ...data, tenant_id: user.tenant_id });
    } catch (e) {
      if (e.code === "23505") throw new Error("Customer name already exists.");
      throw e;
    }
  }

  async getById(id, user, db) {
    return await this.repo.getById(db, id, user.tenant_id);
  }

  async update(id, data, user, db) {
    try {
      return await this.repo.update(db, id, user.tenant_id, data);
    } catch (e) {
      if (e.code === "23505")
        throw new Error("A customer with this name already exists.");
      throw e;
    }
  }

  async delete(id, user, db) {
    return await this.repo.delete(db, id, user.tenant_id);
  }
}
module.exports = CustomerService;
