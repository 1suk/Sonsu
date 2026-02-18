import * as quizService from "./quiz.service.js";

export const generateQuiz = async (req, res) => {
  const userId = req.user_id;
  if (!userId) {
    return res.status(400).json({ success: false, message: "userId가 필요합니다." });
  }

  try {
    const result = await quizService.generateQuiz(userId);
    if (result.partial) {
      return res.json({ success: true, message: result.message });
    }
    res.json({ success: true, sessionId: result.sessionId, quizzes: result.quizzes });
  } catch (error) {
    console.error("OX 퀴즈 생성 오류:", error);
    const status = error.message.includes("학습한 단어") ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || "OX 퀴즈 생성 실패" });
  }
};

export const checkQuiz = async (req, res) => {
  const { sessionId, answers } = req.body;
  const userId = req.user_id;

  if (!sessionId || !Array.isArray(answers) || !userId) {
    return res.status(400).json({ success: false, message: "잘못된 요청입니다." });
  }

  try {
    const result = await quizService.checkQuiz(userId, sessionId, answers);
    res.json({
      success: true,
      score: result.score,
      total: result.total,
      results: result.results,
    });
  } catch (error) {
    console.error("퀴즈 채점 오류:", error);
    const status = error.message.includes("찾을 수 없습니다") ? 404 : (error.message.includes("맞지 않습니다") ? 400 : 500);
    res.status(status).json({ success: false, message: error.message || "채점 실패" });
  }
};

export const wrongAnswers = async (req, res) => {
  const userId = req.user_id;
  if (!userId) {
    return res.status(400).json({ message: "userId가 필요합니다" });
  }

  try {
    const rows = await quizService.getWrongAnswers(userId);
    res.json({ success: true, rows });
  } catch (error) {
    console.error("오답 목록 가져오기 실패:", error.message);
    res.status(500).json({ success: false, message: "오답 목록을 가져오는데 실패했습니다." });
  }
};

export const deleteWrongAnswers = async (req, res) => {
  const userId = req.user_id;
  const wrongAnswerId = req.params.wrongAnswer_id;

  if (!userId || !wrongAnswerId) {
    return res.status(400).json({ message: "사용자 ID와 오답 ID가 모두 필요합니다." });
  }

  try {
    await quizService.deleteWrongAnswer(userId, wrongAnswerId);
    res.status(200).json({ message: "오답 항목 삭제가 완료되었습니다." });
  } catch (error) {
    console.error("오답 삭제 실패:", error.message);
    const status = error.message === "저장된 오답 항목이 없습니다" ? 404 : 500;
    res.status(status).json({ message: error.message || "오답 항목 삭제 실패했습니다." });
  }
};
