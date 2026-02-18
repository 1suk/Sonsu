import jwt from "jsonwebtoken";

// const authenticateToken = (req, res, next) => {
//   //console.log("요청 URL:", req.originalUrl);
//   //const token = req.cookies.accessToken;
//   // //if (!token) return res.sendStatus(401);

//   const authHeader = req.headers.authorization;
//   let token;

//   if (authHeader && authHeader.startsWith("Bearer ")) {
//     token = authHeader.substring(7);
//   }

//   if (!token) {
//     return res.status(401).json({ message: "로그인 필요" });
//   }

//   jwt.verify(token, process.env.ACCESS_SECRET, (err, user) => {
//     if (err) return res.status(403).json({ message: "유효하지 않은 토큰" });
//     req.user = user;
//     req.user_id = user.id;
//     req.role = user.role;
//     next();
//   });
// };

// const isAdmin = (req, res, next) => {
//   //console.log("isAdmin :", req.user_id, req.role);
//   if (!req.user_id || req.role !== "admin") {
//     return res.status(403).json({ message: "관리자 권한이 필요합니다." });
//   }
//   next();
// };

export const authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({
      message: "토큰 없음",
      code: "NO_TOKEN",
    });
  }

  try {
    //로그인에서 만들어 둔 payload
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

/*
import jwt from "jsonwebtoken";

const authenticateToken = (req, res, next) => {
  //console.log("요청 URL:", req.originalUrl);
  const token = req.cookies.accessToken;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    //req.user = { id: user.id, role: user.role };
    req.user_id = user.id;
    req.role = user.role;
    next();
  });
};
*/
