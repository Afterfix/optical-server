require("dotenv").config();
const path = require("path");
const cors = require("cors");
const express = require("express");
const dbSelector = require("./middlewares/dbSelector");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const physiquexApp = require("./apps/physiquex/app.routes");
const wheelxApp = require("./apps/wheelx/app.routes");
const buildxApp = require("./apps/buildx/app.routes");
const gadgetxApp = require("./apps/gadgetx/app.routes");
const travelxApp = require("./apps/travelx/app.routes");
const invoicexApp = require("./apps/invoicex/app.routes");
const inventoryxApp = require("./apps/inventoryx/app.routes");

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  if (['POST', 'PUT'].includes(req.method)) {
    console.log(`[BODY]`, JSON.stringify(req.body, null, 2));
  }
  next();
});

// CORS for /uploads so frontend (e.g. shark-app on DigitalOcean) can load images from api.accountx.app
// Enable CORS for all /uploads routes (including sub-paths)
app.use('/uploads', (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
const staticPath = path.resolve(process.cwd(), 'uploads');
// Fix: Map /uploads/gadgets requests to /uploads/gadgetx to handle cached/old URLs
app.use('/uploads/gadgets', express.static(path.join(process.cwd(), 'uploads/gadgetx')));
// Fix: Map /uploads/gadgetx requests to /uploads/gadgets to handle uploads that went to the wrong folder
app.use('/uploads/gadgetx', express.static(path.join(process.cwd(), 'uploads/gadgets')));
app.use('/uploads', express.static(staticPath));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes.",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// app.use(limiter);

app.use("/api/wheelx", dbSelector("wheelx"), (req, res, next) => {
  wheelxApp(req, res, next);
});
app.use("/api/physiquex", dbSelector("physiquex"), (req, res, next) => {
  physiquexApp(req, res, next);
});
app.use("/api/buildx", dbSelector("buildx"), (req, res, next) => {
  buildxApp(req, res, next);
});
app.use("/api/gadgetx", dbSelector("gadgetx"), (req, res, next) => {
  gadgetxApp(req, res, next);
});

app.use("/api/travelx", dbSelector("travelx"), (req, res, next) => {
  travelxApp(req, res, next);
});

app.use("/api/invoicex", dbSelector("invoicex"), (req, res, next) => {
  invoicexApp(req, res, next);
});
app.use("/api/inventoryx", dbSelector("inventoryx"), (req, res, next) => {
  inventoryxApp(req, res, next);
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "AccountX API running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Global error handler: log and respond so 500s are debuggable
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  console.error("[Error]", status, err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }
  res.status(status).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
