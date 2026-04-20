class PartySummaryRepository {
  async getVoucherPaymentsInPeriod(
    db,
    tenant_id,
    party_id,
    startDate,
    endDateExclusive,
    partyType
  ) {
    const paymentExpression =
      partyType === "customer"
        ? `COALESCE(SUM(CASE WHEN p.ledger_id = v.from_ledger_id THEN v.amount WHEN p.ledger_id = v.to_ledger_id THEN -v.amount ELSE 0 END), 0)`
        : `COALESCE(SUM(CASE WHEN p.ledger_id = v.to_ledger_id THEN v.amount WHEN p.ledger_id = v.from_ledger_id THEN -v.amount ELSE 0 END), 0)`;

    const query = `
      SELECT ${paymentExpression} AS total
      FROM voucher v
      JOIN party p ON (v.from_ledger_id = p.ledger_id OR v.to_ledger_id = p.ledger_id)
      WHERE p.id = $1
        AND v.tenant_id IS NOT DISTINCT FROM $2
        AND v.date >= $3::date
        AND ($4::timestamp IS NULL OR v.date <= $4::timestamp)
    `;

    const result = await db.query(query, [
      party_id,
      tenant_id,
      startDate,
      endDateExclusive,
    ]);
    return parseFloat(result.rows[0].total);
  }

  async getCumulativeVoucherPaymentsBefore(
    db,
    tenant_id,
    party_id,
    beforeDate,
    partyType
  ) {
    const paymentExpression =
      partyType === "customer"
        ? `COALESCE(SUM(CASE WHEN p.ledger_id = v.from_ledger_id THEN v.amount WHEN p.ledger_id = v.to_ledger_id THEN -v.amount ELSE 0 END), 0)`
        : `COALESCE(SUM(CASE WHEN p.ledger_id = v.to_ledger_id THEN v.amount WHEN p.ledger_id = v.from_ledger_id THEN -v.amount ELSE 0 END), 0)`;

    const query = `
      SELECT ${paymentExpression} AS total
      FROM voucher v
      JOIN party p ON (v.from_ledger_id = p.ledger_id OR v.to_ledger_id = p.ledger_id)
      WHERE p.id = $1
        AND v.tenant_id IS NOT DISTINCT FROM $2
        AND v.date < $3::date
    `;

    const result = await db.query(query, [party_id, tenant_id, beforeDate]);
    return parseFloat(result.rows[0].total);
  }

  // --- EXISTING METHODS (Sales/Purchases/Parties) ---

  async getAllParties(db, tenant_id) {
    const result = await db.query(
      `SELECT id, name, type FROM party WHERE tenant_id IS NOT DISTINCT FROM $1 ORDER BY name`,
      [tenant_id]
    );
    return result.rows;
  }

  async getSalesInPeriod(db, tenant_id, party_id, startDate, endDateExclusive) {
    const result = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total FROM sales
       WHERE party_id = $1 AND tenant_id IS NOT DISTINCT FROM $2
       AND date >= $3::date AND ($4::timestamp IS NULL OR date <= $4::timestamp)`,
      [party_id, tenant_id, startDate, endDateExclusive]
    );
    return parseFloat(result.rows[0].total);
  }

  async getPurchasesInPeriod(
    db,
    tenant_id,
    party_id,
    startDate,
    endDateExclusive
  ) {
    const result = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total FROM purchase
       WHERE party_id = $1 AND tenant_id IS NOT DISTINCT FROM $2
       AND date >= $3::date AND ($4::timestamp IS NULL OR date <= $4::timestamp)`,
      [party_id, tenant_id, startDate, endDateExclusive]
    );
    return parseFloat(result.rows[0].total);
  }

  async getCumulativeSalesBefore(db, tenant_id, party_id, beforeDate) {
    const result = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total FROM sales
       WHERE party_id = $1 AND tenant_id IS NOT DISTINCT FROM $2 AND date < $3::date`,
      [party_id, tenant_id, beforeDate]
    );
    return parseFloat(result.rows[0].total);
  }

  async getCumulativePurchasesBefore(db, tenant_id, party_id, beforeDate) {
    const result = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total FROM purchase
       WHERE party_id = $1 AND tenant_id IS NOT DISTINCT FROM $2 AND date < $3::date`,
      [party_id, tenant_id, beforeDate]
    );
    return parseFloat(result.rows[0].total);
  }
}

module.exports = PartySummaryRepository;
