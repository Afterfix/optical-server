const createCustomPageDataTable = async (client) => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS custom_page_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        custom_page_id UUID NOT NULL REFERENCES custom_pages(id) ON DELETE CASCADE,
        row_data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(query);
    console.log("✅ 'custom_page_data' table created successfully");
  } catch (error) {
    console.error("❌ Error creating 'custom_page_data' table:", error);
    throw error;
  }
};

module.exports = createCustomPageDataTable;
