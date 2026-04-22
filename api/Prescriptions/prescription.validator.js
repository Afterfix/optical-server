class PrescriptionValidator {
  createValidator(req, res, next) {
    if (
      req.body.prescription_date &&
      isNaN(Date.parse(req.body.prescription_date))
    ) {
      return res
        .status(400)
        .json({ message: "Invalid date format for prescription_date" });
    }
    next();
  }

  updateValidator(req, res, next) {
    if (
      req.body.prescription_date &&
      isNaN(Date.parse(req.body.prescription_date))
    ) {
      return res
        .status(400)
        .json({ message: "Invalid date format for prescription_date" });
    }
    next();
  }
}

module.exports = PrescriptionValidator;
