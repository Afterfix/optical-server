module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.partnership') AS table_name;
    `)
    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "partnership" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE partnership (
          id SERIAL PRIMARY KEY,
          partner_id INTEGER REFERENCES partner(id) ON DELETE CASCADE,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL, -- <<< ADDED
          cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL, -- <<< ADDED
          contribution DECIMAL(12, 2),
          profit_share DECIMAL(12, 2),  
          from_account INTEGER REFERENCES account(id) ON DELETE CASCADE, 
          contribution_payment_status TEXT,
          contribution_payment_paid DECIMAL(12, 2) DEFAULT 0,
          profit_share_payment_status TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         );
      `)
      console.log('✅ "partnership" table has been created.')
      await client.query(`
                CREATE INDEX idx_partnership_tenant_id ON partnership(tenant_id);
                CREATE INDEX idx_partnership_partner_id ON partnership(partner_id);
                CREATE INDEX idx_partnership_from_account ON partnership(from_account);
                CREATE INDEX idx_partnership_done_by_id ON partnership(done_by_id); -- <<< ADDED
                CREATE INDEX idx_partnership_cost_center_id ON partnership(cost_center_id); -- <<< ADDED
            `)
    }
  } catch (err) {
    console.error('❌ Failed to create "partnership" table:', err.message)
    throw err
  }
}
