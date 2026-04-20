class RegisterSessionsValidator {
  openValidator = (req, res, next) => {
    const { opening_cash, cost_center_id } = req.body;

    if (opening_cash === undefined || opening_cash === null || opening_cash < 0) {
      return res.status(400).json({ error: "Opening cash is required and must be non-negative." });
    }
    
    // cost_center_id is optional in database but usually required for logic
    // Add check if your business logic strictly requires it
    
    next();
  }

  closeValidator = (req, res, next) => {
    const { closing_cash } = req.body;

    if (closing_cash === undefined || closing_cash === null || closing_cash < 0) {
      return res.status(400).json({ error: "Closing cash is required and must be non-negative." });
    }

    next();
  }
}

module.exports = RegisterSessionsValidator;