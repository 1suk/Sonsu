import pool from "../../config/database.js";

export const findUserByLoginIdOrEmail = async (loginId, email) => {
  const [rows] = await pool.query(
    "SELECT user_id FROM users WHERE login_id = ? OR email = ?",
    [loginId, email]
  );
  return rows;
};

export const createUser = async (
  username,
  loginId,
  hashedPassword,
  email,
  role
) => {
  const [result] = await pool.query(
    "INSERT INTO users (username, login_id, password, email, role) VALUES (?, ?, ?, ?, ?)",
    [username, loginId, hashedPassword, email, role]
  );
  return result;
};

export const findUserByLoginId = async (loginId) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE login_id = ?`, [
    loginId,
  ]);
  return rows;
};

export const findUserById = async (userId) => {
  const [rows] = await pool.query(
    "SELECT user_id, login_id, email, role, username FROM users WHERE user_id = ?",
    [userId]
  );
  return rows;
};

export const deleteRefreshTokenByUserId = async (userId) => {
  await pool.query("DELETE FROM refresh_tokens WHERE user_id = ?", [userId]);
};

export const saveRefreshToken = async (
  userId,
  hashedRefreshToken,
  expiresAt
) => {
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, hashedRefreshToken, expiresAt]
  );
};

export const getRefreshTokenByUserId = async (userId) => {
  const [rows] = await pool.query(
    "SELECT * FROM refresh_tokens WHERE user_id = ?",
    [userId]
  );
  return rows;
};
