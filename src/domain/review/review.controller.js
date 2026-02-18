import * as reviewService from "./review.service.js";

export const lessonSaved = async (req, res) => {
  const userId = req.user_id;
  const lessonId = req.body.lessonId;

  if (!userId || !lessonId) {
    return res.status(400).json({ message: "사용자 ID와 강의 ID가 필요합니다." });
  }

  try {
    const result = await reviewService.saveLesson(userId, lessonId);
    res.status(200).json({ message: result.message });
  } catch (error) {
    console.error("즐겨찾기 추가 실패:", error.message);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const fetchSavedLesson = async (req, res) => {
  const userId = req.user_id;

  try {
    const rows = await reviewService.getSavedLessons(userId);
    res.status(200).json(rows);
  } catch (error) {
    console.log("불러오기 실패:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const deleteSavedLesson = async (req, res) => {
  const userId = req.user_id;
  const saveId = req.params.saveId;

  if (!userId || !saveId) {
    return res.status(400).json({ message: "사용자 ID와 저장된 강의 ID가 필요합니다." });
  }

  try {
    await reviewService.deleteSavedLesson(userId, saveId);
    res.status(200).json({ message: "즐겨찾기에서 삭제되었습니다." });
  } catch (error) {
    console.log("즐겨찾기 항목 삭제 실패", error.message);
    const status = error.message.includes("존재하지 않습니다") ? 404 : 500;
    res.status(status).json({ message: error.message || "서버 오류가 발생했습니다" });
  }
};
