const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized: Missing or invalid Authorization header",
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // Handles expired tokens, invalid signatures, etc.
      return res.status(403).json({ message: "Forbidden: Invalid token" });
    }

    // --- CORRECTED LOGIC ---
    // A token is valid if the user is a super_admin OR if they have a tenant_id.
    // A non-super_admin user MUST have a tenant_id.
    if (decoded.role !== "super_admin" && !decoded.tenant_id) {
      return res.status(400).json({
        message: "Invalid token: Non-admin users must be associated with a tenant.",
      });
    }

    req.user = decoded;
    next();
  });
};

module.exports = validateToken;