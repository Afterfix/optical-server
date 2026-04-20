const { Pool } = require("pg");
require("dotenv").config();

// Required for managed Postgres (e.g. DigitalOcean) that reject "no encryption" in pg_hba.conf.
// We enable SSL via the config object with rejectUnauthorized: false so the connection is
// encrypted but self-signed certs (e.g. DO) are accepted. Do NOT use sslmode=require in the
// URL here — in current pg it is treated as verify-full and causes "self-signed certificate" errors.
const useSsl = process.env.DB_DISABLE_SSL !== "true";
const sslOption = useSsl ? { rejectUnauthorized: false } : false;
if (useSsl) {
  console.log("[DB] SSL enabled (rejectUnauthorized: false for self-signed certs). Set DB_DISABLE_SSL=true to disable.");
}

function buildConnectionString(appEnv, appName) {
  const { user, host, database, password, port } = appEnv;
  if (!user || !host) return null;
  const dbName = database || "postgres";
  if (!database) {
    console.warn(`[DB] ${appName}: DB name not set — using "postgres". Set e.g. GADGETX_DB_NAME in .env for the correct database.`);
  }
  const portNum = port || 25060;
  const enc = encodeURIComponent;
  // Do not add sslmode=require to URL — it triggers strict cert verification and fails on self-signed.
  return `postgresql://${enc(user)}:${enc(password || "")}@${host}:${portNum}/${enc(dbName)}`;
}

function buildDbConfig(appEnv, appName) {
  const connectionString = buildConnectionString(appEnv, appName);
  const config = connectionString
    ? { connectionString, ...(useSsl && { ssl: sslOption }) }
    : {
      ...appEnv,
      port: appEnv.port || 25060,
      database: appEnv.database || "postgres",
      ssl: sslOption,
    };
  return config;
}

const databaseConfigs = {
  wheelx: buildDbConfig(
    {
      user: process.env.WHEELX_DB_USER,
      host: process.env.WHEELX_DB_HOST,
      database: process.env.WHEELX_DB_NAME,
      password: process.env.WHEELX_DB_PASSWORD,
      port: process.env.WHEELX_DB_PORT || 25060,
    },
    "wheelx"
  ),

  physiquex: buildDbConfig(
    {
      user: process.env.PHYSIQUE_DB_USER,
      host: process.env.PHYSIQUE_DB_HOST,
      database: process.env.PHYSIQUE_DB_NAME,
      password: process.env.PHYSIQUE_DB_PASSWORD,
      port: process.env.PHYSIQUE_DB_PORT || 25060,
    },
    "physiquex"
  ),

  invoicex: buildDbConfig(
    {
      user: process.env.INVOICE_DB_USER,
      host: process.env.INVOICE_DB_HOST,
      database: process.env.INVOICE_DB_NAME,
      password: process.env.INVOICE_DB_PASSWORD,
      port: process.env.INVOICE_DB_PORT || 25060,
    },
    "invoicex"
  ),

  buildx: buildDbConfig(
    {
      user: process.env.BUILD_DB_USER,
      host: process.env.BUILD_DB_HOST,
      database: process.env.BUILD_DB_NAME,
      password: process.env.BUILD_DB_PASSWORD,
      port: process.env.BUILD_DB_PORT || 25060,
    },
    "buildx"
  ),

  garagex: buildDbConfig(
    {
      user: process.env.GARAGEX_DB_USER,
      host: process.env.GARAGEX_DB_HOST,
      database: process.env.GARAGEX_DB_NAME,
      password: process.env.GARAGEX_DB_PASSWORD,
      port: process.env.GARAGEX_DB_PORT || 25060,
    },
    "garagex"
  ),

  gadgetx: buildDbConfig(
    {
      user: process.env.GADGETX_DB_USER,
      host: process.env.GADGETX_DB_HOST,
      database: process.env.GADGETX_DB_NAME,
      password: process.env.GADGETX_DB_PASSWORD,
      port: process.env.GADGETX_DB_PORT || 25060,
    },
    "gadgetx"
  ),

  travelx: buildDbConfig(
    {
      user: process.env.TRAVELX_DB_USER,
      host: process.env.TRAVELX_DB_HOST,
      database: process.env.TRAVELX_DB_NAME,
      password: process.env.TRAVELX_DB_PASSWORD,
      port: process.env.TRAVELX_DB_PORT || 25060,
    },
    "travelx"
  ),
  inventoryx: buildDbConfig(
    {
      user: process.env.INVENTORYX_DB_USER,
      host: process.env.INVENTORYX_DB_HOST,
      database: process.env.INVENTORYX_DB_NAME,
      password: process.env.INVENTORYX_DB_PASSWORD,
      port: process.env.INVENTORYX_DB_PORT || 25060,
    },
    "inventoryx"
  ),
};

const pools = {};

function getPool(appName) {
  if (!pools[appName]) {
    const config = databaseConfigs[appName];
    if (!config) {
      throw new Error(`Database config for '${appName}' not found`);
    }
    if (useSsl) {
      console.log(`[DB] ${appName}: SSL enabled`);
    }
    pools[appName] = new Pool(config);

    pools[appName].on("connect", () => {
      console.log(`✅ Connected to ${appName} database`);
    });

    pools[appName].on("error", (err) => {
      console.error(`❌ DB error (${appName}):`, err);
    });
  }

  return pools[appName];
}

module.exports = { getPool };
