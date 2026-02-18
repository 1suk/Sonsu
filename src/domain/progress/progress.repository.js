import pool from "../../config/database.js";

export const getLastCompletedLesson = async (userId) => {
  const [rows] = await pool.query(
    `SELECT * FROM lessons l JOIN user_lessons ul ON l.lesson_id = ul.lesson_id WHERE user_id = ? AND ul.status = 'completed'
     ORDER BY ul.lesson_date DESC LIMIT 1`,
    [userId]
  );
  return rows[0];
};

export const getNextLesson = async (lessonId) => {
  const [rows] = await pool.query(
    `SELECT l.*, lc.category, ll.level
     FROM lessons l
     JOIN lesson_categories lc ON l.lessonCategory_id = lc.lessonCategory_id
     JOIN lesson_levels ll ON lc.lessonLevel_id = ll.lessonLevel_id
     WHERE l.lesson_id = ?`,
    [lessonId]
  );
  return rows[0];
};

export const getUserLessonsStatus = async (userId) => {
  const [rows] = await pool.query(
    `SELECT l.lesson_id, ul.status
     FROM lessons l
     JOIN user_lessons ul ON l.lesson_id = ul.lesson_id
     WHERE ul.user_id = ?`,
    [userId]
  );
  return rows;
};

export const getTotalLessonsCount = async () => {
  const [rows] = await pool.query("SELECT COUNT(*) as total FROM lessons");
  return rows[0].total;
};

export const getUserCompletedLessonsCount = async (userId) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as completed FROM user_lessons WHERE user_id = ?",
    [userId]
  );
  return rows[0].completed;
};
