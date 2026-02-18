import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import {
  register,
  login,
  refreshToken,
  loginSuccess,
  logout,
} from "./src/domain/auth/auth.controller.js";
import {
  lessonLevel,
  lessonTopic,
  startLesson,
  CompleteLesson,
} from "./src/domain/lesson/lesson.controller.js";
import {
  checkQuiz,
  deleteWrongAnswers,
  generateQuiz,
  wrongAnswers,
} from "./src/domain/quiz/quiz.controller.js";
import {
  lessonSaved,
  fetchSavedLesson,
  deleteSavedLesson,
} from "./src/domain/review/review.controller.js";
import authenticateToken from "./src/middlewares/authMiddleware.js";
import { Server as SocketIO } from "socket.io";
import {
  progressCategory,
  progressTopic,
  continueLesson,
  progressPercentage,
} from "./src/domain/progress/progress.controller.js";
import { weeklyReport } from "./src/domain/report/report.controller.js";
import { weeklyRanking } from "./src/domain/ranking/ranking.controller.js";
import { attendance } from "./src/domain/attendance/attendance.controller.js";
import { isAdmin } from "./src/middlewares/authMiddleware.js";
import {
  generateClass,
  deleteClass,
  inviteClass,
  addLessons,
  deletelessons,
  selectClass,
  selectClassAll,
  getUsers,
  addCategories,
  selLessonsUser,
  selLessonsAdmin,
  getUsersClass,
  deleteUserClass,
  delCategories,
  editClass,
  getMypage,
} from "./src/domain/class/class.controller.js";
// import { weeklyReport } from "./controller/Report.js";

const app = express();
const server = http.createServer(app);

const io = new SocketIO(server, {
  cors: {
    origin: [
      "http://192.168.45.217:8081",
      "http://localhost:8081",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/ws",
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on("connection", (socket) => {
  console.log("클라이언트 연결됨");

  socket.on("disconnect", () => {
    console.log("클라이언트 연결 종료됨");
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://192.168.45.217:8081",
      "http://localhost:8081",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "Set-Cookie"],
  })
);

app.get("/", (req, res) => {
  res.send("Hello, Express!!!");
});

app.post("/register", register);
app.post("/login", login);
app.get("/refreshToken", refreshToken);
app.get("/login/success", authenticateToken, loginSuccess);
app.post("/logout", logout);

app.get("/lessons/:level_id/categories", lessonLevel);
app.get("/lessons/:category_id/topics", lessonTopic);
app.post("/lessons/start", authenticateToken, startLesson);
app.post("/lessons/complete", authenticateToken, CompleteLesson);

app.get("/quiz/generate", authenticateToken, generateQuiz);
app.post("/quiz/check", authenticateToken, checkQuiz);
app.get("/quiz/wrong", authenticateToken, wrongAnswers);
app.delete(
  "/quiz/delete/:wrongAnswer_id",
  authenticateToken,
  deleteWrongAnswers
);

app.post("/review/save", authenticateToken, lessonSaved);
app.get("/review/lessons", authenticateToken, fetchSavedLesson);
app.delete("/review/delete/:saveId", authenticateToken, deleteSavedLesson);

app.get("/progress/continue", authenticateToken, continueLesson);
app.post("/progress/categories", authenticateToken, progressCategory);
app.post("/progress/topics", authenticateToken, progressTopic);

app.get("/progress/percentage", authenticateToken, progressPercentage);
app.get("/attend", authenticateToken, attendance);
app.get("/mypage/report", authenticateToken, weeklyReport);
app.get("/mypage/ranking", weeklyRanking);

app.post("/class/generate", authenticateToken, isAdmin, generateClass);
app.delete("/class/delete/:classId", authenticateToken, isAdmin, deleteClass);
app.patch("/class/edit/:classId", authenticateToken, isAdmin, editClass);
app.post("/class/:classId/invite", authenticateToken, isAdmin, inviteClass);
app.post("/class/:classId/add", authenticateToken, isAdmin, addLessons);

app.delete("/class/:classId/delete", authenticateToken, isAdmin, deletelessons);
app.get("/class/lessons", authenticateToken, selLessonsUser);
app.get("/class/:classId/select", authenticateToken, isAdmin, selectClass);
app.get("/class/selectAll", authenticateToken, isAdmin, selectClassAll);
app.get("/class/user", authenticateToken, isAdmin, getUsers);

app.post("/class/:classId/addCate", authenticateToken, isAdmin, addCategories);
app.get("/class/:classId/lessons", authenticateToken, isAdmin, selLessonsAdmin);
app.get("/class/:classId/users", authenticateToken, isAdmin, getUsersClass);
app.delete(
  "/class/:classId/delUsers",
  authenticateToken,
  isAdmin,
  deleteUserClass
);
app.delete(
  "/class/:classId/delCate",
  authenticateToken,
  isAdmin,
  delCategories
);

app.get("/class/:memberId/mypage", authenticateToken, getMypage);

server.listen(process.env.PORT, () => {
  console.log(`Listening on localhost: ${process.env.PORT}`);
});
