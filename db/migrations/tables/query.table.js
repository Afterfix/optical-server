module.exports = async (client) => {
  try {
    console.log("⏳ applying database updates...");

    await client.query(updateServicesTable);
    console.log("✅ Services table updated (item_name, charge, etc added).");

  } catch (e) {
    console.error("❌ An error occurred during migration:", e.message);
    throw e;
  }
};

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