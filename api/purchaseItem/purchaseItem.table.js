module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.purchase_item') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "purchase_item" table already exists. Checking for missing columns...');
      await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_item' AND column_name='lens_id') THEN
            ALTER TABLE purchase_item ADD COLUMN lens_id INTEGER REFERENCES lenses(id) ON DELETE SET NULL;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_item' AND column_name='lens_addon_id') THEN
            ALTER TABLE purchase_item ADD COLUMN lens_addon_id INTEGER REFERENCES lens_addons(id) ON DELETE SET NULL;
          END IF;
        END $$;
      `);
    } else {
      await client.query(`
        CREATE TABLE purchase_item (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          purchase_id INTEGER NOT NULL REFERENCES purchase(id) ON DELETE CASCADE,
          frame_variant_id INTEGER REFERENCES frame_variants(id) ON DELETE SET NULL,
          lens_id INTEGER REFERENCES lenses(id) ON DELETE SET NULL,
          lens_addon_id INTEGER REFERENCES lens_addons(id) ON DELETE SET NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          total_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ "purchase_item" table has been created.');
    }

    // Ensure indexes exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_item_tenant_id ON purchase_item(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_item_purchase_id ON purchase_item(purchase_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_item_frame_variant_id ON purchase_item(frame_variant_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_item_lens_id ON purchase_item(lens_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_item_lens_addon_id ON purchase_item(lens_addon_id);
    `);
    console.log('✅ Indexes for "purchase_item" table ensured.');
  } catch (err) {
    console.error('❌ Failed to create "purchase_item" table:', err.message);
    throw err;
  }
};
