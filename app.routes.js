const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// Serve print images via API so CORS works and nginx doesn't need to serve /uploads
router.get("/print/image/:tenantId/:filename", (req, res) => {
  const { tenantId, filename } = req.params;
  if (!tenantId || !filename || /[^a-zA-Z0-9_.-]/.test(filename) || filename.includes("..")) {
    return res.status(400).send("Invalid path");
  }
  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  let filePath = path.join(uploadsRoot, "inventoryx", String(tenantId), "print", "image", filename);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(uploadsRoot, "inventorys", String(tenantId), "print", "image", filename);
  }

  if (!filePath.startsWith(uploadsRoot) || !fs.existsSync(filePath)) {
    return res.status(404).send("Not found");
  }
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.type(path.extname(filename) || "image/jpeg");
  res.sendFile(filePath);
});

router.get("/print/qr/:tenantId/:filename", (req, res) => {
  const { tenantId, filename } = req.params;
  if (!tenantId || !filename || /[^a-zA-Z0-9_.-]/.test(filename) || filename.includes("..")) {
    return res.status(400).send("Invalid path");
  }
  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  let filePath = path.join(uploadsRoot, "inventoryx", String(tenantId), "print", "qr", filename);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(uploadsRoot, "inventorys", String(tenantId), "print", "qr", filename);
  }

  if (!filePath.startsWith(uploadsRoot) || !fs.existsSync(filePath)) {
    return res.status(404).send("Not found");
  }
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.type(path.extname(filename) || "image/png");
  res.sendFile(filePath);
});

// Serve print images via API so CORS works and nginx doesn't need to serve /uploads
router.get("/print/image/:tenantId/:filename", (req, res) => {
  const { tenantId, filename } = req.params;
  if (!tenantId || !filename || /[^a-zA-Z0-9_.-]/.test(filename) || filename.includes("..")) {
    return res.status(400).send("Invalid path");
  }
  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  let filePath = path.join(uploadsRoot, "inventoryx", String(tenantId), "print", "image", filename);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(uploadsRoot, "inventorys", String(tenantId), "print", "image", filename);
  }

  if (!filePath.startsWith(uploadsRoot) || !fs.existsSync(filePath)) {
    return res.status(404).send("Not found");
  }
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.type(path.extname(filename) || "image/jpeg");
  res.sendFile(filePath);
});

router.get("/print/qr/:tenantId/:filename", (req, res) => {
  const { tenantId, filename } = req.params;
  if (!tenantId || !filename || /[^a-zA-Z0-9_.-]/.test(filename) || filename.includes("..")) {
    return res.status(400).send("Invalid path");
  }
  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  let filePath = path.join(uploadsRoot, "inventoryx", String(tenantId), "print", "qr", filename);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(uploadsRoot, "inventorys", String(tenantId), "print", "qr", filename);
  }

  if (!filePath.startsWith(uploadsRoot) || !fs.existsSync(filePath)) {
    return res.status(404).send("Not found");
  }
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.type(path.extname(filename) || "image/png");
  res.sendFile(filePath);
});


const authRoutes = require("../../api/auth/auth.routes");
const userRoutes = require("../../api/user/user.routes");

const roleRoutes = require("../../api/role/role.routes");
const costCenterRoutes = require("../../api/costCenter/costCenter.routes");
const doneByRoutes = require("../../api/doneBy/doneBy.routes");
const tenantRoutes = require("../../api/tenant/tenant.routes");


const itemRoutes = require("../../api/inventorygadgetx/item/item.routes");
const partyRoutes = require("../../api/inventorygadgetx/party/party.routes");
const expenseRoutes = require("../../api/inventorygadgetx/expense/expense.routes");
const salesRoutes = require("../../api/inventorygadgetx/sales/sales.routes");
const accountRoutes = require("../../api/inventorygadgetx/account/account.routes");
const purchaseRoutes = require("../../api/inventorygadgetx/purchase/purchase.routes");
const purchaseReturnRoutes = require("../../api/inventorygadgetx/purchaseReturn/purchaseReturn.routes");
const saleReturnRoutes = require("../../api/inventorygadgetx/saleReturn/saleReturn.routes");
const expenseTypeRoutes = require("../../api/inventorygadgetx/expenseType/expenseType.routes");
const partnerRoutes = require("../../api/inventorygadgetx/partner/partner.routes");
const partnershipRoutes = require("../../api/inventorygadgetx/partnership/partnership.routes");
const dailySummaryRoutes = require("../../api/inventorygadgetx/dailySummary/dailysummary.routes");
const monthlySummaryRoutes = require("../../api/inventorygadgetx/monthlySummary/monthlysummary.routes");
const categoryRoutes = require("../../api/inventorygadgetx/category/category.routes");
const brandRoutes = require("../../api/inventorygadgetx/brand/brand.routes");
const dashboardRoutes = require("./api/dashboard/dashboard.routes");
const unitRoutes = require("../../api/inventorygadgetx/unit/unit.routes");
const employeeRoutes = require("../../api/inventorygadgetx/employee/employee.routes");
const employeepositionRoutes = require("../../api/inventorygadgetx/employeePosition/employeePosition.routes");
const payrollRoutes = require("../../api/inventorygadgetx/payroll/payroll.routes");
const settingsRoutes = require("../../api/inventorygadgetx/settings/settings.routes");
const invoiceRoutes = require("../../api/inventorygadgetx/invoiceNumber/invoiceNumber.routes");
const printSettingsRoutes = require("../../api/inventorygadgetx/printSettings/printSettings.routes");
const registerSessionsRoutes = require("../../api/inventorygadgetx/registerSession/registerSessions.routes");
const costCenterSummaryRoutes = require("../../api/inventorygadgetx/costCenterSummary/costCenterSummary.routes");
const doneBySummaryRoutes = require("../../api/inventorygadgetx/doneBySummary/doneBySummary.routes");
const partySummaryRoutes = require("../../api/inventorygadgetx/partySummary/partySummary.routes");
const stockDetailedReportRoutes = require("../../api/inventorygadgetx/stockDetailedReport/stockDetailedReport.routes");
const itemProfitReportRoutes = require("../../api/inventorygadgetx/itemProfitReport/itemProfitReport.routes");

const dailyProfitReportRoutes = require("../../api/inventorygadgetx/dailyProfitReport/dailyProfitReport.routes");
const periodicProfitReportRoutes = require("../../api/inventorygadgetx/periodicProfitReport/periodicProfitReport.routes");
const balanceSheetReportRoutes = require("../../api/inventorygadgetx/balanceSheetReport/balanceSheetReport.routes");
const taxSummaryReportRoutes = require("../../api/inventorygadgetx/taxSummaryReport/taxSummaryReport.routes");
const stockValueReportRoutes = require("../../api/inventorygadgetx/stockValueReport/stockValueReport.routes");
const transactionRoutes = require('../../api/inventorygadgetx/transaction/transaction.routes')
const modeOfPaymentRoutes = require('../../api/inventorygadgetx/modeOfPayment/modeOfPayment.routes')
const voucherRoutes = require('../../api/inventorygadgetx/voucher/voucher.routes')
const ledgerRoutes = require("../../api/inventorygadgetx/ledger/ledger.routes");
const reportFieldPermissionsRoutes = require("../../api/inventorygadgetx/reportFieldPermissions/reportFieldPermissions.routes");


router.use("/tenants", tenantRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/items", itemRoutes);
router.use("/party", partyRoutes);
router.use("/expenses", expenseRoutes);
router.use("/sales", salesRoutes);
router.use("/accounts", accountRoutes);
router.use("/expense-type", expenseTypeRoutes);
router.use("/cost-centers", costCenterRoutes);
router.use("/done-by", doneByRoutes);
router.use("/invoice", invoiceRoutes);

router.use("/purchase-returns", purchaseReturnRoutes);
router.use("/sale-returns", saleReturnRoutes);

router.use("/partners", partnerRoutes);
router.use("/partnerships", partnershipRoutes);
router.use("/daily-summary", dailySummaryRoutes);
router.use("/monthly-summary", monthlySummaryRoutes);
router.use("/category", categoryRoutes);
router.use("/brand", brandRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/units", unitRoutes);
router.use("/employees", employeeRoutes);
router.use("/employee-position", employeepositionRoutes);
router.use("/employee-payroll", payrollRoutes);
router.use("/roles", roleRoutes);
router.use("/settings", settingsRoutes);
router.use("/print-settings", printSettingsRoutes);

router.use("/cost-center-summary", costCenterSummaryRoutes);
router.use("/done-by-summary", doneBySummaryRoutes);
router.use("/party-summary", partySummaryRoutes);
router.use("/stock-detailed-report", stockDetailedReportRoutes);
router.use("/item-profit-report", itemProfitReportRoutes);

router.use("/daily-profit-report", dailyProfitReportRoutes);
router.use("/periodic-profit-report", periodicProfitReportRoutes);
router.use("/balance-sheet-report", balanceSheetReportRoutes);
router.use("/tax-summary-report", taxSummaryReportRoutes);
router.use("/stock-value-report", stockValueReportRoutes);
router.use("/transactions", transactionRoutes);
router.use("/register-sessions", registerSessionsRoutes);
router.use("/mode-of-payment", modeOfPaymentRoutes);
router.use("/vouchers", voucherRoutes);
router.use("/report-field-permissions", reportFieldPermissionsRoutes);
router.use("/ledgers", ledgerRoutes);

module.exports = router;

