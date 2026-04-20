module.exports = async (client) => {
  try {
    // Check if the trigger already exists
    const result = await client.query(`
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_purchase_return_payment_insert';
    `);

    const triggersExist = result.rowCount > 0;

    if (triggersExist) {
      console.log('ℹ️ "purchase_return_payment" triggers already exist.');
    } else {
      await client.query(purchaseReturnPaymentQuery);
      console.log('✅ "purchase_return_payment" triggers have been added.');
    }
  } catch (err) {
    console.error('❌ Failed to create "purchase_return_payment" triggers:', err.message);
    throw err;
  }
};

const purchaseReturnPaymentQuery = `
-- =====================================================
-- INSERT FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION purchase_return_payment_after_insert()
RETURNS TRIGGER AS $$
DECLARE
  txn_id INTEGER;
  abs_amount NUMERIC;
BEGIN
  IF NEW.amount = 0 OR NEW.account_id IS NULL OR NEW.purchase_return_id IS NULL THEN
    RETURN NEW;
  END IF;

  abs_amount := ABS(NEW.amount);

  INSERT INTO "transaction" (
    tenant_id,
    transaction_type,
    reference_id,
    description
  ) VALUES (
    NEW.tenant_id,
    'purchase_return',
    NEW.purchase_return_id,
    'Purchase return refund'
  ) RETURNING id INTO txn_id;

  INSERT INTO transaction_ledger (
    tenant_id,
    transaction_id,
    account_id,
    credit
  ) VALUES (
    NEW.tenant_id,
    txn_id,
    NEW.account_id,
    abs_amount
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- INSERT trigger
-- =====================================================
CREATE TRIGGER trg_purchase_return_payment_insert
AFTER INSERT ON transaction_payments
FOR EACH ROW
WHEN (NEW.purchase_return_id IS NOT NULL)
EXECUTE FUNCTION purchase_return_payment_after_insert();


-- =====================================================
-- UPDATE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION purchase_return_payment_after_update()
RETURNS TRIGGER AS $$
DECLARE
  txn_id INTEGER;
  abs_amount NUMERIC;
BEGIN
  IF NEW.amount = 0 OR NEW.account_id IS NULL THEN
    DELETE FROM "transaction"
    WHERE reference_id = OLD.purchase_return_id
      AND id IN (
        SELECT transaction_id
        FROM transaction_ledger
        WHERE account_id = OLD.account_id
      );
    RETURN NEW;
  END IF;

  abs_amount := ABS(NEW.amount);

  SELECT t.id INTO txn_id
  FROM "transaction" t
  JOIN transaction_ledger tl ON tl.transaction_id = t.id
  WHERE t.reference_id = NEW.purchase_return_id
    AND tl.account_id = OLD.account_id
  LIMIT 1;

  IF txn_id IS NOT NULL THEN
    UPDATE "transaction"
    SET
      description = 'Purchase return refund updated'
    WHERE id = txn_id;

    UPDATE transaction_ledger
    SET
      account_id = NEW.account_id,
      credit = abs_amount
    WHERE transaction_id = txn_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- UPDATE trigger
-- =====================================================
CREATE TRIGGER trg_purchase_return_payment_update
AFTER UPDATE ON transaction_payments
FOR EACH ROW
WHEN (NEW.purchase_return_id IS NOT NULL)
EXECUTE FUNCTION purchase_return_payment_after_update();


-- =====================================================
-- DELETE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION purchase_return_payment_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "transaction"
  WHERE reference_id = OLD.purchase_return_id
    AND id IN (
      SELECT transaction_id
      FROM transaction_ledger
      WHERE account_id = OLD.account_id
    );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- DELETE trigger
-- =====================================================
CREATE TRIGGER trg_purchase_return_payment_delete
AFTER DELETE ON transaction_payments
FOR EACH ROW
WHEN (OLD.purchase_return_id IS NOT NULL)
EXECUTE FUNCTION purchase_return_payment_after_delete();
`;