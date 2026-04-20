class ItemProfitReportService {
  constructor() {
    // No constructor injection needed
  }

  async generateSummary(tenant_id, filters, db) {
    const { start_date, end_date } = filters;

    const salesParams = [tenant_id];
    let salesWhereClause = "";
    if (start_date && end_date) {
      salesWhereClause = `AND s.date BETWEEN $2::timestamptz AND $3::timestamptz`;
      salesParams.push(start_date, end_date);
    }

    const purchaseParams = [tenant_id];
    let purchaseWhereClause = "";
    if (end_date) {
      purchaseWhereClause = `AND p.date <= $2::timestamptz`;
      purchaseParams.push(end_date);
    }

    const saleSql = `
            SELECT si.item_id, si.quantity, si.total_price
            FROM sale_item si JOIN sales s ON s.id = si.sales_id
            WHERE si.tenant_id = $1 ${salesWhereClause}
            ORDER BY si.item_id, s.date, si.id;
        `;
    // Use passed db
    const { rows: saleItemsRaw } = await db.query(saleSql, salesParams);

    const purchaseSql = `
            SELECT pi.item_id, pi.quantity, pi.unit_price
            FROM purchase_item pi JOIN purchase p ON p.id = pi.purchase_id
            WHERE pi.tenant_id = $1 ${purchaseWhereClause}
            ORDER BY pi.item_id, p.date, pi.id;
        `;
    // Use passed db
    const { rows: purchaseBatchesRaw } = await db.query(
      purchaseSql,
      purchaseParams
    );

    const saleReturnSql = `
            SELECT item_id, return_quantity
            FROM sale_return s 
            WHERE s.tenant_id = $1 ${salesWhereClause};
        `;
    // Use passed db
    const { rows: saleReturns } = await db.query(
      saleReturnSql,
      salesParams
    );

    const salesByItem = this._groupSales(saleItemsRaw);
    this._applySaleReturns(salesByItem, saleReturns);
    const purchasesByItem = this._groupPurchases(purchaseBatchesRaw);

    const itemProfitMap = {};
    for (const [itemId, salesArr] of Object.entries(salesByItem)) {
      for (const sale of salesArr) {
        if (sale.quantity <= 0) continue;

        const { cost } = this._allocateFIFO(
          purchasesByItem[itemId] || [],
          sale.quantity
        );
        const revenue = parseFloat(sale.total_price);
        const profit = revenue - cost;

        if (!itemProfitMap[itemId]) {
          itemProfitMap[itemId] = {
            item_id: parseInt(itemId, 10),
            sold_qty: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }
        itemProfitMap[itemId].sold_qty += sale.quantity;
        itemProfitMap[itemId].revenue += revenue;
        itemProfitMap[itemId].cost += cost;
        itemProfitMap[itemId].profit += profit;
      }
    }

    const itemIds = Object.keys(itemProfitMap).map((id) => parseInt(id, 10));
    // Pass db
    const itemNames = await this._getItemNames(db, tenant_id, itemIds);

    return Object.values(itemProfitMap).map((r) => ({
      ...r,
      item_name: itemNames[r.item_id] || "Unknown",
      revenue: Number(r.revenue.toFixed(2)),
      cost: Number(r.cost.toFixed(2)),
      profit: Number(r.profit.toFixed(2)),
    }));
  }

  _groupSales = (sales) =>
    sales.reduce((acc, s) => {
      if (!acc[s.item_id]) acc[s.item_id] = [];
      acc[s.item_id].push({ ...s, quantity: parseInt(s.quantity, 10) });
      return acc;
    }, {});

  _groupPurchases = (purchases) =>
    purchases.reduce((acc, p) => {
      if (!acc[p.item_id]) acc[p.item_id] = [];
      acc[p.item_id].push({
        unit_price: parseFloat(p.unit_price),
        remaining: parseInt(p.quantity, 10),
      });
      return acc;
    }, {});

  _applySaleReturns = (salesByItem, returns) => {
    for (const ret of returns) {
      const sales = salesByItem[ret.item_id] || [];
      let qtyToRestore = parseInt(ret.return_quantity, 10);
      for (let i = sales.length - 1; i >= 0 && qtyToRestore > 0; i--) {
        const reducible = Math.min(sales[i].quantity, qtyToRestore);
        sales[i].quantity -= reducible;
        qtyToRestore -= reducible;
      }
    }
  };

  _allocateFIFO = (batches, requiredQty) => {
    let qtyNeeded = requiredQty;
    let cost = 0;
    for (const batch of batches) {
      if (qtyNeeded <= 0) break;
      const taken = Math.min(batch.remaining, qtyNeeded);
      cost += taken * batch.unit_price;
      batch.remaining -= taken;
      qtyNeeded -= taken;
    }
    return { cost, shortage: qtyNeeded };
  };

  async _getItemNames(db, tenant_id, itemIds) {
    if (itemIds.length === 0) return {};
    const inClause = itemIds.map((_, idx) => `$${idx + 2}`).join(",");
    const sql = `SELECT id, name FROM item WHERE tenant_id = $1 AND id IN (${inClause});`;
    // Use passed db
    const { rows } = await db.query(sql, [tenant_id, ...itemIds]);
    return rows.reduce((acc, item) => ({ ...acc, [item.id]: item.name }), {});
  }
}

module.exports = ItemProfitReportService;