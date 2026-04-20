class AccountRepository {

  _buildSelectQuery() {
    return `
      SELECT 
        a.*, 
        db.name AS done_by_name, 
        cc.name AS cost_center_name,
        COALESCE(l.balance, 0) as balance
      FROM 
        account a
      LEFT JOIN 
        done_by db ON a.done_by_id = db.id
      LEFT JOIN 
        cost_center cc ON a.cost_center_id = cc.id
      LEFT JOIN (
        SELECT
          account_id,
          SUM(credit) - SUM(debit) as balance
        FROM transaction_ledger
        GROUP BY account_id
      ) l ON a.id = l.account_id
    `;
  }

  async getAllByTenantId(db, tenantId, filters = {}) {
    const { sort, searchType, searchKey, ...otherFilters } = filters;
    
    let query = this._buildSelectQuery();
    query += ` WHERE a.tenant_id = $1`;
    
    const params = [tenantId];
    let paramIndex = 2;
    
    let whereClauses = [];
    let havingClauses = [];

    const filterConfig = {
      name: { operator: 'ILIKE', column: 'a.name', type: 'where' },
      type: { operator: '=', column: 'a.type', type: 'where' },
      done_by_id: { operator: '=', column: 'a.done_by_id', type: 'where' },
      cost_center_id: { operator: '=', column: 'a.cost_center_id', type: 'where' },
      min_balance: { operator: '>=', column: 'COALESCE(l.balance, 0)', type: 'having' },
      max_balance: { operator: '<=', column: 'COALESCE(l.balance, 0)', type: 'having' },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (otherFilters[key] != null && otherFilters[key] !== '' && filterConfig[key]) {
        const { operator, column, type } = filterConfig[key];
        let value = otherFilters[key];
        if (operator === 'ILIKE') value = `%${value}%`;
        
        const clause = `${column} ${operator} $${paramIndex}`;
        if (type === 'where') {
          whereClauses.push(clause);
        } else {
          havingClauses.push(clause);
        }
        params.push(value);
        paramIndex++;
      }
    });

    const searchConfig = {
      name: { operator: 'ILIKE', column: 'a.name', type: 'where' },
      description: { operator: 'ILIKE', column: 'a.description', type: 'where' },
      amount: { operator: '=', column: 'COALESCE(l.balance, 0)', type: 'having', isNumber: true }, 
    };

    if (searchType && searchKey != null && searchKey !== '' && searchConfig[searchType]) {
      const { operator, column, type, isNumber } = searchConfig[searchType];
      
      if (isNumber && !isNaN(searchKey)) {
        const clause = `${column} ${operator} $${paramIndex}`;
         if (type === 'where') whereClauses.push(clause);
         else havingClauses.push(clause);
        params.push(Number(searchKey));
        paramIndex++;
      } else if (!isNumber) {
        let value = operator === 'ILIKE' ? `%${searchKey}%` : searchKey;
        const clause = `${column} ${operator} $${paramIndex}`;
        if (type === 'where') whereClauses.push(clause);
        else havingClauses.push(clause);
        params.push(value);
        paramIndex++;
      }
    }

    if (whereClauses.length > 0) {
      query += ` AND ${whereClauses.join(' AND ')}`;
    }
    
    if (havingClauses.length > 0) {
        query += ` HAVING ${havingClauses.join(' AND ')}`;
    }

    const allowedSortColumns = {
      name: 'a.name',
      type: 'a.type',
      amount: 'balance',
      balance: 'balance',
      created_at: 'a.created_at',
      done_by: 'db.name',
      cost_center: 'cc.name',
      party: 'p.name',
    };

    if (sort) {
      const direction = sort.startsWith('-') ? 'DESC' : 'ASC';
      const columnKey = sort.startsWith('-') ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) {
        query += ` ORDER BY ${dbColumn} ${direction}, a.id DESC`;
      } else {
        query += ' ORDER BY a.created_at DESC, a.id DESC';
      }
    } else {
      query += ' ORDER BY a.created_at DESC, a.id DESC';
    }

    const { rows } = await db.query(query, params);
    return rows;
  }

  // ADDED: db param
  async create(db, accountData) {
    const {
      tenant_id,
      name,
      type,
      description,
      partner_id,
      done_by_id,
      cost_center_id,
      party_id,
      initial_balance
    } = accountData;

    const query = `
      INSERT INTO account (tenant_id, name, type, description, partner_id, done_by_id, cost_center_id, party_id, balance)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      tenant_id,
      name,
      type,
      description,
      partner_id,
      done_by_id || null,
      cost_center_id || null,
      party_id || null,
      initial_balance
    ];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  // ADDED: db param
  async getById(db, id, tenantId = null) {
    let query = this._buildSelectQuery();
    query += ` WHERE a.id = $1`;
    const params = [id];

    if (tenantId) {
      query += ' AND a.tenant_id = $2';
      params.push(tenantId);
    }

    const { rows } = await db.query(query, params);
    return rows[0];
  }

  // ADDED: db param
  async update(db, id, data, tenantId = null) {
    delete data.balance;
    delete data.amount;
    delete data.initial_balance;

    const fields = Object.keys(data);
    const values = Object.values(data);

    if (fields.length === 0) {
      return this.getById(db, id, tenantId);
    }

    const setClause = fields
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(', ');

    let query = `UPDATE account SET ${setClause} WHERE id = $${fields.length + 1}`;
    const params = [...values, id];

    if (tenantId) {
      query += ` AND tenant_id = $${fields.length + 2}`;
      params.push(tenantId);
    }

    query += ' RETURNING *';

    const { rows } = await db.query(query, params);
    return rows[0];
  }

  // ADDED: db param
  async delete(db, id, tenantId = null) {
    let query = 'DELETE FROM account WHERE id = $1';
    const params = [id];

    if (tenantId) {
      query += ' AND tenant_id = $2';
      params.push(tenantId);
    }

    query += ' RETURNING id';

    const { rows } = await db.query(query, params);
    return rows[0];
  }
}

module.exports = AccountRepository;