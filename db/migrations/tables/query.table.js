module.exports = async (client) => {
  try {
    console.log("⏳ applying database updates...");

    await client.query(updateSalesTable);
    console.log("✅ Sales table updated (order_date, expected_delivery, actual_delivery, order_status added; date renamed to order_date).");

    // 1. Update Subscription Table (Amount, Paid, Account)
    await client.query(updateSubscriptionTable);
    console.log(
      "✅ Subscription table updated (amount, amount_paid, account_id added)."
    );

    // 2. Update Account Table
    await client.query(updateAccountTable);
    console.log(
      "✅ Account table updated (partner_id removed, amount removed, done_by_id added)."
    );

    // 3. Update Employee Payroll Table
    await client.query(updateEmployeePayrollTable);
    console.log("✅ Employee Payroll table updated (from_account added).");
    
    // 4. Drop is_active from Subscription
    await client.query(dropSubscriptionIsActive);
    console.log("✅ Subscription table updated (is_active removed).");

    // ⚠️ WARNING: Uncomment the line below ONLY if you want to wipe the entire database.
    // await client.query(dropalltables);
  } catch (e) {
    console.error("❌ An error occurred during migration:", e.message);
    throw e;
  }
};

// --- Migration Queries ---

const updateSalesTable = `
ALTER TABLE sales 
ADD COLUMN order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN expected_delivery TIMESTAMP,
ADD COLUMN actual_delivery TIMESTAMP,
ADD COLUMN order_status VARCHAR(20) DEFAULT 'pending';

-- 1. Migrate existing date data to the new order_date column
UPDATE sales SET order_date = date;

-- 2. Rename the old 'status' column to 'payment_status'
ALTER TABLE sales RENAME COLUMN status TO payment_status;

-- 3. Remove the now-redundant 'date' column
ALTER TABLE sales DROP COLUMN date;
`;

const updateSubscriptionTable = `
  ALTER TABLE subscription
  ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES account(id) ON DELETE SET NULL;

  CREATE INDEX IF NOT EXISTS idx_subscription_account_id ON subscription(account_id);
`;

const updateAccountTable = `
  ALTER TABLE account
  DROP COLUMN IF EXISTS amount
`;

const updateEmployeePayrollTable = `
  ALTER TABLE employee_payroll
  ADD COLUMN IF NOT EXISTS from_account INTEGER REFERENCES account(id) ON DELETE SET NULL;

  CREATE INDEX IF NOT EXISTS idx_employee_payroll_from_account ON employee_payroll(from_account);
`;

const dropSubscriptionIsActive = `
  ALTER TABLE subscription DROP COLUMN IF EXISTS is_active;
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