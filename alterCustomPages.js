const { pool } = require('./config/db');

const addAssignedUsersColumn = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE custom_pages
      ADD COLUMN IF NOT EXISTS assigned_users INTEGER[] DEFAULT '{}';
    `);
    console.log("Successfully added assigned_users column to custom_pages");
  } catch (error) {
    console.error("Error adding column:", error);
  } finally {
    client.release();
    process.exit(0);
  }
};

addAssignedUsersColumn();
