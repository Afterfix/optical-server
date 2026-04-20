const PurchaseItemRepository = require("../purchaseItem/purchaseItem.repository");
// Removed TransactionPaymentsRepository

class PurchaseRepository {
  constructor() {
    this.purchaseItemRepository = new PurchaseItemRepository();
  }

  async create(db, purchaseData, items) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const {
        tenant_id,
        party_id,
        done_by_id,
        cost_center_id,
        total_amount,
        discount,
        date,
        invoice_number,
      } = purchaseData;

      const initialPaid = 0;
      const initialStatus = "unpaid";

      const insertPurchaseQuery = `
        INSERT INTO purchase(tenant_id, party_id, done_by_id, cost_center_id, total_amount, paid_amount, discount, date, invoice_number, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `;
      const purchaseResult = await client.query(insertPurchaseQuery, [
        tenant_id,
        party_id,
        done_by_id,
        cost_center_id,
        total_amount,
        initialPaid,
        discount,
        date,
        invoice_number,
        initialStatus,
      ]);
      const newPurchase = purchaseResult.rows[0];

      await this.purchaseItemRepository.createMany(
        client,
        newPurchase.id,
        items,
        tenant_id,
      );

      await client.query("COMMIT");
      return this.getById(db, newPurchase.id, tenant_id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async update(db, id, tenantId, purchaseData, items) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const {
        party_id,
        done_by_id,
        cost_center_id,
        total_amount,
        discount,
        date,
        invoice_number,
      } = purchaseData;

      const updatePurchaseQuery = `
        UPDATE purchase
        SET party_id = $1, total_amount = $2,
            discount = $3, date = $4, done_by_id = $5, cost_center_id = $6, invoice_number = $7
        WHERE id = $8 AND tenant_id = $9;
      `;
      await client.query(updatePurchaseQuery, [
        party_id,
        total_amount,
        discount,
        date,
        done_by_id,
        cost_center_id,
        invoice_number,
        id,
        tenantId,
      ]);

      await this.purchaseItemRepository.deleteByPurchaseId(client, id);
      await this.purchaseItemRepository.createMany(client, id, items, tenantId);

      await client.query("COMMIT");
      return this.getById(db, id, tenantId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getById(db, id, tenantId) {
    const { rows } = await db.query(
      `SELECT 
         p.*, 
         pa.name as party_name,
         pa.ledger_id as party_ledger_id, -- <<< FETCH LEDGER ID FROM PARTY
         db.name as done_by_name,
         cc.name as cost_center_name,
         (
           SELECT json_agg(pi_agg)
           FROM (
             SELECT
               pi.id,
               pi.item_id,
               i.name as item_name,
               i.tax as item_tax,
               pi.quantity,
               pi.unit_price,
               pi.total_price
             FROM purchase_item pi
             JOIN item i ON pi.item_id = i.id
             WHERE pi.purchase_id = p.id
           ) as pi_agg
         ) as items,
         (
          SELECT json_agg(payment_agg)
          FROM (
            SELECT
              v.id as voucher_id, -- Make sure this is selected!
              v.from_ledger_id as account_id,
              l.name as account_name,
              vt.received_amount as amount,
              v.mode_of_payment_id,
              v.voucher_no,
              v.date as payment_date
            FROM voucher_transactions vt
            JOIN voucher v ON vt.voucher_id = v.id
            JOIN ledger l ON v.from_ledger_id = l.id
            WHERE vt.invoice_id::integer = p.id 
              AND vt.invoice_type = 'PURCHASE'
              AND v.tenant_id = $2
          ) as payment_agg
        ) as payment_methods
       FROM purchase p
       LEFT JOIN party pa ON p.party_id = pa.id
       LEFT JOIN "done_by" db ON p.done_by_id = db.id
       LEFT JOIN "cost_center" cc ON p.cost_center_id = cc.id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [id, tenantId],
    );
    return rows[0];
  }

  async delete(db, id, tenantId) {
    const { rows } = await db.query(
      "DELETE FROM purchase WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId],
    );
    return rows[0];
  }

  async getByUserId(db, tenantId, filters = {}) {
    const { sort, searchType, searchKey, ids, ...otherFilters } = filters; // <<< MODIFIED: ADD ids
    const statusColumn = `p.status`;

    let query = `
            SELECT 
                p.*, 
                pa.name as party_name,
                pa.ledger_id as party_ledger_id, -- <<< FETCH LEDGER ID FROM PARTY
                db.name as done_by_name,
                cc.name as cost_center_name,
                (
                  SELECT json_agg(payment_agg)
                  FROM (
                    SELECT
                      v.from_ledger_id as account_id,
                      l.name as account_name,
                      vt.received_amount as amount,
                      v.mode_of_payment_id
                    FROM voucher_transactions vt
                    JOIN voucher v ON vt.voucher_id = v.id
                    JOIN ledger l ON v.from_ledger_id = l.id
                    WHERE vt.invoice_id::integer = p.id 
                      AND vt.invoice_type = 'PURCHASE'
                  ) as payment_agg
                ) as payment_methods
            FROM purchase p
            LEFT JOIN party pa ON p.party_id = pa.id 
            LEFT JOIN "done_by" db ON p.done_by_id = db.id
            LEFT JOIN "cost_center" cc ON p.cost_center_id = cc.id
            WHERE p.tenant_id = $1
        `;
    const params = [tenantId];
    let paramIndex = 2;

    const filterConfig = {
      party_id: { operator: "=", column: "p.party_id" },
      done_by_id: { operator: "=", column: "p.done_by_id" },
      cost_center_id: { operator: "=", column: "p.cost_center_id" },
      total_amount: { operator: "=", column: "p.total_amount" },
      paid_amount: { operator: "=", column: "p.paid_amount" },
      due_amount: { operator: "=", column: "(p.total_amount - p.paid_amount)" },
      start_date: { operator: ">=", column: "p.date" },
      end_date: { operator: "<=", column: "p.date" },
      invoice_number: { operator: "=", column: "p.invoice_number" },
      account_id: {},
      status: { operator: "=", column: statusColumn },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== "" &&
        filterConfig[key]
      ) {
        if (key === "account_id") {
          query += ` AND EXISTS (
            SELECT 1 FROM voucher_transactions vt
            JOIN voucher v ON vt.voucher_id = v.id
            WHERE vt.invoice_id::integer = p.id 
            AND vt.invoice_type = 'PURCHASE' 
            AND v.from_ledger_id = $${paramIndex}
          )`;
          params.push(otherFilters[key]);
          paramIndex++;
        } else if (key === "status") {
          const statuses = otherFilters[key]
            .split(",")
            .map((s) => s.trim().toLowerCase());
          query += ` AND ${filterConfig.status.column} = ANY($${paramIndex++})`;
          params.push(statuses);
        } else {
          const { operator, column } = filterConfig[key];
          query += ` AND ${column} ${operator} $${paramIndex++}`;
          params.push(otherFilters[key]);
        }
      }
    });

    // Logic for the 'ids' filter <<< NEW LOGIC
    if (ids) {
      let idArray = [];
      if (Array.isArray(ids)) {
        idArray = ids.map((id) => parseInt(id)).filter((id) => !isNaN(id));
      } else if (typeof ids === "string") {
        idArray = ids
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id));
      }

      if (idArray.length > 0) {
        query += ` AND p.id = ANY($${paramIndex++})`;
        params.push(idArray);
      }
    }

    if (searchType && searchKey != null && searchKey !== "") {
      const searchConfig = {
        party_name: { operator: "ILIKE", column: "pa.name" },
        total_amount: { operator: "=", column: "p.total_amount" },
        invoice_number: { operator: "ILIKE", column: "p.invoice_number" },
        status: { operator: "ILIKE", column: statusColumn },
      };
      if (searchConfig[searchType]) {
        const { operator, column } = searchConfig[searchType];
        const value = operator === "ILIKE" ? `%${searchKey}%` : searchKey;
        query += ` AND ${column} ${operator} $${paramIndex++}`;
        params.push(value);
      }
    }

    query += " ORDER BY p.date DESC, p.id DESC";

    const { rows } = await db.query(query, params);
    return rows;
  }

  async updatePaymentAndStatus(client, id, amountChange) {
    const query = `
      UPDATE purchase
      SET
          paid_amount = paid_amount + $1,
          status = CASE
              WHEN (paid_amount + $1) >= total_amount THEN 'paid'
              WHEN (paid_amount + $1) > 0 THEN 'partial'
              ELSE 'unpaid'
          END
      WHERE id = $2
      RETURNING id, paid_amount, total_amount, status;
    `;
    const { rows } = await client.query(query, [amountChange, id]);
    if (rows.length === 0) {
      throw new Error(`Purchase with ID ${id} not found for payment update.`);
    }
    return rows[0];
  }

  async getPaginatedByUserId(db, tenantId, filters = {}) {
    const {
      page = 1,
      page_size = 10,
      sort,
      searchType,
      searchKey,
      ...otherFilters
    } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const fromAndJoins = `
        FROM purchase p
        LEFT JOIN party pa ON p.party_id = pa.id 
        LEFT JOIN "done_by" db ON p.done_by_id = db.id
        LEFT JOIN "cost_center" cc ON p.cost_center_id = cc.id
    `;
    let whereClause = ` WHERE p.tenant_id = $1 `;
    const params = [tenantId];
    let paramIndex = 2;

    const statusColumn = `p.status`;

    const filterConfig = {
      party_id: { operator: "=", column: "p.party_id" },
      done_by_id: { operator: "=", column: "p.done_by_id" },
      cost_center_id: { operator: "=", column: "p.cost_center_id" },
      total_amount: { operator: "=", column: "p.total_amount" },
      paid_amount: { operator: "=", column: "p.paid_amount" },
      due_amount: { operator: "=", column: "(p.total_amount - p.paid_amount)" },
      start_date: { operator: ">=", column: "p.date" },
      end_date: { operator: "<=", column: "p.date" },
      invoice_number: { operator: "=", column: "p.invoice_number" },
      account_id: {},
      status: { operator: "=", column: statusColumn },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== "" &&
        filterConfig[key]
      ) {
        if (key === "account_id") {
          whereClause += ` AND EXISTS (
            SELECT 1 FROM voucher_transactions vt
            JOIN voucher v ON vt.voucher_id = v.id
            WHERE vt.invoice_id::integer = p.id 
            AND vt.invoice_type = 'PURCHASE' 
            AND v.from_ledger_id = $${paramIndex}
          )`;
          params.push(otherFilters[key]);
          paramIndex++;
        } else if (key === "status") {
          const statuses = otherFilters[key]
            .split(",")
            .map((s) => s.trim().toLowerCase());
          whereClause += ` AND ${
            filterConfig.status.column
          } = ANY($${paramIndex++})`;
          params.push(statuses);
        } else {
          const { operator, column, isString } = filterConfig[key];
          let value = otherFilters[key];
          if (isString) value = `%${value}%`;
          whereClause += ` AND ${column} ${operator} $${paramIndex++}`;
          params.push(value);
        }
      }
    });

    if (searchType && searchKey != null && searchKey !== "") {
      const searchConfig = {
        party_name: { operator: "ILIKE", column: "pa.name" },
        total_amount: { operator: "=", column: "p.total_amount" },
        invoice_number: { operator: "ILIKE", column: "p.invoice_number" },
        status: { operator: "ILIKE", column: statusColumn },
      };
      if (searchConfig[searchType]) {
        const { operator, column } = searchConfig[searchType];
        const value = operator === "ILIKE" ? `%${searchKey}%` : searchKey;
        whereClause += ` AND ${column} ${operator} $${paramIndex++}`;
        params.push(value);
      }
    }

    const aggregationQuery = `
      SELECT
          COALESCE(SUM(p.total_amount), 0) as total_amount,
          COALESCE(SUM(p.paid_amount), 0) as paid_amount
      ${fromAndJoins}
      ${whereClause}
    `;

    let mainQuery = `
      SELECT 
          p.*, 
          pa.name as party_name,
          pa.ledger_id as party_ledger_id, -- <<< FETCH LEDGER ID FROM PARTY
          db.name as done_by_name,
          cc.name as cost_center_name,
          COUNT(*) OVER() AS total_count,
          (
            SELECT json_agg(payment_agg)
            FROM (
              SELECT
                v.from_ledger_id as account_id,
                l.name as account_name,
                vt.received_amount as amount,
                v.mode_of_payment_id
              FROM voucher_transactions vt
              JOIN voucher v ON vt.voucher_id = v.id
              JOIN ledger l ON v.from_ledger_id = l.id
              WHERE vt.invoice_id::integer = p.id AND vt.invoice_type = 'PURCHASE'
            ) as payment_agg
          ) as payment_methods
      ${fromAndJoins}
      ${whereClause}
    `;

    const allowedSortColumns = {
      party_name: "pa.name",
      date: "p.date",
      total_amount: "p.total_amount",
      discount: "p.discount",
      paid_amount: "p.paid_amount",
      due_amount: "(p.total_amount - p.paid_amount)",
      done_by: "db.name",
      cost_center: "cc.name",
      invoice_number: "p.invoice_number",
      status: statusColumn,
    };
    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.substring(sort.startsWith("-") ? 1 : 0);
      if (allowedSortColumns[columnKey]) {
        mainQuery += ` ORDER BY ${allowedSortColumns[columnKey]} ${direction}, p.id DESC`;
      } else {
        mainQuery += " ORDER BY p.date DESC, p.id DESC";
      }
    } else {
      mainQuery += " ORDER BY p.date DESC, p.id DESC";
    }

    mainQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const mainQueryParams = [...params, limit, offset];

    const [mainResult, aggregationResult] = await Promise.all([
      db.query(mainQuery, mainQueryParams),
      db.query(aggregationQuery, params),
    ]);

    const { rows } = mainResult;
    const aggregationData = aggregationResult.rows[0];

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const purchases = rows.map(({ total_count, ...rest }) => rest);

    return {
      purchases,
      totalCount,
      total_amount: aggregationData.total_amount,
      paid_amount: aggregationData.paid_amount,
    };
  }

  async decreaseItemQuantity(db, purchaseId, itemId, quantityToDecrease) {
    const query = `UPDATE purchase_item SET quantity = quantity - $1 WHERE purchase_id = $2 AND item_id = $3 AND quantity >= $1 RETURNING id;`;
    const { rows } = await db.query(query, [
      quantityToDecrease,
      purchaseId,
      itemId,
    ]);
    if (rows.length === 0)
      throw new Error("Return failed. Quantity too high or item not found.");
    return rows[0];
  }

  async increaseItemQuantity(db, purchaseId, itemId, quantityToIncrease) {
    const query = `UPDATE purchase_item SET quantity = quantity + $1 WHERE purchase_id = $2 AND item_id = $3 RETURNING id;`;
    const { rows } = await db.query(query, [
      quantityToIncrease,
      purchaseId,
      itemId,
    ]);
    if (rows.length === 0) throw new Error("Failed to restore item quantity.");
    return rows[0];
  }

  async decreasePurchaseTotals(db, purchaseId, amountToDecrease) {
    const query = `UPDATE purchase SET total_amount = total_amount - $1 WHERE id = $2 RETURNING id;`;
    const { rows } = await db.query(query, [amountToDecrease, purchaseId]);
    if (rows.length === 0) throw new Error("Failed to update purchase totals.");
    return rows[0];
  }
}

module.exports = PurchaseRepository;
