require("dotenv").config();

const cors = require("cors");
const express = require("express");

const authRoutes = require("./api/auth/auth.routes");
const userRoutes = require("./api/user/user.routes");
const prescriptionRoutes = require("./api/Prescriptions/prescription.routes");

// const employeeRoutes = require("./api/employee/employee.routes");
const employeepositionRoutes = require("./api/employeeposition/employeeposition.routes");
// const employeeAttendanceRoutes = require("./api/employeeAttendance/employeeAttendance.routes");
// const employeePayrollRoutes = require("./api/employeePayroll/employeePayroll.routes");
// const expenseRoutes = require("./api/expense/expense.routes");
// const expenseTypeRoutes = require("./api/expenseType/expenseType.routes");
const cost_centerRoutes = require('./api/costCenter/costCenter.routes')
const done_byRoutes = require('./api/doneBy/doneBy.routes')
// const settingsRoutes = require('./api/settings/settings.routes')
const roleRoutes = require('./api/role/role.routes')
const tenantRoutes = require('./api/tenant/tenant.routes')
const db = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

// Attach DB to request object
app.use((req, res, next) => {
  req.db = db;
  next();
});

const PORT = process.env.PORT || 5000;

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
// app.use("/api/employee", employeeRoutes);
app.use("/api/employee-position", employeepositionRoutes);
// app.use("/api/employee-attendance", employeeAttendanceRoutes);
// app.use("/api/employee-payroll", employeePayrollRoutes);
// app.use("/api/expenses", expenseRoutes);
// app.use('/api/expense-types', expenseTypeRoutes);
app.use('/api/cost-centers', cost_centerRoutes)
app.use('/api/done-by', done_byRoutes)
// app.use('/api/settings', settingsRoutes)
app.use('/api/roles', roleRoutes)
app.use('/api/tenant', tenantRoutes)
app.use("/api/prescriptions", prescriptionRoutes);


app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({ message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
