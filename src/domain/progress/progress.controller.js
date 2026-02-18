import * as progressService from "./progress.service.js";

export const continueLesson = async (req, res) => {
  const userId = req.user.id;
  if (!userId) {
    return res.status(400).json({ message: "사용자ID가 없습니다." });
  }

  try {
    const nextLesson = await progressService.getContinueLesson(userId);
    res.status(200).json({ message: "최근 강의를 불러왔습니다.", nextLesson });
  } catch (error) {
    console.log("에러 발생:", error.message);
    const status = error.message.includes("없습니다") ? 404 : 500;
    res.status(status).json({ message: error.message || "최근 강의 불러오는데 실패했습니다." });
  }
};

export const progressTopic = async (req, res) => {
  const userId = req.user_id;
  if (!userId) {
    return res.status(400).json({ message: "사용자 ID가 없습니다." });
  }

  try {
    const result = await progressService.getProgressTopic(userId);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "진행 상태를 가져오는 데 실패했습니다." });
  }
};

export const progressCategory = async (req, res) => {
  const userId = req.user_id;
  if (!userId) {
    return res.status(400).json({ message: "사용자 ID가 없습니다." });
  }

  try {
    const completedCategories = await progressService.getProgressCategory(userId);
    res.status(200).json(completedCategories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "완료된 카테고리를 가져오는 데 실패했습니다." });
  }
};

export const progressPercentage = async (req, res) => {
  const userId = req.user_id;
  try {
    const progress = await progressService.getProgressPercentage(userId);
    return res.status(200).json({ progress });
  } catch (error) {
    console.error("진행률 계산 오류:", error);
    return res.status(500).json({ success: false, message: "진행률 계산 중 오류가 발생했습니다." });
  }
};
