import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as authRepository from "./auth.repository.js";
import redisClient from "../../config/redis.js";


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
  // Redis에 저장 (7일 만료)
  await redisClient.setEx(
    `refreshToken:${user.user_id}`,
    7 * 24 * 60 * 60,
    hashedRefreshToken
  );

  return { accessToken, refreshToken, user };
};

export const refreshAccessToken = async (refreshToken) => {
  const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

  const storedToken = await redisClient.get(`refreshToken:${payload.id}`);

  if (!storedToken) {
    throw new Error("유효하지 않은 토큰");
  }

  const isValid = await bcrypt.compare(String(refreshToken), storedToken);

  if (!isValid) {
    throw new Error("유효하지 않은 토큰");
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
  await redisClient.del(`refreshToken:${userId}`);
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
    await redisClient.del(`refreshToken:${payload.id}`);
  }
};
