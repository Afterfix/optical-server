const createTables = require("./migrations/createTables"); // this is your migration.js
require("dotenv").config();
(async () => {
  console.log(`Running migrations in ${process.env.NODE_ENV} mode...`);
  await createTables()
    .then(() => {
      console.log("Database ready");
      // Start server here
    })
    .catch((err) => {
      console.error("Database setup error:", err);
      process.exit(1);
    });
})();
