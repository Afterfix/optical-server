class RegisterSessionsService {
  constructor(repository) {
    this.repository = repository;
  }

  async openSession(user, data, db) {
    const { tenant_id } = user;
    const done_by_id = data.done_by_id; 

    if (!done_by_id) {
      throw new Error("Done By (Salesperson) is required to open a register.");
    }
    const existingSession = await this.repository.findOpenSession(db, tenant_id, done_by_id);
    if (existingSession) {
      throw new Error("This salesperson already has an open session. Please close it first.");
    }

    const sessionData = {
      tenant_id,
      done_by_id, 
      cost_center_id: data.cost_center_id, 
      opening_cash: data.opening_cash || 0,
      opening_note: data.opening_note,
    };

    return await this.repository.create(db, sessionData);
  }

  async closeSession(id, user, data, db) {
    const session = await this.repository.getById(db, id, user.tenant_id);
    if (!session) {
      throw new Error("Session not found.");
    }
    if (session.status !== 'open') {
      throw new Error("This session is already closed.");
    }

    await this.repository.close(db, id, data);
    return await this.getSessionReport(id, user.tenant_id, db);
  }

  async getSessionReport(id, tenantId, db) {
    const session = await this.repository.getById(db, id, tenantId);
    if (!session) {
      throw new Error("Session not found.");
    }

    const { stats, lists } = await this.repository.getSessionReconciliation(db, session);
    
    const opening = parseFloat(session.opening_cash);
    
    const expected_closing_cash = 
      opening + 
      stats.cash_in - 
      stats.cash_out;

    const actual_closing_cash = session.closing_cash ? parseFloat(session.closing_cash) : 0;
    const discrepancy = actual_closing_cash - expected_closing_cash;

    return {
      session,
      stats,
      lists,
      reconciliation: {
        expected_closing_cash,
        actual_closing_cash,
        discrepancy
      }
    };
  }

  async getCurrentSession(user, db) {
    const session = await this.repository.findAnyOpenSession(db, user.tenant_id);
    if (!session) return null;
    
    return await this.getSessionReport(session.id, user.tenant_id, db);
  }

  async getAllPaginated(tenantId, filters, db) {
    const { sessions, totalCount } = await this.repository.getPaginated(db, tenantId, filters);
    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return {
      data: sessions,
      count: totalCount,
      page_count
    };
  }
}

module.exports = RegisterSessionsService;