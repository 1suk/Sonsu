import * as authService from "./auth.service.js";

export const register = async (req, res) => {
  const { username, loginId, password, confirmPassword, email } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "비밀번호가 일치하지 않습니다" });
  }

  try {
    await authService.registerUser({ username, loginId, password, email });
    res.status(201).json({ message: "회원가입 성공" });
  } catch (error) {
    res
      .status(
        error.message === "이미 존재하는 아이디 또는 이메일입니다." ? 400 : 500
      )
      .json({ message: error.message || "회원가입 실패" });
  }
};

export const login = async (req, res) => {
  const { loginId, password } = req.body;
  try {
    const { accessToken, refreshToken, user } =
      await authService.authenticateUser(loginId, password);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false, // 배포시 true
      sameSite: "lax",
      maxAge: 30 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
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
    const status = error.message.includes("잘못된") ? 401 : 500;
    res.status(status).json({ message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    const newAccessToken = await authService.refreshAccessToken(refreshToken);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 30 * 1000,
    });

    return res.status(200).json({
      message: "토큰 갱신 완료",
      accessToken: newAccessToken,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.message.includes("만료")) {
      await authService.handleTokenExpiredError(refreshToken);
      return res.status(401).json({ message: "토큰 만료. 다시 로그인하세요" });
    }
    console.error("토큰 갱신 오류:", error);
    return res.status(500).json({ message: error.message || "서버 오류" });
  }
};

export const loginSuccess = async (req, res) => {
  try {
    const user = await authService.getUserInfo(req.user_id);
    res.status(200).json(user);
  } catch (error) {
    const status = error.message === "사용자를 찾을 수 없습니다" ? 404 : 500;
    res.status(status).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    await authService.clearUserSession(req.user_id);

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.status(200).json({ message: "로그아웃 성공" });
  } catch (error) {
    console.error("로그아웃 오류:", error);
    res.status(500).json({ message: "서버 오류" });
  }
};
