function requireRole(...allowedRoles) {
  const normalizedAllowedRoles = allowedRoles.flat().filter(Boolean);

  return function roleAuthorization(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please log in first."
      });
    }

    if (!normalizedAllowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource."
      });
    }

    next();
  };
}

const requireClient = requireRole("client");

const requireAdmin = requireRole(
  "general_admin",
  "executive_admin"
);

const requireExecutiveAdmin = requireRole(
  "executive_admin"
);

module.exports = {
  requireRole,
  requireClient,
  requireAdmin,
  requireExecutiveAdmin
};
