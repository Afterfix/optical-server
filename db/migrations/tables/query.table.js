
module.exports = async (client) => {
  try {
    console.log("⏳ applying database updates...");

    
    await client.query(updatesaleitemtable);
    console.log("✅ sale_item table updated (columns updated).");

    
    await client.query(dropFrameFrameVariantLensLensAddonTables);
    console.log("✅ Old frame, frame_variants, lenses, and lens_addons tables dropped if they existed.");

    await client.query(updateServicesTable);
    console.log("✅ Services table updated (item_name, charge, etc added).");

    await client.query(updatePurchaseItemTable);
    console.log("✅ purchase_item table updated (added item_id).");

    await client.query(removeOldPurchaseItemColumns);
    console.log("✅ purchase_item table updated (removed frame_variant_id, lens_id, lens_addon_id).");

    await client.query(addModeOfPaymentIdToPurchase);
    console.log("✅ purchase table updated (mode_of_payment_id column ensured).");

  } catch (e) {
    console.error("❌ An error occurred during migration:", e.message);
    throw e;
  }
};



const frametables = `
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='frame_variants' AND column_name='barcode') THEN
          ALTER TABLE frame_variants ADD COLUMN barcode VARCHAR(100);
        END IF;
      END $$;
    `;

const addFrameVariantImageColumn = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='frame_variants' AND column_name='image'
  ) THEN
    ALTER TABLE frame_variants ADD COLUMN image TEXT;
  END IF;
END $$;
`;

const updateServicesTable = `
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='item_name') THEN
        ALTER TABLE services ADD COLUMN item_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='issue_report') THEN
        ALTER TABLE services ADD COLUMN issue_report TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='diagnosis') THEN
        ALTER TABLE services ADD COLUMN diagnosis TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='service') THEN
        ALTER TABLE services ADD COLUMN service TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='service_charge') THEN
        ALTER TABLE services ADD COLUMN service_charge NUMERIC(12, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='service_charge_status') THEN
        ALTER TABLE services ADD COLUMN service_charge_status VARCHAR(50) DEFAULT 'unpaid';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='estimate_date') THEN
        ALTER TABLE services ADD COLUMN estimate_date TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='complete_date') THEN
        ALTER TABLE services ADD COLUMN complete_date TIMESTAMP;
    END IF;
END $$;
`;

const updatePurchaseItemTable = `
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_item' AND column_name='item_id') THEN
    ALTER TABLE purchase_item ADD COLUMN item_id INTEGER REFERENCES item(id) ON DELETE SET NULL;
  END IF;
END $$;
`;

const removeOldPurchaseItemColumns = `
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_item' AND column_name='frame_variant_id') THEN
    ALTER TABLE purchase_item DROP COLUMN frame_variant_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_item' AND column_name='lens_id') THEN
    ALTER TABLE purchase_item DROP COLUMN lens_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_item' AND column_name='lens_addon_id') THEN
    ALTER TABLE purchase_item DROP COLUMN lens_addon_id;
  END IF;
END $$;
`;

const updatesaleitemtable =
// add item_id, unit_price; remove frame_variant_id, lens_id, lens_addon_id, frame_price, lens_price, addon_price
`
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_item' AND column_name='frame_variant_id') THEN
        ALTER TABLE sale_item DROP COLUMN frame_variant_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_item' AND column_name='lens_id') THEN  
        ALTER TABLE sale_item DROP COLUMN lens_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_item' AND column_name='lens_addon_id') THEN
        ALTER TABLE sale_item DROP COLUMN lens_addon_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_item' AND column_name='frame_price') THEN
        ALTER TABLE sale_item DROP COLUMN frame_price;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_item' AND column_name='lens_price') THEN 
        ALTER TABLE sale_item DROP COLUMN lens_price;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_item' AND column_name='addon_price') THEN  
        ALTER TABLE sale_item DROP COLUMN addon_price;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_item' AND column_name='item_id') THEN
        ALTER TABLE sale_item ADD COLUMN item_id INTEGER REFERENCES item(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_item' AND column_name='unit_price') THEN
        ALTER TABLE sale_item ADD COLUMN unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
    END IF;
END $$;
`;

const dropFrameFrameVariantLensLensAddonTables = `
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = current_schema() AND tablename IN ('frame','frame_variants', 'lenses', 'lens_addons')
  ) LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', r.schemaname, r.tablename);
  END LOOP;
END
$$;
`;

const addModeOfPaymentIdToPurchase = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='purchase' AND column_name='mode_of_payment_id'
  ) THEN
    ALTER TABLE purchase
      ADD COLUMN mode_of_payment_id INTEGER REFERENCES mode_of_payment(id) ON DELETE SET NULL;
  END IF;
END $$;
`;

const dropalltables = `
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = current_schema()
  ) LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', r.schemaname, r.tablename);
  END LOOP;
END
$$;
`;
