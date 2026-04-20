// --- START OF FILE purchaseReturn.repository.js ---

class PurchaseReturnRepository {
  constructor() {}

  async create(db, returnData) {
    const {
      tenant_id,
      purchase_id,
      item_id,
      return_quantity,
      date,
      reason,
      total_refund_amount,
      done_by_id,
      cost_center_id,
      invoice_number,
    } = returnData;

    const { rows } = await db.query(
      `INSERT INTO purchase_return (
        tenant_id, purchase_id, item_id, return_quantity, date,
        reason, total_refund_amount, refunded_amount, status,
        done_by_id, cost_center_id, invoice_number
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'pending', $8, $9, $10)
       RETURNING *`,
      [
        tenant_id,
        purchase_id,
        item_id,
        return_quantity,
        date || new Date(),
        reason,
        total_refund_amount,
        done_by_id,
        cost_center_id,
        invoice_number,
      ]
    );
    return rows[0];
  }

  async update(db, id, tenantId, returnData) {
    const {
      return_quantity,
      date,
      reason,
      total_refund_amount,
      done_by_id,
      cost_center_id,
      invoice_number,
    } = returnData;

    const { rows } = await db.query(
      `UPDATE purchase_return
       SET return_quantity = $1, date = $2, reason = $3, total_refund_amount = $4,
           done_by_id = $5, cost_center_id = $6, invoice_number = $7
       WHERE id = $8 AND tenant_id = $9
       RETURNING *`,
      [
        return_quantity,
        date,
        reason,
        total_refund_amount,
        done_by_id,
        cost_center_id,
        invoice_number,
        id,
        tenantId,
      ]
    );
    return rows[0];
  }

  async getById(db, id, tenantId) {
    const query = `
      SELECT
        pr.*,
        i.name as item_name,
        i.sku as item_sku,
        pa.name as party_name,
        pa.ledger_id as party_ledger_id,
        db.name as done_by_name,
        cc.name as cost_center_name,
        (pr.total_refund_amount - pr.refunded_amount) as balance,
        (
          SELECT json_agg(v_agg)
          FROM (
            SELECT
              v.to_ledger_id as account_id, -- For PR, money goes TO the store account
              l.name as account_name,
              vt.received_amount as amount,
              v.mode_of_payment_id,
              v.voucher_no,
              v.date as payment_date
            FROM voucher_transactions vt
            JOIN voucher v ON vt.voucher_id = v.id
            JOIN ledger l ON v.to_ledger_id = l.id
            WHERE vt.invoice_id::integer = pr.id
              AND vt.invoice_type = 'PURCHASERETURN'
              AND v.tenant_id = $2
          ) as v_agg
        ) as payment_methods
      FROM purchase_return pr
      LEFT JOIN item i ON pr.item_id = i.id
      LEFT JOIN purchase p ON pr.purchase_id = p.id
      LEFT JOIN party pa ON p.party_id = pa.id
      LEFT JOIN "done_by" db ON pr.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON pr.cost_center_id = cc.id
      WHERE pr.id = $1 AND pr.tenant_id = $2;
    `;
    const { rows } = await db.query(query, [id, tenantId]);
    return rows[0];
  }

  async delete(db, id, tenantId) {
    const { rows } = await db.query(
      "DELETE FROM purchase_return WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId]
    );
    return rows[0];
  }

  async getAllByUserId(db, tenantId, filters = {}) {
    const { sort, party_id, payment_due_only, ids } = filters;
    let query = `
      SELECT
        pr.*,
        i.name as item_name,
        pa.name as party_name,
        (pr.total_refund_amount - pr.refunded_amount) as balance
      FROM purchase_return pr
      LEFT JOIN item i ON pr.item_id = i.id
      LEFT JOIN purchase p ON pr.purchase_id = p.id
      LEFT JOIN party pa ON p.party_id = pa.id
      WHERE pr.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (party_id) { query += ` AND p.party_id = $${paramIndex++}`; params.push(party_id); }
    if (payment_due_only) { query += ` AND pr.total_refund_amount > pr.refunded_amount`; }
    if (ids) {
        const idArray = Array.isArray(ids) ? ids : ids.split(',').map(id => parseInt(id.trim()));
        query += ` AND pr.id = ANY($${paramIndex++})`;
        params.push(idArray);
    }

    query += " ORDER BY pr.date DESC, pr.id DESC";
    const { rows } = await db.query(query, params);
    return rows;
  }

  async getPaginatedUserId(db, tenantId, filters = {}) {
    const {
      page = 1, page_size = 10, sort, searchType, searchKey, start_date, end_date,
      item_id, party_id, done_by_id, cost_center_id, status
    } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const fromAndJoins = `
      FROM purchase_return pr
      LEFT JOIN item i ON pr.item_id = i.id
      LEFT JOIN purchase p ON pr.purchase_id = p.id
      LEFT JOIN party pa ON p.party_id = pa.id
      LEFT JOIN "done_by" db ON pr.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON pr.cost_center_id = cc.id
    `;

    let whereClause = ` WHERE pr.tenant_id = $1 `;
    const params = [tenantId];
    let paramIndex = 2;

    if (searchKey && searchType) {
        const searchConfig = {
            item_name: "i.name",
            party_name: "pa.name",
            purchase_id: "pr.purchase_id::text",
            reason: "pr.reason",
            status: "pr.status",
            cost_center_name: "cc.name",
        };
        if (searchConfig[searchType]) {
            whereClause += ` AND ${searchConfig[searchType]} ILIKE $${paramIndex++}`;
            params.push(`%${searchKey}%`);
        }
    }
    if (start_date) { whereClause += ` AND pr.date >= $${paramIndex++}`; params.push(start_date); }
    if (end_date) { whereClause += ` AND pr.date <= $${paramIndex++}`; params.push(end_date); }
    if (item_id) { whereClause += ` AND pr.item_id = $${paramIndex++}`; params.push(item_id); }
    if (party_id) { whereClause += ` AND p.party_id = $${paramIndex++}`; params.push(party_id); }
    if (done_by_id) { whereClause += ` AND pr.done_by_id = $${paramIndex++}`; params.push(done_by_id); }
    if (cost_center_id) { whereClause += ` AND pr.cost_center_id = $${paramIndex++}`; params.push(cost_center_id); }
    if (status) { whereClause += ` AND pr.status = $${paramIndex++}`; params.push(status); }

    const aggregationQuery = `
        SELECT
            COALESCE(SUM(pr.total_refund_amount), 0) as total_refund_amount,
            COALESCE(SUM(pr.refunded_amount), 0) as total_refunded_amount
        ${fromAndJoins}
        ${whereClause}
    `;
    const aggregationParams = [...params];

    let mainQuery = `
      SELECT
        pr.*, i.name as item_name, pa.name as party_name,
        db.name as done_by_name, cc.name as cost_center_name,
        COUNT(*) OVER() as total_count,
        (pr.total_refund_amount - pr.refunded_amount) as balance
      ${fromAndJoins}
      ${whereClause}
    `;

    const allowedSortColumns = {
        date: "pr.date",
        party_name: "pa.name",
        item_name: "i.name",
        done_by: "db.name",
        cost_center: "cc.name",
        return_quantity: "pr.return_quantity",
        status: "pr.status",
        total_refund_amount: "pr.total_refund_amount",
    };

    if (sort) {
        const direction = sort.startsWith("-") ? "DESC" : "ASC";
        const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
        if (allowedSortColumns[columnKey]) {
            mainQuery += ` ORDER BY ${allowedSortColumns[columnKey]} ${direction}, pr.id DESC`;
        }
    } else {
        mainQuery += " ORDER BY pr.date DESC, pr.id DESC";
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
    const purchaseReturns = rows.map(({ total_count, ...rest }) => rest);

    return {
        purchaseReturns,
        totalCount,
        total_refund_amount: parseFloat(aggregationData.total_refund_amount),
        total_refunded_amount: parseFloat(aggregationData.total_refunded_amount),
    };
  }

  async updatePaymentAndStatus(client, id, amountChange) {
    const query = `
    UPDATE purchase_return
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
    if (rows.length === 0) throw new Error(`Purchase Return ID ${id} not found.`);
    return rows[0];
  }
}

module.exports = PurchaseReturnRepository;