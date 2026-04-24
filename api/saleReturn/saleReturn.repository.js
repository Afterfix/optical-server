class SaleReturnRepository {
  constructor() {}

  async create(dbClient, returnData) {
    const {
      tenant_id,
      sale_id,
      item_id,
      return_quantity,
      date,
      reason,
      total_refund_amount,
      done_by_id,
      cost_center_id,
      invoice_number,
    } = returnData;

     ` INSERT INTO sale_return(
        tenant_id, sale_id, item_id,
        return_quantity, date, reason, total_refund_amount, refunded_amount,
        status, done_by_id, cost_center_id, invoice_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'pending', $8, $9, $10)
      RETURNING *`;

    const { rows } = await dbClient.query(insertReturnQuery, [
      tenant_id,
      sale_id,
      item_id,
      return_quantity,
      date || new Date(),
      reason,
      total_refund_amount,
      done_by_id,
      cost_center_id,
      invoice_number,
    ]);
    return rows[0];
  }

  async update(dbClient, id, tenantId, returnData) {
    const {
      return_quantity,
      date,
      reason,
      total_refund_amount,
      done_by_id,
      cost_center_id,
      invoice_number,
    } = returnData;

    const updateReturnQuery = `
      UPDATE sale_return
      SET return_quantity = $1, date = $2, reason = $3, total_refund_amount = $4,
          done_by_id = $5, cost_center_id = $6, invoice_number = $7
      WHERE id = $8 AND tenant_id = $9
      RETURNING *`;

    const { rows } = await dbClient.query(updateReturnQuery, [
      return_quantity,
      date,
      reason,
      total_refund_amount,
      done_by_id,
      cost_center_id,
      invoice_number,
      id,
      tenantId,
    ]);
    return rows[0];
  }

  async getById(db, id, tenantId) {
    const query = `
      SELECT
          sr.*,
          s.party_id,
          p.ledger_id as party_ledger_id,
          p.name as party_name,
          i.name as item_name,
          i.sku as item_sku,
          (sr.total_refund_amount - sr.refunded_amount) as balance,
          (
            SELECT json_agg(v_agg)
            FROM (
              SELECT
                  v.id as voucher_id,
                v.from_ledger_id as account_id,
                l.name as account_name,
                vt.received_amount as amount,
                v.mode_of_payment_id,
                v.voucher_no,
                v.date as payment_date
              FROM voucher_transactions vt
              JOIN voucher v ON vt.voucher_id = v.id
              JOIN ledger l ON v.from_ledger_id = l.id
              WHERE vt.invoice_id::integer = sr.id
                AND vt.invoice_type = 'SALERETURN'
                AND v.tenant_id = $2
            ) as v_agg
          ) as payment_methods
      FROM sale_return sr
      LEFT JOIN sales s ON sr.sale_id = s.id
      LEFT JOIN party p ON s.party_id = p.id
      LEFT JOIN item i ON sr.item_id = i.id
      WHERE sr.id = $1 AND sr.tenant_id = $2
    `;
    const { rows } = await db.query(query, [id, tenantId]);
    return rows[0];
  }

  async delete(dbClient, id, tenantId) {
    const { rows } = await dbClient.query(
      "DELETE FROM sale_return WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId]
    );
    return rows[0];
  }

  async getPaginatedByUserId(db, tenantId, filters = {}) {
    const {
      page = 1,
      page_size = 10,
      sort,
      searchType,
      searchKey,
      start_date,
      end_date,
      item_id,
      party_id,
      done_by_id,
      cost_center_id,
      status, 
      payment_due_only,
    } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const fromAndJoins = `
        FROM sale_return sr
        LEFT JOIN item i ON sr.item_id = i.id
        LEFT JOIN sales s ON sr.sale_id = s.id
        LEFT JOIN party pa ON s.party_id = pa.id
        LEFT JOIN "done_by" db ON sr.done_by_id = db.id
        LEFT JOIN "cost_center" cc ON sr.cost_center_id = cc.id
    `;

    let whereClause = ` WHERE sr.tenant_id = $1 `;
    const params = [tenantId];
    let paramIndex = 2;

    if (searchKey && searchType) {
      const searchConfig = {
        item_name: "i.name",
        party_name: "pa.name",
        invoice_number: "sr.invoice_number",
        reason: "sr.reason",
        done_by_name: "db.name",
        cost_center_name: "cc.name",
      };
      if (searchConfig[searchType]) {
        whereClause += ` AND ${searchConfig[searchType]} ILIKE $${paramIndex++}`;
        params.push(`%${searchKey}%`);
      }
    }

    if (start_date) {
      whereClause += ` AND sr.date >= $${paramIndex++}`;
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ` AND sr.date <= $${paramIndex++}`;
      params.push(end_date);
    }
    if (item_id) {
      whereClause += ` AND sr.item_id = $${paramIndex++}`;
      params.push(item_id);
    }
    if (party_id) {
      whereClause += ` AND s.party_id = $${paramIndex++}`;
      params.push(party_id);
    }
    if (done_by_id) {
      whereClause += ` AND sr.done_by_id = $${paramIndex++}`;
      params.push(done_by_id);
    }
    if (cost_center_id) {
      whereClause += ` AND sr.cost_center_id = $${paramIndex++}`;
      params.push(cost_center_id);
    }
    if (status) {
      whereClause += ` AND sr.status = $${paramIndex++}`;
      params.push(status);
    }
    if (payment_due_only) {
      whereClause += ` AND sr.total_refund_amount > sr.refunded_amount`;
    }

    const aggregationQuery = `
        SELECT
            COALESCE(SUM(sr.total_refund_amount), 0) as total_refund_amount,
            COALESCE(SUM(sr.refunded_amount), 0) as total_refunded_amount
        ${fromAndJoins}
        ${whereClause}
    `;
    const aggregationParams = [...params];

    let mainQuery = `
        SELECT
          sr.id,
          sr.sale_id,
          sr.item_id,
          sr.return_quantity,
          sr.total_refund_amount,
          sr.refunded_amount,
          (sr.total_refund_amount - sr.refunded_amount) as balance,
          sr.status,
          sr.date,
          sr.invoice_number,
          sr.reason,
          i.name as item_name,
          i.sku as item_sku,
          pa.name as party_name,
          db.name as done_by_name,
          cc.name as cost_center_name,
          COUNT(*) OVER() as total_count
        ${fromAndJoins}
        ${whereClause}
    `;

    const allowedSortColumns = {
      date: "sr.date",
      item_name: "i.name",

      party_name: "pa.name",
      return_quantity: "sr.return_quantity",
      total_refund_amount: "sr.total_refund_amount",
      done_by: "db.name",
      cost_center: "cc.name",
    };

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) {
        mainQuery += ` ORDER BY ${dbColumn} ${direction}, sr.id DESC`;
      } else {
        mainQuery += " ORDER BY sr.date DESC, sr.id DESC";
      }
    } else {
      mainQuery += " ORDER BY sr.date DESC, sr.id DESC";
    }

    mainQuery += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const [mainResult, aggregationResult] = await Promise.all([
      db.query(mainQuery, params),
      db.query(aggregationQuery, aggregationParams),
    ]);

    const { rows } = mainResult;
    const aggregationData = aggregationResult.rows[0];

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const saleReturns = rows.map(({ total_count, ...rest }) => rest);

    const page_count = Math.ceil(totalCount / limit);

    return {
      data: saleReturns,
      count: totalCount,
      page_count,
      total_refund_amount: parseFloat(aggregationData.total_refund_amount),
      total_refunded_amount: parseFloat(aggregationData.total_refunded_amount),
    };
  }

  async getAllByUserId(db, tenantId, filters) {
    const { party_id, payment_due_only, ids } = filters || {};
    let query = `
            SELECT sr.*, s.party_id, (sr.total_refund_amount - sr.refunded_amount) as balance
            FROM sale_return sr
            LEFT JOIN sales s ON sr.sale_id = s.id
            WHERE sr.tenant_id = $1
        `;
    const params = [tenantId];
    let paramIndex = 2;
    if (party_id) {
      query += ` AND s.party_id = $${paramIndex++}`;
      params.push(party_id);
    }
    if (payment_due_only) {
      query += ` AND sr.total_refund_amount > sr.refunded_amount`;
    }
    if (ids) {
      const idArray = Array.isArray(ids)
        ? ids
        : ids.split(",").map((id) => parseInt(id.trim()));
      query += ` AND sr.id = ANY($${paramIndex++})`;
      params.push(idArray);
    }
    query += ` ORDER BY sr.date DESC`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  async updatePaymentAndStatus(client, id, amountChange) {
    const query = `
    UPDATE sale_return
    SET
        refunded_amount = ROUND((refunded_amount + $1)::numeric, 2),
        status = CASE
            WHEN ROUND((refunded_amount + $1)::numeric, 2) >= total_refund_amount THEN 'refunded'
            WHEN ROUND((refunded_amount + $1)::numeric, 2) > 0 THEN 'partial'
            ELSE 'pending'
        END
    WHERE id = $2
    RETURNING id, status;
  `;
    const { rows } = await client.query(query, [amountChange, id]);
    if (rows.length === 0)
      throw new Error(`Sale Return with ID ${id} not found.`);
    return rows[0];
  }
}

module.exports = SaleReturnRepository;