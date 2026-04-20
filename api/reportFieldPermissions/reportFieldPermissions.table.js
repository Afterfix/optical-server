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
  const tableName = 'report_field_permissions';
  try {
    const result = await client.query(`
      SELECT to_regclass('public.${tableName}') AS table_name;
    `);
    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log(`ℹ️ "${tableName}" table already exists.`);
    } else {
      // FIX: Changed DEFAULT ARRAY['...'] syntax to DEFAULT '{"..."}' syntax
      await client.query(`
        CREATE TABLE ${tableName} (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          tenant_id INT NOT NULL REFERENCES "tenant"(id) ON DELETE CASCADE,
          sale_report_fields TEXT[] DEFAULT '{"date","customer","invoice_no","status","account","total_amount","paid_amount","balance","done_by","cost_center"}',
          sale_return_report_fields TEXT[] DEFAULT '{"return_date","customer","item","quantity","amount","status","reason","done_by","cost_center"}',
          purchase_report_fields TEXT[] DEFAULT '{"date","supplier","invoice_no","status","account","total_amount","discount","paid_amount","balance","done_by","cost_center"}',
          purchase_return_report_fields TEXT[] DEFAULT '{"return_date","supplier","item","status","quantity","refund_amount","reason","done_by","cost_center"}',
          expense_report_fields TEXT[] DEFAULT '{"date","type","ledger","done_by","cost_center","description","amount","paid","balance","status"}',
          receipt_report_fields TEXT[] DEFAULT '{"date","voucher_no","invoice_type","payment_from","payment_to","done_by","cost_center","amount"}',
          payment_report_fields TEXT[] DEFAULT '{"date","voucher_no","invoice_type","payment_from","payment_to","done_by","cost_center","amount"}',
          ledger_report_fields TEXT[] DEFAULT '{"date","balance","done_by","cost_center","name"}',
          account_list_fields TEXT[] DEFAULT '{"date","name","done_by","cost_center","type","balance","description"}',
          item_list_fields TEXT[] DEFAULT '{"name","category","sku","brand","done_by","cost_center","unit","barcode","stock","price","price_w_tax","tax","date"}',
          customer_list_fields TEXT[] DEFAULT '{"name","done_by","cost_center","address","phone","email","credit_limit","outstanding_balance","date"}',
          supplier_list_fields TEXT[] DEFAULT '{"name","done_by","cost_center","email","phone","address","payment_terms"}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `);
      console.log(`✅ "${tableName}" table created.`);

      // Add trigger for updated_at
      await client.query(createUpdatedAtTrigger);
      await client.query(applyTrigger(tableName));
      console.log(`✅ "updated_at" trigger added to "${tableName}" table.`);

      // Add indexes
      await client.query(`CREATE INDEX idx_${tableName}_user_id ON ${tableName}(user_id);`);
      await client.query(`CREATE INDEX idx_${tableName}_tenant_id ON ${tableName}(tenant_id);`);
      console.log(`✅ Indexes for "${tableName}" table created.`);
    }
  } catch (err) {
    console.error(`❌ Error creating "${tableName}" table:`, err.message);
    throw err;
  }
};