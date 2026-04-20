class BalanceSheetReportService {

  async generateSummary(db, tenant_id, filters) {
    const accountRes = await db.query(
      `SELECT 
        a.type,
        COALESCE(SUM(t.credit), 0) - COALESCE(SUM(t.debit), 0) AS total
      FROM account a
      LEFT JOIN transaction_ledger t 
        ON a.id = t.account_id
        AND t.tenant_id = $1
      WHERE a.tenant_id = $1
      GROUP BY a.type;
      `,
      [tenant_id]
    );

    let cashInHand = 0,
      bankBalance = 0;
    accountRes.rows.forEach((row) => {
      if (row.type === "cash") cashInHand = parseFloat(row.total);
      if (row.type === "bank") bankBalance = parseFloat(row.total);
    });

    const stockRes = await db.query(
      `SELECT SUM(stock_quantity * purchase_price) as val FROM item WHERE tenant_id = $1`,
      [tenant_id]
    );
    const stockValue = parseFloat(stockRes.rows[0].val || 0);

    const receivableRes = await db.query(
      `SELECT SUM(total_amount - paid_amount) as val FROM sales WHERE tenant_id = $1 AND status != 'Paid'`,
      [tenant_id]
    );
    const receivables = parseFloat(receivableRes.rows[0].val || 0);

    const payableRes = await db.query(
      `SELECT SUM(total_amount - paid_amount) as val FROM purchase WHERE tenant_id = $1`,
      [tenant_id]
    );
    const payables = parseFloat(payableRes.rows[0].val || 0);

    const totalAssets = cashInHand + bankBalance + stockValue + receivables;

    return {
      as_of_date: new Date().toISOString().split("T")[0],
      assets: {
        cash_in_hand: cashInHand,
        bank_balance: bankBalance,
        stock_value: stockValue,
        accounts_receivable: receivables,
        total_assets: totalAssets,
      },
      liabilities: { accounts_payable: payables, total_liabilities: payables },
      equity: totalAssets - payables,
    };
  }
}

module.exports = BalanceSheetReportService;