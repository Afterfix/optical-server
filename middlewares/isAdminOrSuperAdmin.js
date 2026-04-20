module.exports = (req, res, next) => {
  try {
    const roleName = req.user?.role_name || req.user?.role;

    if (!roleName) {
      return res.status(403).json({ message: "Access denied: No role assigned." });
    }

    if (roleName === "admin" || roleName === "super_admin") {
      return next();
    }

    return res.status(403).json({ message: "Access denied: Admin privileges required." });
  } catch (error) {
    console.error("Authorization error:", error);
    res.status(500).json({ message: "Authorization failed." });
  }
};
