class TokenRepository {
  constructor(db) {
    this.db = db;
  }

  async create({ user_id, refresh_token }) {
    const result = await this.db.query(
      "INSERT INTO token (user_id, refresh_token) VALUES ($1, $2) RETURNING *",
      [user_id, refresh_token]
    );
    return result.rows[0];
  }

  async getByToken(refresh_token) {
    const result = await this.db.query(
      "SELECT * FROM token WHERE refresh_token = $1",
      [refresh_token]
    );
    return result.rows[0];
  }

  async deleteByToken(refresh_token) {
    await this.db.query("DELETE FROM token WHERE refresh_token = $1", [
      refresh_token,
    ]);
  }

  async deleteByUserId(user_id) {
    await this.db.query("DELETE FROM token WHERE user_id = $1", [user_id]);
  }
}

module.exports = TokenRepository;