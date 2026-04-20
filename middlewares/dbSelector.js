const { getPool } = require('../config/db');

function dbSelector(appName) {
  return (req, res, next) => {
    try {
      // Get database pool for the specified app
      const dbPool = getPool(appName);
      
      // Attach the pool to the request object
      req.db = dbPool;
      
      // Optional: Also attach the app name for reference
      req.appName = appName;
      
      next();
    } catch (error) {
      console.error(`Database selection error for ${appName}:`, error);
      return res.status(500).json({
        error: `Database configuration error: ${error.message}`
      });
    }
  };
}

module.exports = dbSelector;
