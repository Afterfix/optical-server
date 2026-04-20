class AuthController {
  constructor(service, tokenService) {
    this.service = service;
    this.tokenService = tokenService;
  }

  async register(req, res, next) {
    try {
      const user = await this.service.registerUser(req.body);
      res.status(201).json({
        id: user.id,
        username: user.username,
        tenant_id: user.tenant_id,
        role_id: user.role_id,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { accessToken, refreshToken, user } = await this.service.login(
        req.body
      );
      res.json({
        message: "Login successful",
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role_name,
          tenant_id: user.tenant_id,
          tenant_type: user.tenant_type,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required" });
      }
      const tokens = await this.tokenService.refreshTokens(refreshToken);
      res.json(tokens);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required" });
      }
      await this.tokenService.removeRefreshToken(refreshToken);
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;