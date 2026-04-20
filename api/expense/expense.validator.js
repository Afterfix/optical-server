class ExpenseValidator {
  createValidator = (req, res, next) => {
    const requiredFields = [
      "description",
      "amount",
      "expense_type_id",
      "amount_paid",
    ];
    const amount = parseFloat(req.body.amount);
    const amountPaid = parseFloat(req.body.amount_paid);

    if (isNaN(amountPaid) || amountPaid < 0) {
      return res.status(400).json({ error: "Invalid amount paid." });
    }

    if (amountPaid > 0) requiredFields.push("ledger_id"); // CHANGED

    if (amountPaid > amount) {
      return res
        .status(400)
        .json({ error: "Amount paid cannot exceed total amount." });
    }

    const missingFields = requiredFields.filter(
      (f) =>
        req.body[f] === undefined || req.body[f] === null || req.body[f] === ""
    );
    if (missingFields.length > 0) {
      return res
        .status(400)
        .json({ error: `Missing fields: ${missingFields.join(", ")}` });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount." });
    }
    next();
  };

  updateValidator = (req, res, next) => {
    if (
      req.body.amount !== undefined &&
      (isNaN(parseFloat(req.body.amount)) || parseFloat(req.body.amount) <= 0)
    ) {
      return res.status(400).json({ error: "Invalid amount." });
    }
    if (
      req.body.amount_paid !== undefined &&
      (isNaN(parseFloat(req.body.amount_paid)) ||
        parseFloat(req.body.amount_paid) < 0)
    ) {
      return res.status(400).json({ error: "Invalid amount paid." });
    }
    next();
  };
}

module.exports = ExpenseValidator;
