class TokenRepository {

  async create(db, { user_id, refresh_token }) {
    const result = await db.query(
      "INSERT INTO token (user_id, refresh_token) VALUES ($1, $2) RETURNING *",
      [user_id, refresh_token]
    );
    return result.rows[0];
  }

  async getByToken(db, refresh_token) {
    const result = await db.query(
      "SELECT * FROM token WHERE refresh_token = $1",
      [refresh_token]
    );
    return result.rows[0];
  }

  async deleteByToken(db, refresh_token) {
    await db.query("DELETE FROM token WHERE refresh_token = $1", [
      refresh_token,
    ]);
  }

  async deleteByUserId(db, user_id) {
    await db.query("DELETE FROM token WHERE user_id = $1", [user_id]);
  }
}

module.exports = TokenRepository;