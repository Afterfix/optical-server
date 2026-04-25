
const SalesItemRepository = require('../saleItem/saleItem.repository')

class SalesRepository {
  constructor() {
    this.salesItemRepository = new SalesItemRepository()
  }

  async getByUserId(db, tenantId, filters = {}) {
    const { sort, searchType, searchKey, ids, ...otherFilters } = filters

    // payment_status column
    const paymentStatusColumn = 's.payment_status';

    let query = `
            SELECT 
                s.*,
                p.name as party_name,
                p.ledger_id as party_ledger_id, -- Fetch Ledger ID
                db.name as done_by_name,      
                db.name as done_by,           -- Alias for frontend mapping
                cc.name as cost_center_name,
                cc.name as cost_center,        -- Alias for frontend mapping
                (s.total_amount - s.paid_amount) as balance, -- Calculated balance
                (
                  SELECT string_agg(DISTINCT l.name, ', ')
                  FROM voucher_transactions vt
                  JOIN voucher v ON vt.voucher_id = v.id
                  JOIN ledger l ON v.to_ledger_id = l.id
                  WHERE vt.invoice_id::integer = s.id 
                    AND vt.invoice_type = 'SALE'
                ) as account,
                (
                  SELECT json_agg(sp_agg)
                  FROM (
                    SELECT
                      v.id as voucher_id, -- <<< ADDED VOUCHER ID HERE
                      v.to_ledger_id as account_id, -- For Sales, money goes TO the account
                      l.name as account_name,
                      vt.received_amount as amount,
                      v.mode_of_payment_id
                    FROM voucher_transactions vt
                    JOIN voucher v ON vt.voucher_id = v.id
                    JOIN ledger l ON v.to_ledger_id = l.id
                    WHERE vt.invoice_id::integer = s.id 
                      AND vt.invoice_type = 'SALE'
                  ) as sp_agg
                ) as payment_methods
            FROM sales s
            JOIN party p ON s.party_id = p.id 
            LEFT JOIN "done_by" db ON s.done_by_id = db.id
            LEFT JOIN "cost_center" cc ON s.cost_center_id = cc.id
            WHERE s.tenant_id = $1
        `
    const params = [tenantId]
    let paramIndex = 2

    const filterConfig = {
      payment_status: { operator: '=', column: 's.payment_status' },
      party_id: { operator: '=', column: 's.party_id' },
      done_by_id: { operator: '=', column: 's.done_by_id' },
      cost_center_id: { operator: '=', column: 's.cost_center_id' },
      min_total_amount: { operator: '>=', column: 's.total_amount' },
      max_total_amount: { operator: '<=', column: 's.total_amount' },
      min_paid_amount: { operator: '>=', column: 's.paid_amount' },
      max_paid_amount: { operator: '<=', column: 's.paid_amount' },
      start_date: { operator: '>=', column: 's.order_date' },
      end_date: { operator: '<=', column: 's.order_date' },
      party_name: { operator: 'ILIKE', column: 'p.name', isString: true },
      total_amount: { operator: '=', column: 's.total_amount' },
      paid_amount: { operator: '=', column: 's.paid_amount' },
      balance: { operator: '=', column: '(s.total_amount - s.paid_amount)' },
      invoice_number: { operator: '=', column: 's.invoice_number' },
      account_id: {},
    }

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== '' &&
        filterConfig[key]
      ) {
        if (key === 'account_id') {
          query += ` AND EXISTS (
            SELECT 1 FROM voucher_transactions vt
            JOIN voucher v ON vt.voucher_id = v.id
            WHERE vt.invoice_id::integer = s.id 
            AND vt.invoice_type = 'SALE' 
            AND v.to_ledger_id = $${paramIndex++}
          )`
          params.push(otherFilters[key])
        } else if (key === 'payment_status' && typeof otherFilters[key] === 'string' && otherFilters[key].includes(',')) {
          const statuses = otherFilters[key].split(',').map(s => s.trim());
          query += ` AND s.payment_status = ANY($${paramIndex++})`
          params.push(statuses)
        } else {
          const { operator, column, isString } = filterConfig[key]
          let value = otherFilters[key]
          if (isString) {
            value = `%${value}%`
          }
          query += ` AND ${column} ${operator} $${paramIndex++}`
          params.push(value)
        }
      }
    })

    if (ids) {
      let idArray = [];
      if (Array.isArray(ids)) {
        idArray = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
      } else if (typeof ids === 'string') {
        idArray = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      }

      if (idArray.length > 0) {
        query += ` AND s.id = ANY($${paramIndex++})`;
        params.push(idArray);
      }
    }


    const searchConfig = {
      party_name: { operator: 'ILIKE', column: 'p.name' },
      payment_status: { operator: 'ILIKE', column: 's.payment_status' },
      total_amount: { operator: '=', column: 's.total_amount' },
      invoice_number: { operator: 'ILIKE', column: 's.invoice_number' },
      done_by_name: { operator: 'ILIKE', column: 'db.name' },
      cost_center_name: { operator: 'ILIKE', column: 'cc.name' },
    }

    if (searchType && searchKey != null && searchKey !== '') {
      if (searchConfig[searchType]) {
        const { operator, column } = searchConfig[searchType]
        let value = operator === 'ILIKE' ? `%${searchKey}%` : searchKey
        query += ` AND ${column} ${operator} $${paramIndex}`
        params.push(value)
        paramIndex++
      }
    }

    const allowedSortColumns = {
      // Map 'date' (frontend key) to 's.order_date' (DB column)
      date: 's.order_date',
      order_date: 's.order_date',

      // Existing mappings
      total_amount: 's.total_amount',
      party_name: 'p.name',
      payment_status: 's.payment_status',
      done_by: 'db.name',
      cost_center: 'cc.name',
      invoice_number: 's.invoice_number',

      // ADD THESE MISSING FIELDS:
      paid_amount: 's.paid_amount',
      // You can sort by calculated columns using the expression
      balance: '(s.total_amount - s.paid_amount)'
    }

    if (sort) {
      const direction = sort.startsWith('-') ? 'DESC' : 'ASC'
      const columnKey = sort.startsWith('-') ? sort.substring(1) : sort
      const dbColumn = allowedSortColumns[columnKey]
      if (dbColumn) {
        query += ` ORDER BY ${dbColumn} ${direction}, s.id DESC`
      } else {
        query += ' ORDER BY s.order_date DESC, s.id DESC'
      }
    } else {
      query += ' ORDER BY s.order_date DESC, s.id DESC'
    }

    const { rows } = await db.query(query, params)
    return rows
  }

  async getPaginatedBytenantId(db, tenantId, filters = {}) {
    const {
      page = 1,
      page_size = 10,
      sort,
      searchType,
      searchKey,
      ...otherFilters
    } = filters
    const limit = parseInt(page_size, 10)
    const offset = (parseInt(page, 10) - 1) * limit

    const fromAndJoins = `
        FROM sales s
        JOIN party p ON s.party_id = p.id 
        LEFT JOIN "done_by" db ON s.done_by_id = db.id
        LEFT JOIN "cost_center" cc ON s.cost_center_id = cc.id
    `
    let whereClause = ` WHERE s.tenant_id = $1 `
    const params = [tenantId]
    let paramIndex = 2

    const filterConfig = {
      payment_status: { operator: '=', column: 's.payment_status' },
      party_id: { operator: '=', column: 's.party_id' },
      done_by_id: { operator: '=', column: 's.done_by_id' },
      cost_center_id: { operator: '=', column: 's.cost_center_id' },
      min_total_amount: { operator: '>=', column: 's.total_amount' },
      max_total_amount: { operator: '<=', column: 's.total_amount' },
      min_paid_amount: { operator: '>=', column: 's.paid_amount' },
      max_paid_amount: { operator: '<=', column: 's.paid_amount' },
      start_date: { operator: '>=', column: 's.order_date' },
      end_date: { operator: '<=', column: 's.order_date' },
      party_name: { operator: 'ILIKE', column: 'p.name', isString: true },
      total_amount: { operator: '=', column: 's.total_amount' },
      paid_amount: { operator: '=', column: 's.paid_amount' },
      balance: { operator: '=', column: '(s.total_amount - s.paid_amount)' },
      invoice_number: { operator: '=', column: 's.invoice_number' },
      account_id: {},
    }

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== '' &&
        filterConfig[key]
      ) {
        if (key === 'account_id') {
          whereClause += ` AND EXISTS (
            SELECT 1 FROM voucher_transactions vt
            JOIN voucher v ON vt.voucher_id = v.id
            WHERE vt.invoice_id::integer = s.id 
            AND vt.invoice_type = 'SALE' 
            AND v.to_ledger_id = $${paramIndex++}
          )`
          params.push(otherFilters[key])
        } else if (key === 'payment_status' && typeof otherFilters[key] === 'string' && otherFilters[key].includes(',')) {
          const statuses = otherFilters[key].split(',').map(s => s.trim());
          whereClause += ` AND s.payment_status = ANY($${paramIndex++})`
          params.push(statuses)
        } else {
          const { operator, column, isString } = filterConfig[key]
          let value = otherFilters[key]
          if (isString) {
            value = `%${value}%`
          }
          whereClause += ` AND ${column} ${operator} $${paramIndex++}`
          params.push(value)
        }
      }
    })

    // Search config
    const searchConfig = {
      party_name: { operator: 'ILIKE', column: 'p.name' },
      payment_status: { operator: 'ILIKE', column: 's.payment_status' },
      total_amount: { operator: '=', column: 's.total_amount' },
      invoice_number: { operator: 'ILIKE', column: 's.invoice_number' },
      done_by_name: { operator: 'ILIKE', column: 'db.name' },
      cost_center_name: { operator: 'ILIKE', column: 'cc.name' },
    }

    if (searchType && searchKey != null && searchKey !== '') {
      if (searchConfig[searchType]) {
        const { operator, column } = searchConfig[searchType]
        let value = operator === 'ILIKE' ? `%${searchKey}%` : searchKey
        whereClause += ` AND ${column} ${operator} $${paramIndex}`
        params.push(value)
        paramIndex++
      }
    }

    const aggregationQuery = `
          SELECT
              COALESCE(SUM(s.total_amount), 0) as total_amount,
              COALESCE(SUM(s.paid_amount), 0) as paid_amount
          ${fromAndJoins}
          ${whereClause}
      `
    let mainQuery = `
          SELECT 
              s.*,
              p.name as party_name,
              p.ledger_id as party_ledger_id, -- Fetch Ledger ID
              db.name as done_by_name,      
              db.name as done_by,           -- Alias for frontend mapping
              cc.name as cost_center_name,
              cc.name as cost_center,        -- Alias for frontend mapping
              (s.total_amount - s.paid_amount) as balance, -- Calculated balance
              (
                SELECT string_agg(DISTINCT l.name, ', ')
                FROM voucher_transactions vt
                JOIN voucher v ON vt.voucher_id = v.id
                JOIN ledger l ON v.to_ledger_id = l.id
                WHERE vt.invoice_id::integer = s.id 
                  AND vt.invoice_type = 'SALE'
              ) as account,
              COUNT(*) OVER() as total_count,
              (
                SELECT json_agg(sp_agg)
                FROM (
                  SELECT
                    v.id as voucher_id, -- <<< ADDED VOUCHER ID HERE
                    v.to_ledger_id as account_id,
                    l.name as account_name,
                    vt.received_amount as amount,
                    v.mode_of_payment_id
                  FROM voucher_transactions vt
                  JOIN voucher v ON vt.voucher_id = v.id
                  JOIN ledger l ON v.to_ledger_id = l.id
                  WHERE vt.invoice_id::integer = s.id 
                    AND vt.invoice_type = 'SALE'
                ) as sp_agg
              ) as payment_methods
          ${fromAndJoins}
          ${whereClause}
      `
    const allowedSortColumns = {
      // Map 'date' (frontend key) to 's.order_date' (DB column)
      date: 's.order_date',
      order_date: 's.order_date',

      // Existing mappings
      total_amount: 's.total_amount',
      party_name: 'p.name',
      payment_status: 's.payment_status',
      done_by: 'db.name',
      cost_center: 'cc.name',
      invoice_number: 's.invoice_number',

      // ADD THESE MISSING FIELDS:
      paid_amount: 's.paid_amount',
      // You can sort by calculated columns using the expression
      balance: '(s.total_amount - s.paid_amount)'
    }

    if (sort) {
      const direction = sort.startsWith('-') ? 'DESC' : 'ASC'
      const columnKey = sort.startsWith('-') ? sort.substring(1) : sort
      const dbColumn = allowedSortColumns[columnKey]
      if (dbColumn) {
        mainQuery += ` ORDER BY ${dbColumn} ${direction}, s.id DESC`
      } else {
        mainQuery += ' ORDER BY s.order_date DESC, s.id DESC'
      }
    } else {
      mainQuery += ' ORDER BY s.order_date DESC, s.id DESC'
    }

    mainQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    const mainQueryParams = [...params, limit, offset]

    const [mainResult, aggregationResult] = await Promise.all([
      db.query(mainQuery, mainQueryParams),
      db.query(aggregationQuery, params),
    ])

    const { rows } = mainResult
    const aggregationData = aggregationResult.rows[0]

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0
    const sales = rows.map(({ total_count, ...rest }) => rest)

    return {
      sales,
      totalCount,
      total_amount: aggregationData.total_amount,
      paid_amount: aggregationData.paid_amount,
    }
  }

  async create(db, saleData, items) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      const {
        tenant_id,
        party_id,
        done_by_id,
        cost_center_id,
        total_amount,
        change_return = 0,
        discount,
        order_date,
        expected_delivery,
        actual_delivery,
        order_status,
        note,
        invoice_number,
      } = saleData


      const initialPaid = 0;
      const initialStatus = 'unpaid';

      const insertSaleQuery = `
        INSERT INTO sales(
            tenant_id, party_id, done_by_id, cost_center_id, total_amount, 
            paid_amount, change_return, discount, order_date, expected_delivery, 
            actual_delivery, order_status, payment_status, note, invoice_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *;
      `
      const saleResult = await client.query(insertSaleQuery, [
        tenant_id,
        party_id,
        done_by_id,
        cost_center_id,
        total_amount,
        initialPaid,
        change_return,
        discount,
        order_date || new Date(),
        expected_delivery,
        actual_delivery,
        order_status || 'pending',
        initialStatus,
        note,
        invoice_number,
      ])
      const newSale = saleResult.rows[0]

      await this.salesItemRepository.createMany(
        client,
        newSale.id,
        items,
        tenant_id
      )

      await client.query('COMMIT')
      return this.getById(db, newSale.id, tenant_id)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async update(db, id, tenantId, saleData, items) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      const {
        party_id,
        done_by_id,
        cost_center_id,
        total_amount,
        change_return = 0,
        discount,
        order_date,
        expected_delivery,
        actual_delivery,
        order_status,
        note,
        invoice_number,
      } = saleData

      const updateSaleQuery = `
        UPDATE sales
        SET party_id = $1, total_amount = $2, discount = $3, 
            order_date = $4, expected_delivery = $5, actual_delivery = $6, 
            order_status = $7, done_by_id = $8, cost_center_id = $9, note = $10, 
            invoice_number = $11, change_return = $12
        WHERE id = $13 AND tenant_id = $14
        RETURNING *;
      `
      await client.query(updateSaleQuery, [
        party_id,
        total_amount,
        discount,
        order_date,
        expected_delivery,
        actual_delivery,
        order_status,
        done_by_id,
        cost_center_id,
        note,
        invoice_number,
        change_return,
        id,
        tenantId,
      ])

      await this.salesItemRepository.deleteBySalesId(client, id)
      await this.salesItemRepository.createMany(client, id, items, tenantId)

      await client.query('COMMIT')
      return this.getById(db, id, tenantId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async delete(db, id, tenantId) {
    const { rows } = await db.query(
      'DELETE FROM sales WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    )
    return rows[0]
  }

  async getById(db, id, tenantId) {
    const query = `
      SELECT 
        s.*,
        p.name as party_name,
        p.ledger_id as party_ledger_id, -- <<< FETCH LEDGER ID FROM PARTY
        (
          SELECT json_agg(si_agg) 
          FROM (
            SELECT 
              si.id, 
              si.item_id,
              i.name as item_name,
              i.sku as item_sku,
              si.quantity, 
              si.unit_price,
              si.tax_amount, 
              si.total_price,
              si.prescription_id
            FROM sale_item si 
            LEFT JOIN item i ON si.item_id = i.id
            WHERE si.sales_id = s.id
          ) as si_agg
        ) as items,
        (
          SELECT json_agg(sp_agg)
          FROM (
            SELECT
              v.id as voucher_id, -- <<< ADDED VOUCHER ID HERE
              v.to_ledger_id as account_id, -- Account money goes TO
              l.name as account_name,
              vt.received_amount as amount,
              v.mode_of_payment_id,
              v.voucher_no,
              v.date as payment_date
            FROM voucher_transactions vt
            JOIN voucher v ON vt.voucher_id = v.id
            JOIN ledger l ON v.to_ledger_id = l.id
            WHERE vt.invoice_id::integer = s.id 
              AND vt.invoice_type = 'SALE'
              AND v.tenant_id = $2
          ) as sp_agg
        ) as payment_methods,
        (
          SELECT SUM(si.tax_amount) 
          FROM sale_item si 
          WHERE si.sales_id = s.id
        ) as tax_amount,
        (
          SELECT SUM(si.quantity * si.unit_price) 
          FROM sale_item si 
          WHERE si.sales_id = s.id
        ) as sub_total,
        json_build_object(
           'company_name', ps.company_name,
           'email', ps.email,
           'phone', ps.phone,
           'address', ps.address,
           'store', ps.store,
           'full_header_image_url', ps.header_image_url,
           'header_image_url', ps.header_image_url,
           'image_height', ps.image_height,
           'image_width', ps.image_width,
           'tr_number', ps.tr_number,
           'footer_message', ps.footer_message
        ) as store
      FROM sales s
      LEFT JOIN party p ON s.party_id = p.id
      LEFT JOIN print_settings ps ON s.tenant_id = ps.tenant_id
      WHERE s.id = $1 AND s.tenant_id = $2;  
    `
    const { rows } = await db.query(query, [id, tenantId])
    return rows[0]
  }

  async increaseItemReturnedQuantity(
    dbClient,
    saleId,
    itemId,
    quantityToReturn
  ) {
    const query = `
      UPDATE sale_item
      SET returned_quantity = returned_quantity + $1
      WHERE sales_id = $2
        AND item_id = $3
        AND (quantity - returned_quantity) >= $1; 
    `;
    const { rowCount } = await dbClient.query(query, [
      quantityToReturn,
      saleId,
      itemId,
    ])

    if (rowCount === 0) {
      throw new Error(
        'Failed to update returned quantity. Either the item is not part of the sale or the return quantity exceeds the amount available to be returned.'
      )
    }

    return rowCount
  }

  async decreaseItemReturnedQuantity(
    dbClient,
    saleId,
    itemId,
    quantityToRestore
  ) {
    const query = `
      UPDATE sale_item
      SET returned_quantity = returned_quantity - $1
      WHERE sales_id = $2 AND item_id = $3;
    `;

    const { rowCount } = await dbClient.query(query, [
      quantityToRestore,
      saleId,
      itemId,
    ])

    if (rowCount === 0) {
      console.warn(
        `Could not decrease returned quantity for sales_id ${saleId} and item_id ${itemId}. The sale_item may have been removed.`
      )
    }

    return rowCount
  }
  async updatePaymentAndStatus(client, id, amountChange) {
    const query = `
      UPDATE sales
      SET
          paid_amount = paid_amount + $1,
          payment_status = CASE
              WHEN ROUND(paid_amount + $1, 2) >= total_amount THEN 'paid'
              WHEN ROUND(paid_amount + $1, 2) > 0 THEN 'partial'
              ELSE 'unpaid'
          END
      WHERE id = $2
      RETURNING id, payment_status;
    `;
    const { rows } = await client.query(query, [amountChange, id]);
    if (rows.length === 0) {
      throw new Error(`Sale with ID ${id} not found for payment update.`);
    }
    return rows[0];
  }
}


module.exports = SalesRepository
