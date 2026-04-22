class SalesValidator {
  createValidator = (req, res, next) => {
    const requiredFields = [
      'party_id',
      'payment_status',
      'paid_amount',
      'items',
      'payment_methods',
      'invoice_number',
    ]
    const missingFields = requiredFields.filter(
      (field) => req.body[field] === undefined || req.body[field] === null
    )

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      })
    }

    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ error: 'Items must be a non-empty array' })
    }

    for (const item of req.body.items) {
      if (!item.frame_variant_id && !item.lens_id && !item.lens_addon_id) {
          return res.status(400).json({
              error: 'Each item must have a specific optical ID (frame_variant_id, lens_id, or lens_addon_id)',
          })
      }
      const hasPrice = item.unit_price !== undefined || 
                       (item.frame_price !== undefined || item.lens_price !== undefined || item.addon_price !== undefined);

      if (!item.quantity || !hasPrice) {
        return res.status(400).json({
          error: 'Each item must have quantity and price (unit_price or specialized prices)',
        })
      }
    }

    if (
      !Array.isArray(req.body.payment_methods) ||
      req.body.payment_methods.length === 0
    ) {
      return res
        .status(400)
        .json({ error: 'payment_methods must be a non-empty array' })
    }

    for (const payment of req.body.payment_methods) {
      if (
        !payment.account_id ||
        payment.amount === undefined ||
        payment.amount === null
      ) {
        return res.status(400).json({
          error: 'Each payment method must have account_id and amount',
        })
      }
    }

    const { order_status } = req.body;
    const allowedStatuses = ['pending', 'in_progress', 'ready', 'delivered', 'cancelled'];
    if (order_status && !allowedStatuses.includes(order_status)) {
        return res.status(400).json({
            error: `Invalid order_status. Must be one of: ${allowedStatuses.join(', ')}`,
        });
    }

    next()
  }

  updateValidator = (req, res, next) => {
    const requiredFields = [
      'party_id',
      'payment_status',
      'paid_amount',
      'items',
      'payment_methods',
    ]
    const missingFields = requiredFields.filter(
      (field) => req.body[field] === undefined || req.body[field] === null
    )

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      })
    }

    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ error: 'Items must be a non-empty array' })
    }

    if (
      !Array.isArray(req.body.payment_methods) ||
      req.body.payment_methods.length === 0
    ) {
      return res
        .status(400)
        .json({ error: 'payment_methods must be a non-empty array' })
    }

    for (const payment of req.body.payment_methods) {
      if (
        !payment.account_id ||
        payment.amount === undefined ||
        payment.amount === null
      ) {
        return res.status(400).json({
          error: 'Each payment method must have account_id and amount',
        })
      }
    }

    const { order_status } = req.body;
    const allowedStatuses = ['pending', 'in_progress', 'ready', 'delivered', 'cancelled'];
    if (order_status && !allowedStatuses.includes(order_status)) {
        return res.status(400).json({
            error: `Invalid order_status. Must be one of: ${allowedStatuses.join(', ')}`,
        });
    }

    next()
  }

  idParamValidator = (req, res, next) => {
    const id = req.params.id
    if (!id || isNaN(parseInt(id, 10))) {
      return res.status(400).json({
        error: 'Invalid or missing sales ID',
      })
    }
    next()
  }
}

module.exports = SalesValidator