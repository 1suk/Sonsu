import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({
      message: "토큰 없음",
      code: "NO_TOKEN",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.ACCESS_SECRET);
    req.user = payload;
    req.user_id = payload.id;
    req.role = payload.role;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "토큰 만료",
        code: "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({ message: "유효하지 않은 토큰" });
  }
};

export const isAdmin = (req, res, next) => {
  if (!req.user_id || req.role !== "admin") {
    return res.status(403).json({ message: "관리자 권한이 필요합니다" });
  }
  next();
};

export default authenticateToken;
