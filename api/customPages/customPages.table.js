const createCustomPagesTable = async (client) => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS custom_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        path VARCHAR(255) NOT NULL UNIQUE,
        table_config JSONB NOT NULL DEFAULT '[]',
        assigned_users INTEGER[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(query);
    console.log("✅ 'custom_pages' table created successfully");
  } catch (error) {
    console.error("❌ Error creating 'custom_pages' table:", error);
    throw error;
  }
};

module.exports = createCustomPagesTable;
