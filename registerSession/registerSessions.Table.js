// register_sessions.table.js

module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.register_sessions') AS table_name;
    `)
    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "register_sessions" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE register_sessions (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,

          done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
          
          cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL, 

          opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
          closed_at TIMESTAMP,  
          
          opening_cash NUMERIC(12,2) DEFAULT 0,
          closing_cash NUMERIC(12,2),

          status VARCHAR(20) NOT NULL DEFAULT 'open',
          opening_note TEXT,
          closing_note TEXT
        );
      `)
      console.log('✅ "register_sessions" table created.')

      // Create Indexes for Foreign Keys
      await client.query(
        `CREATE INDEX idx_register_sessions_tenant_id ON register_sessions(tenant_id);`
      )
      await client.query(
        `CREATE INDEX idx_register_sessions_done_by_id ON register_sessions(done_by_id);`
      )
      await client.query(
        `CREATE INDEX idx_register_sessions_cost_center_id ON register_sessions(cost_center_id);`
      )
      console.log('✅ Indexes for "register_sessions" table created.')
    }
  } catch (err) {
    console.error('❌ Error creating "register_sessions" table:', err.message)
    throw err
  }
}