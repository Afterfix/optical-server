module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.token') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;
    if (tableExists) {
      console.log('ℹ️ "token" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE token (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
          refresh_token TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ "token" table created.');

      await client.query(`
        CREATE INDEX idx_token_user_id ON token(user_id);
      `);
    }
  } catch (err) {
    console.error('❌ Error creating "token" table:', err.message);
  }
};