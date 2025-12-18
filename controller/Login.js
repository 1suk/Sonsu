import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../database.js";

export const register = async (req, res) => {
  const { username, loginId, password, confirmPassword, email } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "비밀번호가 일치하지 않습니다" });
  }

  try {
    const [existingUsers] = await pool.query(
      "SELECT user_id FROM users WHERE login_id = ? OR email = ?",
      [loginId, email]
    );

    if (existingUsers.length > 0) {
      return res
        .status(400)
        .json({ message: "이미 존재하는 아이디 또는 이메일입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (username, login_id, password, email, role) VALUES (?, ?, ?, ?, ?)",
      [username, loginId, hashedPassword, email, "user"]
    );
    res.status(201).json({ message: "회원가입 성공" });
  } catch (error) {
    // console.error("회원가입 오류:", error);
    res.status(500).json({ message: "회원가입 실패", error: error.message });
  }
};

export const login = async (req, res) => {
  const { loginId, password } = req.body;
  try {
    const [users] = await pool.query(`SELECT * FROM users WHERE login_id = ?`, [
      loginId,
    ]);

    if (users.length === 0) {
      return res.status(401).json({ message: "잘못된 아이디입니다." });
    }

    const user = users[0];

    const isValidPassword = await bcrypt.compare(
      String(password),
      String(user.password)
    );
    if (!isValidPassword) {
      return res.status(401).json({ message: "잘못된 비밀번호입니다." });
    }

    const payload = {
      id: user.user_id,
      loginId: user.login_id,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, process.env.ACCESS_SECRET, {
      expiresIn: "30s",
      issuer: "suk",
    });

    const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET, {
      expiresIn: "7d",
      issuer: "suk",
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await pool.query("DELETE FROM refresh_tokens WHERE user_id = ?", [
      user.user_id,
    ]);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.user_id, hashedRefreshToken, expiresAt]
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false, //배포시 true
      sameSite: "strict",
      maxAge: 30 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "로그인 성공",
      user: {
        id: user.user_id,
        loginId: user.login_id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("로그인 오류:", error);
    res.status(500).json({ message: "서버 오류" });
  }
};

export const refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

    const [rows] = await pool.query(
      "SELECT * FROM refresh_tokens WHERE user_id = ?",
      [payload.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "유효하지 않은 토큰" });
    }

    const isValid = await bcrypt.compare(
      String(refreshToken),
      String(rows[0].token)
    );

    if (!isValid) {
      return res.status(401).json({ message: "유효하지 않은 토큰" });
    }

    if (new Date() > new Date(rows[0].expires_at)) {
      await pool.query("DELETE FROM refresh_tokens WHERE user_id = ?", [
        payload.id,
      ]);
      return res.status(401).json({ message: "토큰 만료. 다시 로그인하세요" });
    }

    const newAccessToken = jwt.sign(
      {
        id: payload.id,
        loginId: payload.loginId,
        role: payload.role,
      },
      process.env.ACCESS_SECRET,
      { expiresIn: "30s", issuer: "suk" }
    );

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 30 * 1000,
    });

    return res.status(200).json({
      message: "토큰 갱신 완료",
      accessToken: newAccessToken,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      const payload = jwt.decode(refreshToken);
      if (payload?.id) {
        await pool.query("DELETE FROM refresh_tokens WHERE user_id = ?", [
          payload.id,
        ]);
      }
      return res.status(401).json({
        message: "토큰 만료. 다시 로그인하세요",
      });
    }
    console.error("토큰 갱신 오류:", error);
    return res.status(500).json({ message: "서버 오류" });
  }
};

export const loginSuccess = async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT user_id, login_id, email, role, userName FROM users WHERE user_id = ?",
      [req.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다" });
    }

    console.log(req.user_id);
    res.status(200).json(users[0]);
  } catch (error) {
    console.error("사용자 정보 조회 오류:", error);
    res.status(500).json({ message: "서버 오류" });
  }
};

// 로그아웃
export const logout = async (req, res) => {
  try {
    await pool.query("DELETE FROM refresh_tokens WHERE user_id = ?", [
      req.user_id,
    ]);

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    res.status(200).json({ message: "로그아웃 성공" });
  } catch (error) {
    console.error("로그아웃 오류:", error);
    res.status(500).json({ message: "서버 오류" });
  }
};
