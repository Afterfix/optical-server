const { pool } = require("../../config/db");

const createCustomPage = async (pageData) => {
  const { title, path, table_config, is_active, assigned_users } = pageData;
  const users = Array.isArray(assigned_users) ? assigned_users : [];
  const query = `
    INSERT INTO custom_pages (title, path, table_config, is_active, assigned_users)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [title, path, JSON.stringify(table_config), is_active, users];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const getAllCustomPages = async (userId, role) => {
  if (role === 'super_admin') {
    const query = `SELECT * FROM custom_pages ORDER BY created_at DESC;`;
    const result = await pool.query(query);
    return result.rows;
  }
  
  const query = `
    SELECT * FROM custom_pages 
    WHERE $1 = ANY(assigned_users) 
    AND is_active = true 
    ORDER BY created_at DESC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

const getCustomPageByPath = async (path, userId, role) => {
  if (role === 'super_admin') {
    const query = `SELECT * FROM custom_pages WHERE path = $1;`;
    const result = await pool.query(query, [path]);
    return result.rows[0];
  }

  const query = `
    SELECT * FROM custom_pages 
    WHERE path = $1 
    AND $2 = ANY(assigned_users) 
    AND is_active = true;
  `;
  const result = await pool.query(query, [path, userId]);
  return result.rows[0];
};

const getCustomPageById = async (id) => {
  const query = `SELECT * FROM custom_pages WHERE id = $1;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};



const updateCustomPage = async (id, pageData) => {
  const { title, path, table_config, is_active, assigned_users } = pageData;
  const users = Array.isArray(assigned_users) ? assigned_users : [];
  const query = `
    UPDATE custom_pages
    SET title = $1, path = $2, table_config = $3, is_active = $4, assigned_users = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *;
  `;
  const values = [title, path, JSON.stringify(table_config), is_active, users, id];
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
