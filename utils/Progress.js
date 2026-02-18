import pool from "../database.js";

export const fetchProgressCategory = async (userId) => {
  if (!userId) {
    throw new Error("사용자 ID가 없습니다.");
  }

  try {
    const [totalLessons] = await pool.query(
      `SELECT lessonCategory_id, COUNT(*) as total
         FROM lessons
         GROUP BY lessonCategory_id`
    );

    const [completedLessons] = await pool.query(
      `SELECT l.lessonCategory_id, COUNT(*) as completed
         FROM lessons l
         JOIN user_lessons ul ON l.lesson_id = ul.lesson_id
         WHERE ul.user_id = ? AND ul.status = 'completed'
         GROUP BY l.lessonCategory_id`,
      [userId]
    );

    if (!Array.isArray(completedLessons) || completedLessons.length === 0) {
      console.warn("완료된 강의가 없습니다.");
      return [];
    }

    const completedCategories = totalLessons
      .map((total) => {
        const completed = completedLessons.find(
          (c) => c.lessonCategory_id === total.lessonCategory_id
        );
        return completed && completed.completed === total.total
          ? total.lessonCategory_id
          : null;
      })
      .filter(Boolean);
    console.log(completedCategories);
    return completedCategories;
  } catch (err) {
    console.error(err);
    throw new Error("완료된 카테고리를 가져오는 데 실패했습니다.");
  }
};
