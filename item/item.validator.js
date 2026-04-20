
class ItemValidator {
  createValidator = (req, res, next) => {
    const requiredFields = [
      "name",
      "category_id",
      "sku",
      "brand_id",
      "unit_id",
      "stock_quantity",
      "purchase_price",
      "selling_price_with_tax", 
      "min_stock_level",
      "party_id",
      "tax",
    ];
    const missingFields = requiredFields.filter(
      (field) =>
        req.body[field] === undefined ||
        req.body[field] === null ||
        req.body[field] === ""
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const numericFields = {
      tax: "Tax",
      selling_price_with_tax: "Selling price with tax"
    };

    for(const field in numericFields) {
      if (
        req.body[field] !== undefined &&
        (isNaN(parseFloat(req.body[field])) || !isFinite(req.body[field]))
      ) {
        return res.status(400).json({ error: `${numericFields[field]} must be a valid number.` });
      }
    }

    next();
  };

  updateValidator = (req, res, next) => {
    const numericFields = [
      "stock_quantity",
      "purchase_price",
      "selling_price_with_tax", 
      "min_stock_level",
      "party_id",
      "category_id",
      "brand_id",
      "unit_id",
      "tax",
    ];

    for (const field of numericFields) {
      if (
        req.body[field] !== undefined &&
        (isNaN(parseFloat(req.body[field])) || !isFinite(req.body[field]))
      ) {
        return res
          .status(400)
          .json({ error: `${field} must be a valid number.` });
      }
    }

    next();
  };
}

module.exports = ItemValidator;