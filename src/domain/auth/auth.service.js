import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as authRepository from "./auth.repository.js";

export const registerUser = async (userData) => {
  const { username, loginId, password, email } = userData;

  const existingUsers = await authRepository.findUserByLoginIdOrEmail(
    loginId,
    email
  );

  if (existingUsers.length > 0) {
    throw new Error("이미 존재하는 아이디 또는 이메일입니다.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await authRepository.createUser(
    username,
    loginId,
    hashedPassword,
    email,
    "user"
  );
};

export const authenticateUser = async (loginId, password) => {
  const users = await authRepository.findUserByLoginId(loginId);

  if (users.length === 0) {
    throw new Error("잘못된 아이디입니다.");
  }

  const user = users[0];

  const isValidPassword = await bcrypt.compare(
    String(password),
    String(user.password)
  );

  if (!isValidPassword) {
    throw new Error("잘못된 비밀번호입니다.");
  }

  const payload = {
    id: user.user_id,
    loginId: user.login_id,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, process.env.ACCESS_SECRET, {
    expiresIn: "15m",
    issuer: "suk",
  });

  const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET, {
    expiresIn: "7d",
    issuer: "suk",
  });

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await authRepository.deleteRefreshTokenByUserId(user.user_id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await authRepository.saveRefreshToken(
    user.user_id,
    hashedRefreshToken,
    expiresAt
  );

  return { accessToken, refreshToken, user };
};

export const refreshAccessToken = async (refreshToken) => {
  const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

  const rows = await authRepository.getRefreshTokenByUserId(payload.id);

  if (rows.length === 0) {
    throw new Error("유효하지 않은 토큰");
  }

  const isValid = await bcrypt.compare(
    String(refreshToken),
    String(rows[0].token)
  );

  if (!isValid) {
    throw new Error("유효하지 않은 토큰");
  }

  if (new Date() > new Date(rows[0].expires_at)) {
    console.log("[Service] RefreshToken 만료됨");
    await authRepository.deleteRefreshTokenByUserId(payload.id);
    throw new Error("토큰 만료. 다시 로그인하세요");
  }

  const newAccessToken = jwt.sign(
    {
      id: payload.id,
      loginId: payload.loginId,
      role: payload.role,
    },
    process.env.ACCESS_SECRET,
    { expiresIn: "15m", issuer: "suk" }
  );

  return newAccessToken;
};

export const clearUserSession = async (userId) => {
  await authRepository.deleteRefreshTokenByUserId(userId);
};

export const getUserInfo = async (userId) => {
  const users = await authRepository.findUserById(userId);

  if (users.length === 0) {
    throw new Error("사용자를 찾을 수 없습니다");
  }
  return users[0];
};

export const handleTokenExpiredError = async (refreshToken) => {
  const payload = jwt.decode(refreshToken);

  if (payload?.id) {
    await authRepository.deleteRefreshTokenByUserId(payload.id);
  }
};
