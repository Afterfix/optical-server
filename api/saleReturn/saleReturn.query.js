module.exports = async (client) => {
  try {
    await client.query(saleReturnPaymentQuery);
    console.log("✅ Sale Return payment triggers added");
  } catch (e) {
    console.error("❌ Error creating sale return payment triggers:", e.message);
    throw e;
  }
};

const saleReturnPaymentQuery = `

BEGIN;

-- =====================================================
-- INSERT FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION sale_return_payment_after_insert()
RETURNS TRIGGER AS $$
DECLARE
  txn_id INTEGER;
  abs_amount NUMERIC;
BEGIN
  IF NEW.amount = 0 OR NEW.account_id IS NULL OR NEW.sale_return_id IS NULL THEN
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
    'sale_return',
    NEW.sale_return_id,
    'Sale return refund'
  ) RETURNING id INTO txn_id;

  INSERT INTO transaction_ledger (
    tenant_id,
    transaction_id,
    account_id,
    debit
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
CREATE TRIGGER trg_sale_return_payment_insert
AFTER INSERT ON transaction_payments
FOR EACH ROW
WHEN (NEW.sale_return_id IS NOT NULL)
EXECUTE FUNCTION sale_return_payment_after_insert();


-- =====================================================
-- UPDATE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION sale_return_payment_after_update()
RETURNS TRIGGER AS $$
DECLARE
  txn_id INTEGER;
  abs_amount NUMERIC;
BEGIN
  IF NEW.amount = 0 OR NEW.account_id IS NULL THEN
    DELETE FROM "transaction"
    WHERE reference_id = OLD.sale_return_id
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
  WHERE t.reference_id = NEW.sale_return_id
    AND tl.account_id = OLD.account_id
  LIMIT 1;

  UPDATE "transaction"
  SET
    description = 'Sale return refund updated'
  WHERE id = txn_id;

  UPDATE transaction_ledger
  SET
    account_id = NEW.account_id,
    debit = abs_amount
  WHERE transaction_id = txn_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- UPDATE trigger
-- =====================================================
CREATE TRIGGER trg_sale_return_payment_update
AFTER UPDATE ON transaction_payments
FOR EACH ROW
WHEN (NEW.sale_return_id IS NOT NULL)
EXECUTE FUNCTION sale_return_payment_after_update();


-- =====================================================
-- DELETE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION sale_return_payment_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "transaction"
  WHERE reference_id = OLD.sale_return_id
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
CREATE TRIGGER trg_sale_return_payment_delete
AFTER DELETE ON transaction_payments
FOR EACH ROW
WHEN (OLD.sale_return_id IS NOT NULL)
EXECUTE FUNCTION sale_return_payment_after_delete();

COMMIT;

`;
