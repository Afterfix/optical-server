const createUpdatedAtTrigger = `
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`;

const applyTrigger = (tableName) => `
  CREATE TRIGGER update_${tableName}_updated_at
  BEFORE UPDATE ON ${tableName}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;

module.exports = async (client) => {
  const tableName = 'transaction_field_permissions';
  try {
    const result = await client.query(`
      SELECT to_regclass('public.${tableName}') AS table_name;
    `);
    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log(`ℹ️ "${tableName}" table already exists.`);
    } else {
      await client.query(`
        CREATE TABLE ${tableName} (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          tenant_id INT NOT NULL REFERENCES "tenant"(id) ON DELETE CASCADE,
          sale_form_fields TEXT[] DEFAULT '{"price","stock","quantity","tax","sub_total"}',
          sale_return_form_fields TEXT[] DEFAULT '{"product","price","returnable","return_quantity","tax","sub_total"}',
          purchase_form_fields TEXT[] DEFAULT '{"cost","quantity","tax","sub_total"}',
          purchase_return_form_fields TEXT[] DEFAULT '{"product","price","available","return_quantity","tax","sub_total"}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `);
      
      await client.query(createUpdatedAtTrigger);
      await client.query(applyTrigger(tableName));
      
      await client.query(`CREATE INDEX idx_${tableName}_user_id ON ${tableName}(user_id);`);
      await client.query(`CREATE INDEX idx_${tableName}_tenant_id ON ${tableName}(tenant_id);`);
      console.log(`✅ "${tableName}" table and indexes created.`);
    }
  } catch (err) {
    console.error(`❌ Error creating "${tableName}" table:`, err.message);
    throw err;
  }
};