class RegisterSessionsRepository {
  // constructor removed

  async create(client, data) {
    const {
      tenant_id,
      done_by_id,
      cost_center_id,
      opening_cash = 0,
      opening_note,
    } = data;

    const query = `
      INSERT INTO register_sessions (tenant_id, done_by_id, cost_center_id, opening_cash, opening_note, status, opened_at)
      VALUES ($1, $2, $3, $4, $5, 'open', NOW())
      RETURNING *;
    `;

    const { rows } = await client.query(query, [
      tenant_id,
      done_by_id,
      cost_center_id,
      opening_cash,
      opening_note,
    ]);
    return rows[0];
  }

  async close(client, id, data) {
    const { closing_cash, closing_note } = data;
    const query = `
      UPDATE register_sessions
      SET closing_cash = $1, closing_note = $2, status = 'closed', closed_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;
    const { rows } = await client.query(query, [
      closing_cash,
      closing_note,
      id,
    ]);
    return rows[0];
  }

  async findOpenSession(db, tenantId, doneById) {
    const query = `
      SELECT * FROM register_sessions 
      WHERE tenant_id = $1 AND done_by_id = $2 AND status = 'open'
      LIMIT 1;
    `;
    const { rows } = await db.query(query, [tenantId, doneById]);
    return rows[0];
  }

  async findAnyOpenSession(db, tenantId) {
    const query = `
      SELECT * FROM register_sessions 
      WHERE tenant_id = $1 AND status = 'open'
      ORDER BY opened_at DESC
      LIMIT 1;
    `;
    const { rows } = await db.query(query, [tenantId]);
    return rows[0];
  }

  async getById(db, id, tenantId) {
    const query = `
      SELECT 
        rs.*,
        db.name as done_by_name,
        cc.name as cost_center_name
      FROM register_sessions rs
      LEFT JOIN "done_by" db ON rs.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON rs.cost_center_id = cc.id
      WHERE rs.id = $1 AND rs.tenant_id = $2;
    `;
    const { rows } = await db.query(query, [id, tenantId]);
    return rows[0];
  }

  async getPaginated(db, tenantId, filters = {}) {
    const {
      page = 1,
      page_size = 10,
      sort,
      done_by_id,
      status,
      start_date,
      end_date,
    } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    let query = `
      SELECT 
        rs.*,
        db.name as done_by_name,
        cc.name as cost_center_name,
        COUNT(*) OVER() as total_count
      FROM register_sessions rs
      LEFT JOIN "done_by" db ON rs.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON rs.cost_center_id = cc.id
      WHERE rs.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (done_by_id) {
      query += ` AND rs.done_by_id = $${paramIndex++}`;
      params.push(done_by_id);
    }
    if (status) {
      query += ` AND rs.status = $${paramIndex++}`;
      params.push(status);
    }
    if (start_date) {
      query += ` AND rs.opened_at >= $${paramIndex++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND rs.opened_at <= $${paramIndex++}`;
      params.push(end_date);
    }

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const column = sort.replace("-", "");
      const map = { opened_at: "rs.opened_at", status: "rs.status" };
      query += ` ORDER BY ${map[column] || "rs.opened_at"} ${direction}`;
    } else {
      query += ` ORDER BY rs.opened_at DESC`;
    }

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const sessions = rows.map(({ total_count, ...rest }) => rest);

    return { sessions, totalCount };
  }

  // --- RECONCILIATION LOGIC ---
  async getSessionReconciliation(db, session) {
    const { done_by_id, cost_center_id, opened_at, closed_at, tenant_id } =
      session;
 
    const openedAt = new Date(opened_at).toISOString();
    const closedAt = closed_at
      ? new Date(closed_at).toISOString()
      : new Date().toISOString();


    const userParams = [done_by_id, openedAt, closedAt, cost_center_id];

    // --- GROUP 2: Cash/Tenant Specific Params (3 items) ---
    // Used for Cash In / Cash Out (Tenant Wide, no user filter)
    const cashParams = [tenant_id, openedAt, closedAt];

    // 📌 1. Calculate Sales Total
    const salesQuery = `
  SELECT COALESCE(SUM(total_amount), 0) AS sales_total
  FROM sales
    WHERE done_by_id = $1
    AND date BETWEEN $2 AND COALESCE($3, CURRENT_TIMESTAMP)
    AND (cost_center_id = $4 OR $4 IS NULL)
`;

    // 📌 2. Calculate Sale Return Total
    const saleReturnQuery = `
      SELECT COALESCE(SUM(total_refund_amount), 0) AS sale_return_total
      FROM sale_return
      WHERE done_by_id = $1
      AND date BETWEEN $2 AND COALESCE($3, CURRENT_TIMESTAMP)
      AND (cost_center_id = $4 OR $4 IS NULL)
    `;

    // 📌 3. Calculate Purchase Total
    const purchaseQuery = `
      SELECT COALESCE(SUM(total_amount), 0) AS purchase_total
      FROM purchase
      WHERE done_by_id = $1
      AND date BETWEEN $2 AND COALESCE($3, CURRENT_TIMESTAMP)
      AND (cost_center_id = $4 OR $4 IS NULL)
    `;

    // 📌 4. Calculate Purchase Return
    const purchaseReturnQuery = `
      SELECT COALESCE(SUM(total_refund_amount), 0) AS purchase_return_total
      FROM purchase_return
      WHERE done_by_id = $1
      AND date BETWEEN $2 AND COALESCE($3, CURRENT_TIMESTAMP)
      AND (cost_center_id = $4 OR $4 IS NULL)
    `;

    // 📌 5. Cash IN (Tenant Wide)
    const cashInQuery = `
      SELECT COALESCE(SUM(tl.debit), 0) AS cash_in
      FROM transaction_ledger tl
      JOIN transaction t ON t.id = tl.transaction_id
      JOIN account a ON a.id = tl.account_id
      WHERE 
          tl.tenant_id = $1
          AND a.type = 'cash'
          AND t.created_at BETWEEN $2 AND $3
    `;

    // 📌 6. Cash OUT (Tenant Wide)
    const cashOutQuery = `
      SELECT COALESCE(SUM(tl.credit), 0) AS cash_out
      FROM transaction_ledger tl
      JOIN transaction t ON t.id = tl.transaction_id
      JOIN account a ON a.id = tl.account_id
      WHERE 
          tl.tenant_id = $1
          AND a.type = 'cash'
          AND t.created_at BETWEEN $2 AND $3
    `;



    // 📌 9. Current/Closing Balance (CASH) - New Direct Query
    const closingCashBalanceQuery = `
      SELECT COALESCE(SUM(tl.credit-tl.debit), 0) AS closing_cash_balance
      FROM transaction_ledger tl
      JOIN account a ON a.id = tl.account_id
      WHERE 
          tl.tenant_id = $1
          AND tl.created_at <= $2
          AND LOWER(a.type) = 'cash'
    `;

    // 📌 10. Current/Closing Balance (BANK) - New Direct Query
    const closingBankBalanceQuery = `
      SELECT COALESCE(SUM(tl.credit-tl.debit), 0) AS closing_bank_balance
      FROM transaction_ledger tl
      JOIN account a ON a.id = tl.account_id
      WHERE 
          tl.tenant_id = $1
          AND tl.created_at <= $2
          AND LOWER(a.type) = 'bank'
    `;

    // Lists
    const salesListQuery = `
      SELECT id, invoice_number, date, total_amount, status
      FROM sales
      WHERE done_by_id = $1 
      AND date BETWEEN $2 AND $3 
      AND (cost_center_id = $4 OR $4 IS NULL)
      ORDER BY date DESC
    `;
    const saleReturnListQuery = `
      SELECT id, invoice_number, date, total_refund_amount
      FROM sale_return
      WHERE done_by_id = $1 
      AND date BETWEEN $2 AND $3 
      AND (cost_center_id = $4 OR $4 IS NULL)
      ORDER BY date DESC
    `;
    const purchaseListQuery = `
      SELECT id, invoice_number, date, total_amount
      FROM purchase
      WHERE done_by_id = $1 
      AND date BETWEEN $2 AND $3 
      AND (cost_center_id = $4 OR $4 IS NULL)
      ORDER BY date DESC
    `;
    const purchaseReturnListQuery = `
      SELECT id, invoice_number, date, total_refund_amount
      FROM purchase_return
      WHERE done_by_id = $1 
      AND date BETWEEN $2 AND $3 
      AND (cost_center_id = $4 OR $4 IS NULL)
      ORDER BY date DESC
    `;

    const [
      salesRes,
      saleRetRes,
      purchRes,
      purchRetRes,
      cashInRes,
      cashOutRes,
      closingCashRes, 
      closingBankRes,  
      salesList,
      saleRetList,
      purchList,
      purchRetList,
    ] = await Promise.all([
      db.query(salesQuery, userParams),
      db.query(saleReturnQuery, userParams),
      db.query(purchaseQuery, userParams),
      db.query(purchaseReturnQuery, userParams),
      db.query(cashInQuery, cashParams),
      db.query(cashOutQuery, cashParams),
      db.query(closingCashBalanceQuery, [tenant_id, closed_at]), 
      db.query(closingBankBalanceQuery, [tenant_id, closed_at]), 
      db.query(salesListQuery, userParams),
      db.query(saleReturnListQuery, userParams),
      db.query(purchaseListQuery, userParams),
      db.query(purchaseReturnListQuery, userParams),
    ]);

    return {
      stats: {
        sales_total: parseFloat(salesRes.rows[0].sales_total),
        sale_return_total: parseFloat(saleRetRes.rows[0].sale_return_total),
        purchase_total: parseFloat(purchRes.rows[0].purchase_total),
        purchase_return_total: parseFloat(purchRetRes.rows[0].purchase_return_total),
        cash_in: parseFloat(cashInRes.rows[0].cash_in),
        cash_out: parseFloat(cashOutRes.rows[0].cash_out),
        closing_cash_balance: parseFloat(closingCashRes.rows[0].closing_cash_balance),
        closing_bank_balance: parseFloat(closingBankRes.rows[0].closing_bank_balance),
      },
      lists: {
        sales: salesList.rows,
        sale_returns: saleRetList.rows,
        purchases: purchList.rows,
        purchase_returns: purchRetList.rows,
      },
    };
  }
}

module.exports = RegisterSessionsRepository;