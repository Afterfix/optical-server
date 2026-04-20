module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.account') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "account" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE account (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL, 
          cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,  
          partner_id INTEGER REFERENCES partner(id) ON DELETE SET NULL,
          party_id INTEGER REFERENCES party(id) ON DELETE CASCADE,
          balance NUMERIC(12,2) DEFAULT 0,     
          name VARCHAR(100) NOT NULL,       
          type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'bank')),
          description TEXT,
          created_at TIMESTAMP DEFAULT now(),
          UNIQUE (tenant_id, name)
        );
      `)
      console.log('✅ "account" table created.')

      await client.query(
        `CREATE INDEX idx_account_tenant_id ON account(tenant_id);`
      )
      await client.query(
        `CREATE INDEX idx_account_partner_id ON account(partner_id);`
      )
      await client.query(
        `CREATE INDEX idx_account_done_by_id ON account(done_by_id);`
      )  
      await client.query(
        `CREATE INDEX idx_account_cost_center_id ON account(cost_center_id);`
      )  
      await client.query(
        `CREATE INDEX idx_account_party_id ON account(party_id);`  
      )
      console.log('✅ Indexes for "account" table created.')
    }
  } catch (err) {
    console.error('❌ Error creating/updating "account" table:', err.message)
    throw err
  }
}
