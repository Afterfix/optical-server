class VoucherValidator {
  createOrUpdateValidator = (req, res, next) => {
    const requiredFields = [
      "amount",
      "date",
      "voucher_no",
      "voucher_type",
      "from_ledger",
      "to_ledger",
      "transactions",
    ];

    const missingFields = requiredFields.filter(
      (field) => req.body[field] === undefined || req.body[field] === null
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const { from_ledger, to_ledger, transactions } = req.body;

    if (!from_ledger.ledger_id || from_ledger.amount === undefined) {
      return res
        .status(400)
        .json({ error: "from_ledger must have ledger_id and amount" });
    }

    if (!to_ledger.ledger_id || to_ledger.amount === undefined) {
      return res
        .status(400)
        .json({ error: "to_ledger must have ledger_id and amount" });
    }

    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: "transactions must be an array" });
    }

    for (const trans of transactions) {
      if (
        trans.invoice_id == null ||
        trans.invoice_type == null ||
        trans.received_amount == null
      ) {
        return res.status(400).json({
          error:
            "Each transaction must have invoice_id, invoice_type, and received_amount",
        });
      }
    }

    next();
  };
}

module.exports = VoucherValidator;