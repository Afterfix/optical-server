class AuthService {
  constructor(userRepository, tokenService) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  async registerUser({ username, password, tenant_id, role_id }, db) {
    if (!username || !password) {
      const error = new Error("Username and password are required");
      error.statusCode = 400;
      throw error;
    }

    const existingUser = await this.userRepository.getByName(db, username);
    if (existingUser) {
      const error = new Error("Username already exists");
      error.statusCode = 409;
      throw error;
    }

    return this.userRepository.create(db, {
      username,
      password,
      tenant_id: tenant_id || null,
      role_id: role_id || null,
    });
  }

  async login({ username, password }, db) {
    if (!username || !password) {
      const error = new Error("Username and password are required");
      error.statusCode = 400;
      throw error;
    }

    const user = await this.userRepository.getByName(db, username);

    if (!user || !user.active) {
      const error = new Error("Invalid credentials or inactive user");
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await this.userRepository.comparePasswords(
      password,
      user.password,
    );

    if (!isMatch) {
      const error = new Error("Invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = this.tokenService.generateRefreshToken(user);

    await this.tokenService.removeAllRefreshTokensForUser(user.id, db);
    await this.tokenService.saveRefreshToken(user, refreshToken, db);

    return { accessToken, refreshToken, user };
  }
}

module.exports = AuthService;
