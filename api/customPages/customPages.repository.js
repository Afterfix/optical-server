const { pool } = require("../../config/db");

const createCustomPage = async (pageData) => {
  const { title, path, table_config, is_active } = pageData;
  const query = `
    INSERT INTO custom_pages (title, path, table_config, is_active)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [title, path, JSON.stringify(table_config), is_active];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const getAllCustomPages = async () => {
  const query = `SELECT * FROM custom_pages ORDER BY created_at DESC;`;
  const result = await pool.query(query);
  return result.rows;
};

const getCustomPageById = async (id) => {
  const query = `SELECT * FROM custom_pages WHERE id = $1;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getCustomPageByPath = async (path) => {
  const query = `SELECT * FROM custom_pages WHERE path = $1;`;
  const result = await pool.query(query, [path]);
  return result.rows[0];
};

const updateCustomPage = async (id, pageData) => {
  const { title, path, table_config, is_active } = pageData;
  const query = `
    UPDATE custom_pages
    SET title = $1, path = $2, table_config = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *;
  `;
  const values = [title, path, JSON.stringify(table_config), is_active, id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteCustomPage = async (id) => {
  const query = `DELETE FROM custom_pages WHERE id = $1 RETURNING *;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  createCustomPage,
  getAllCustomPages,
  getCustomPageById,
  getCustomPageByPath,
  updateCustomPage,
  deleteCustomPage,
};
