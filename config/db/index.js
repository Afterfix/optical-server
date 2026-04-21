const { Pool } = require("pg");
require("dotenv").config();

// Create pool with appropriate config
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  ssl: false,
});

// Export the pool with error handling
module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  connect: () => pool.connect(),
  pool,
};
