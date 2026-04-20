// --- START OF FILE purchase.validator.js ---

class PurchaseValidator {
  createValidator = (req, res, next) => {
    const requiredFields = [
      'party_id',
      'date',
      'paid_amount',
      'items',
      'payment_methods',
      'invoice_number',
    ];

    const missingFields = requiredFields.filter(
      (field) => req.body[field] === undefined || req.body[field] === null
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ error: 'Items must be a non-empty array' });
    }

    for (const item of req.body.items) {
      if (!item.item_id || !item.quantity || item.unit_price === undefined) {
        return res.status(400).json({
          error: 'Each item must have item_id, quantity, and unit_price',
        });
      }
    }

    // FIX: Changed the validation logic. We only check if it's an array.
    // An empty array is now valid for zero-payment purchases.
    if (!Array.isArray(req.body.payment_methods)) {
      return res
        .status(400)
        .json({ error: 'payment_methods must be an array' });
    }

    for (const payment of req.body.payment_methods) {
      if (
        !payment.account_id ||
        payment.amount === undefined ||
        payment.amount === null
      ) {
        return res.status(400).json({
          error: 'Each payment method must have account_id and amount',
        });
      }
    }

    next();
  };

  updateValidator = (req, res, next) => {
    this.createValidator(req, res, next);
  };
}
module.exports = PurchaseValidator;