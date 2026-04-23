const { pool } = require("../../config/db");

const addRow = async (customPageId, rowData) => {
  const query = `
    INSERT INTO custom_page_data (custom_page_id, row_data)
    VALUES ($1, $2)
    RETURNING *;
  `;
  const values = [customPageId, JSON.stringify(rowData)];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const getRowsByPageId = async (customPageId) => {
  const query = `
    SELECT * FROM custom_page_data 
    WHERE custom_page_id = $1 
    ORDER BY created_at DESC;
  `;
  const result = await pool.query(query, [customPageId]);
  return result.rows;
};

const updateRow = async (id, customPageId, rowData) => {
  const query = `
    UPDATE custom_page_data
    SET row_data = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND custom_page_id = $3
    RETURNING *;
  `;
  const values = [JSON.stringify(rowData), id, customPageId];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteRow = async (id, customPageId) => {
  const query = `
    DELETE FROM custom_page_data 
    WHERE id = $1 AND custom_page_id = $2 
    RETURNING *;
  `;
  const result = await pool.query(query, [id, customPageId]);
  return result.rows[0];
};

module.exports = {
  addRow,
  getRowsByPageId,
  updateRow,
  deleteRow,
};
