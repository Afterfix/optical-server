module.exports = async (client) => {
  try {
    // Check if the trigger already exists in the system catalog
    const result = await client.query(`
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_account_insert';
    `);

    const triggersExist = result.rowCount > 0;

    if (triggersExist) {
      console.log('ℹ️ "account" triggers already exist.');
    } else {
      await client.query(accountQuery);
      console.log('✅ "account" triggers have been added.');
    }
  } catch (err) {
    // Using single quotes on the outside to prevent SyntaxErrors with "account"
    console.error('❌ Failed to add "account" triggers:', err.message);
    throw err;
  }
};

const accountQuery = `
---------------------------------------------------
-- INSERT TRIGGER : Initial Balance
---------------------------------------------------
CREATE OR REPLACE FUNCTION account_after_insert()
RETURNS TRIGGER AS $$
DECLARE
  txn_id INTEGER;
BEGIN
  -- Only create transaction if initial balance > 0
  IF NEW.balance > 0 THEN

    INSERT INTO "transaction" (
      tenant_id,
      transaction_type,
      reference_id,
      cost_center_id,
      done_by_id,
      description
    ) VALUES (
      NEW.tenant_id,
      'deposit',
      NEW.id,
      NEW.cost_center_id,
      NEW.done_by_id,
      'Initial account balance'
    )
    RETURNING id INTO txn_id;

    INSERT INTO transaction_ledger (
      tenant_id,
      transaction_id,
      account_id,
      credit
    ) VALUES (
      NEW.tenant_id,
      txn_id,
      NEW.id,
      NEW.balance
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_account_insert
AFTER INSERT ON account
FOR EACH ROW
EXECUTE FUNCTION account_after_insert();

---------------------------------------------------
-- DELETE TRIGGER : Cleanup
---------------------------------------------------
CREATE OR REPLACE FUNCTION account_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "transaction"
  WHERE transaction_type = 'deposit'
    AND reference_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_account_delete
AFTER DELETE ON account
FOR EACH ROW
EXECUTE FUNCTION account_after_delete();
`;