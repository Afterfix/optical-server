module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.settings') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "settings" table already exists.')
    } else {
      const defaultSidebarLabels = JSON.stringify({
        dashboard: 'Dashboard', sales: 'Sales', sale_return: 'Sale Return',
        employees: 'Employees', expenses: 'Expenses', partnerships: 'Partnerships',
        purchase: 'Purchase', purchase_return: 'Purchase Return',
        daily_summary: 'Daily Summary', monthly_summary: 'Monthly Summary',
        reports: 'Reports', lists: 'Lists',
      });

      await client.query(`
        CREATE TABLE settings (
          user_id INTEGER PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          app_name TEXT DEFAULT 'WheelX',
          logo TEXT,
          sidebar_labels JSONB DEFAULT '${defaultSidebarLabels}',
          country TEXT,
          user_settings JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ "settings" table has been created.');

      // Create or update the function for the updated_at column
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
           NEW.updated_at = NOW();
           RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // Create the trigger
      await client.query(`
        CREATE TRIGGER update_settings_updated_at
        BEFORE UPDATE ON settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
      console.log('✅ Trigger for "settings.updated_at" has been created.');

      // Create index
      await client.query(
        `CREATE INDEX idx_settings_tenant_id ON settings(tenant_id);`
      );
      console.log('✅ Indexes for "settings" table have been created.');
    }
  } catch (err) {
    console.error('❌ Failed to create "settings" table:', err.message);
    throw err;
  }
};