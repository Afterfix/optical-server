class PurchaseReturnValidator {
  createValidator = (req, res, next) => {
    const requiredFields = [
      "purchase_id",
      "item_id",
      "return_quantity",
      "invoice_number",
      "payment_methods",
    ];

    const missingFields = requiredFields.filter(
      (field) => req.body[field] === undefined || req.body[field] === null
    );
    if (missingFields.length > 0) {
      return res
        .status(400)
        .json({
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
    }

    // FIX: Add validation to ensure return_quantity is a positive integer.
    if (
      !Number.isInteger(req.body.return_quantity) ||
      req.body.return_quantity < 1
    ) {
      return res
        .status(400)
        .json({ error: "return_quantity must be an integer greater than 0." });
    }

    if (
      !Array.isArray(req.body.payment_methods) ||
      req.body.payment_methods.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "payment_methods must be a non-empty array." });
    }

    for (const payment of req.body.payment_methods) {
      if (
        !payment.account_id ||
        payment.amount === undefined ||
        payment.amount === null
      ) {
        return res
          .status(400)
          .json({
            error: "Each payment method must have account_id and amount",
          });
      }
    }

    next();
  };

  updateValidator = (req, res, next) => {
    if (
      req.body.return_quantity !== undefined &&
      (!Number.isInteger(req.body.return_quantity) || req.body.return_quantity < 1)
    ) {
      return res.status(400).json({
        error: 'return_quantity must be an integer greater than 0.',
      })
    }

    if (
      req.body.refund_amount !== undefined &&
      typeof req.body.refund_amount !== 'number'
    ) {
      return res.status(400).json({
        error: 'refund_amount must be a number.',
      })
    }

    next()
  }
}

module.exports = PurchaseReturnValidator;