import pool from "../../config/database.js";

export const getCategoriesByLevelId = async (levelId) => {
  const [rows] = await pool.query(
    "SELECT lessonCategory_id, lessonLevel_id, category, part_number FROM lesson_categories WHERE lessonLevel_id = ?",
    [levelId]
  );
  return rows;
};

export const getLessonsByCategoryIds = async (categoryIds) => {
  const [rows] = await pool.query(
    "SELECT lesson_id, lessonCategory_id, word FROM lessons WHERE lessonCategory_id IN (?)",
    [categoryIds]
  );
  return rows;
};

export const getLessonsByCategoryId = async (categoryId) => {
  const [rows] = await pool.query(
    "SELECT * FROM lessons WHERE lessonCategory_id = ?",
    [categoryId]
  );
  return rows;
};

export const getLessonById = async (lessonId) => {
  const [rows] = await pool.query(
    "SELECT lessonCategory_id FROM lessons WHERE lesson_id = ?",
    [lessonId]
  );
  return rows[0];
};

export const getUserLesson = async (userId, lessonId) => {
  const [rows] = await pool.query(
    "SELECT * FROM user_lessons WHERE user_id = ? AND lesson_id = ?",
    [userId, lessonId]
  );
  return rows[0];
};

export const getUserLessonId = async (userId, lessonId) => {
  const [rows] = await pool.query(
    "SELECT userLesson_id FROM user_lessons WHERE user_id = ? AND lesson_id = ?",
    [userId, lessonId]
  );
  return rows[0]?.userLesson_id;
};

export const upsertUserLesson = async (userId, lessonId, lessonCategoryId, status) => {
  await pool.query(
    "INSERT INTO user_lessons (user_id, lesson_id, lessonCategory_id, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE lessonCategory_id = VALUES(lessonCategory_id), status = IF(user_lessons.status = 'completed', 'completed', VALUES(status))",
    [userId, lessonId, lessonCategoryId, status]
  );
};

export const updateUserLessonStatus = async (userId, lessonId, status) => {
  const [result] = await pool.query(
    "UPDATE user_lessons SET status = ? WHERE user_id = ? AND lesson_id = ? AND status != ?",
    [status, userId, lessonId, status]
  );
  return result.affectedRows > 0;
};

export const getCompletedLessons = async (userId) => {
  const [rows] = await pool.query(
    "SELECT lesson_id, status FROM user_lessons WHERE user_id = ? AND status = 'completed'",
    [userId]
  );
  return rows;
};

export const upsertAttendance = async (userId) => {
  await pool.query(
    "INSERT INTO attendances (user_id, attend_date) VALUES (?, CURDATE()) ON DUPLICATE KEY UPDATE status = TRUE",
    [userId]
  );
};
