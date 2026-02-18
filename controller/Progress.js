import pool from "../database.js";
import { fetchProgressCategory } from "../utils/Progress.js";

export const continueLesson = async (req, res) => {
  const userId = req.user.id;
  if (!userId) {
    return res.status(400).json({ message: "사용자ID가 없습니다." });
  }
  try {
    const [lastLesson] = await pool.query(
      `SELECT * FROM lessons l JOIN user_lessons ul ON l.lesson_id = ul.lesson_id WHERE user_id = ? AND ul.status = 'completed'
          ORDER BY ul.lesson_date DESC LIMIT 1 `,
      [userId]
    );

    if (lastLesson.length === 0) {
      return res.status(404).json({ message: "최근 강의가 없습니다" });
      z;
    }

    const lastLessonId = lastLesson[0].lesson_id;
    const nextLessonId = lastLessonId + 1;
    const [nextLesson] = await pool.query(
      `SELECT l.*, lc.category, ll.level
       FROM lessons l
       JOIN lesson_categories lc ON l.lessonCategory_id = lc.lessonCategory_id
       JOIN lesson_levels ll ON lc.lessonLevel_id = ll.lessonLevel_id
       WHERE l.lesson_id = ?`,
      [nextLessonId]
    );
    if (nextLesson.length === 0) {
      return res.status(404).json({ message: "다음 강의가 없습니다." });
    }
    res.status(200).json({ message: "최근 강의를 불러왔습니다.", nextLesson });
  } catch (error) {
    console.log("에러 발생:", error.message);
    res.status(500).json({ message: "최근 강의 불러오는데 실패했습니다." });
  }
};

export const progressTopic = async (req, res) => {
  const userId = req.user_id;
  if (!userId) {
    return res.status(400).json({ message: "사용자 ID가 없습니다." });
  }

  try {
    const [result] = await pool.query(
      `SELECT l.lesson_id, ul.status
          FROM lessons l
          JOIN user_lessons ul ON l.lesson_id = ul.lesson_id
          WHERE ul.user_id = ?`,
      [userId]
    );
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
    const completedCategories = await fetchProgressCategory(userId);
    res.status(200).json(completedCategories);
    // console.log(completedCategories);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "완료된 카테고리를 가져오는 데 실패했습니다." });
  }
};

export const progressPercentage = async (req, res) => {
  const userId = req.user_id;
  try {
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) as total FROM lessons"
    );

    const [[{ completed }]] = await pool.query(
      "SELECT COUNT(*) as completed FROM user_lessons WHERE user_id = ?",
      [userId]
    );

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return res.status(200).json({
      progress: `${progress}%`,
    });
  } catch (error) {
    console.error("진행률 계산 오류:", error);
    return res.status(500).json({
      success: false,
      message: "진행률 계산 중 오류가 발생했습니다.",
    });
  }
};
