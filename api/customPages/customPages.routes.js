const express = require("express");
const router = express.Router();
const controller = require("./customPages.controller");
const validateToken = require("../../middlewares/validateToken");

// Admin routes for creating/updating custom pages
router.post("/", validateToken, controller.createCustomPage);
router.get("/", validateToken, controller.getAllCustomPages);
router.get("/by-path", validateToken, controller.getCustomPageByPath);
router.get("/:id", validateToken, controller.getCustomPageById);
router.put("/:id", validateToken, controller.updateCustomPage);
router.delete("/:id", validateToken, controller.deleteCustomPage);

module.exports = router;
