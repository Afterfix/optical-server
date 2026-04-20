class InvoiceNumberRepository {
  
  // Helper: format invoice number with prefix + padded number
  formatInvoiceNumber(type, value) {
    const padded = String(value).padStart(4, '0') // e.g. 10 → 0010
    return `${type.toUpperCase()}-${padded}`
  }

  // 1️⃣ Increment and return next invoice number (ATOMIC AND FIXED)
  async generateNext(db, { type, tenantId }) {
    const result = await db.query(
      `INSERT INTO invoice_number (tenant_id, transaction_type, value)
       VALUES ($1, $2, 1)
       ON CONFLICT (tenant_id, transaction_type) 
       DO UPDATE SET 
         value = invoice_number.value + 1,
         last_updated = NOW()
       RETURNING value;`,
      [tenantId, type]
    )

    const value = result.rows[0].value
    return this.formatInvoiceNumber(type, value)
  }

  // 2️⃣ Get last used invoice number (not incrementing)
  async get(db, { type, tenantId }) {
    const res = await db.query(
      `SELECT value
       FROM invoice_number 
       WHERE transaction_type = $1 AND tenant_id = $2`,
      [type, tenantId]
    )

    const value = res.rows[0]?.value || 0
    return this.formatInvoiceNumber(type, value)
  }
}

module.exports = InvoiceNumberRepository