const jwt = require("jsonwebtoken");

class TokenService {
  constructor(tokenRepository, userRepository) {
    this.tokenRepository = tokenRepository;
    this.userRepository = userRepository;
  }

  generateAccessToken(user) {
    const payload = {
      id: user.id,
      name: user.name,
      role: user.role_name,
      tenant_id: user.tenant_id,
      role_id: user.role_id,
    };
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1d",
    });
  }

  generateRefreshToken(user) {
    const payload = { id: user.id };
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });
  }

  async saveRefreshToken(user, refreshToken) {
    return this.tokenRepository.create({
      user_id: user.id,
      refresh_token: refreshToken,
    });
  }

  async verifyRefreshToken(refreshToken) {
    try {
      const payload = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      const tokenRecord = await this.tokenRepository.getByToken(refreshToken);
      if (!tokenRecord) {
        throw new Error("Invalid refresh token");
      }
      return payload;
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  async refreshTokens(refreshToken) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.userRepository.getById(payload.id);
    if (!user) {
      throw new Error("User not found");
    }

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    await this.tokenRepository.deleteByToken(refreshToken);
    await this.saveRefreshToken(user, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async removeRefreshToken(refreshToken) {
    return this.tokenRepository.deleteByToken(refreshToken);
  }

  async removeAllRefreshTokensForUser(userId) {
    return this.tokenRepository.deleteByUserId(userId);
  }
}

module.exports = TokenService;