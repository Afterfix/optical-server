class TransactionValidator {
  createValidator = (req, res, next) => {
    const { transaction_type, amount, account_id, from_account_id, to_account_id } = req.body;
    
    if (!transaction_type || !amount) {
      return res.status(400).json({ error: "Missing required fields: transaction_type, amount" });
    }

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Amount must be a positive number." });
    }

    const singleEntryTypes = ["deposit", "withdrawal", "sale", "purchase", "expense", "sale_return", "purchase_return", "partnership"];
    const transferType = "transfer";

    if (singleEntryTypes.includes(transaction_type)) {
      if (!account_id) {
        return res.status(400).json({ error: "Missing required field for this transaction type: account_id" });
      }
    } else if (transaction_type === transferType) {
      if (!from_account_id || !to_account_id) {
        return res.status(400).json({ error: "Missing required fields for transfer: from_account_id, to_account_id" });
      }
      if (from_account_id === to_account_id) {
        return res.status(400).json({ error: "From and To accounts cannot be the same." });
      }
    } else {
        return res.status(400).json({ error: `Invalid transaction type: ${transaction_type}` });
    }

    next();
  };
}

module.exports = TransactionValidator;