module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.prescription') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "prescription" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE prescription (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customer(id) ON DELETE CASCADE,
          
          -- Prescription Values
          right_sph DECIMAL(6, 2),
          right_cyl DECIMAL(6, 2),
          right_axis DECIMAL(6, 2),
          right_add DECIMAL(6, 2),
          right_ipd DECIMAL(6, 2),
          left_sph DECIMAL(6, 2),
          left_cyl DECIMAL(6, 2),
          left_axis DECIMAL(6, 2),
          left_add DECIMAL(6, 2),
          left_ipd DECIMAL(6, 2),
          
          doctor_name VARCHAR(255),
          remarks TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ "prescription" table created.');

      // Index for performance (frequently querying prescriptions by customer)
      await client.query(
        `CREATE INDEX idx_prescription_customer_id ON prescription(customer_id);`
      );

      console.log('✅ Index for "prescription" table created.');
    }
  } catch (err) {
    console.error('❌ Error creating/updating "prescription" table:', err.message);
    throw err;
  }
};