class AuthService {
  constructor(userRepository, tokenService) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  async registerUser({ username, password, tenant_id, role_id }) {
    if (!username || !password) {
      const error = new Error("Username and password are required");
      error.statusCode = 400;
      throw error;
    }

    const existingUser = await this.userRepository.getByName(username);
    if (existingUser) {
      const error = new Error("Username already exists");
      error.statusCode = 409;
      throw error;
    }

    // The logic to create a super admin if role_id is null is now correctly
    // handled by the UserRepository. We just pass the data along.
    //
    // CRITICAL FIX: The key must be 'username', not 'name'.
    return this.userRepository.create({
      username,
      password,
      tenant_id: tenant_id || null,
      role_id: role_id || null,
    });
  }

  async login({ username, password }) {
    if (!username || !password) {
      const error = new Error("Username and password are required");
      error.statusCode = 400;
      throw error;
    }

    const user = await this.userRepository.getByName(username);
    if (!user || !user.active) {
      const error = new Error("Invalid credentials or inactive user");
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await this.userRepository.comparePasswords(
      password,
      user.password
    );
    if (!isMatch) {
      const error = new Error("Invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = this.tokenService.generateRefreshToken(user);

    await this.tokenService.removeAllRefreshTokensForUser(user.id);
    await this.tokenService.saveRefreshToken(user, refreshToken);

    return { accessToken, refreshToken, user };
  }
}

module.exports = AuthService;