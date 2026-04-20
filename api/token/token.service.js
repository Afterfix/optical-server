const jwt = require("jsonwebtoken");

class TokenService {
  constructor(tokenRepository, userRepository) {
    this.tokenRepository = tokenRepository;
    this.userRepository = userRepository;
  }

  generateAccessToken(user) {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      const err = new Error("ACCESS_TOKEN_SECRET is not set. Check server .env.");
      err.statusCode = 500;
      throw err;
    }
    const payload = {
      id: user.id,
      name: user.name ?? user.username,
      role: user.role_name ?? null,
      tenant_id: user.tenant_id ?? null,
      role_id: user.role_id ?? null,
      tenant_type: user.tenant_type ?? null,
    };
    return jwt.sign(payload, secret, { expiresIn: "1d" });
  }

  generateRefreshToken(user) {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
      const err = new Error("REFRESH_TOKEN_SECRET is not set. Check server .env.");
      err.statusCode = 500;
      throw err;
    }
    const payload = { id: user.id };
    return jwt.sign(payload, secret, { expiresIn: "7d" });
  }

  async saveRefreshToken(user, refreshToken, db) {
    return this.tokenRepository.create(db, {
      user_id: user.id,
      refresh_token: refreshToken,
    });
  }

  async verifyRefreshToken(refreshToken, db) {
    try {
      const payload = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      const tokenRecord = await this.tokenRepository.getByToken(db, refreshToken);
      if (!tokenRecord) {
        throw new Error("Invalid refresh token");
      }
      return payload;
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  async refreshTokens(refreshToken, db) {
    const payload = await this.verifyRefreshToken(refreshToken, db);
    
    const user = await this.userRepository.getById(db, payload.id);
    if (!user) {
      throw new Error("User not found");
    }

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    await this.tokenRepository.deleteByToken(db, refreshToken);
    await this.saveRefreshToken(user, newRefreshToken, db);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async removeRefreshToken(refreshToken, db) {
    return this.tokenRepository.deleteByToken(db, refreshToken);
  }

  async removeAllRefreshTokensForUser(userId, db) {
    return this.tokenRepository.deleteByUserId(db, userId);
  }
}

module.exports = TokenService;