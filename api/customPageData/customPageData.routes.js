const express = require("express");
const router = express.Router();
const controller = require("./customPageData.controller");
const validateToken = require("../../middlewares/validateToken");

// Routes for CRUD on custom page data (used by user portal and admin)
router.post("/:customPageId", validateToken, controller.addRow);
router.get("/:customPageId", validateToken, controller.getRowsByPageId);
router.put("/:customPageId/:id", validateToken, controller.updateRow);
router.delete("/:customPageId/:id", validateToken, controller.deleteRow);

module.exports = router;
