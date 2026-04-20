module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.print_settings') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "print_settings" table already exists.');

      try {
        await client.query(`
          ALTER TABLE print_settings 
          ADD COLUMN IF NOT EXISTS tr_number TEXT;
        `);
        console.log('✅ Checked/Added "tr_number" column to print_settings.');
      } catch (colErr) {
        console.error("⚠️ Error adding tr_number column:", colErr.message);
      }
      try {
        await client.query(`
          ALTER TABLE print_settings 
          ADD COLUMN IF NOT EXISTS show_qr_code BOOLEAN DEFAULT true;
        `);
        console.log(
          '✅ Checked/Added "show_qr_code" column to print_settings.',
        );
      } catch (colErr) {
        console.error("⚠️ Error adding show_qr_code column:", colErr.message);
      }
      try {
        await client.query(`
          ALTER TABLE print_settings 
          ADD COLUMN IF NOT EXISTS show_qr_code BOOLEAN DEFAULT true;
        `);
        console.log('✅ Checked/Added "show_qr_code" column to print_settings.');
      } catch (colErr) {
        console.error('⚠️ Error adding show_qr_code column:', colErr.message);
      }

    } else {
      await client.query(`
        CREATE TABLE print_settings (
          tenant_id INTEGER PRIMARY KEY REFERENCES "tenant"(id) ON DELETE CASCADE, 
          company_name TEXT,
          email TEXT,
          phone TEXT,
          address TEXT,
          store TEXT,
          image_height TEXT,
          image_width TEXT,
          tr_number TEXT, 
          qr_image_url TEXT,
          qr_width TEXT,
          qr_height TEXT,
          show_qr_code BOOLEAN DEFAULT true,
          print_type TEXT DEFAULT 'thermal',
          footer_message TEXT,
          header_image_url TEXT,
          show_arabic_translations BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );  
      `);

      console.log('✅ "print_settings" table has been created.');
    }
  } catch (err) {
    console.error(
      '❌ Failed to create or update "print_settings" table:',
      err.message,
    );
    throw err;
  }
};
