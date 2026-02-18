import pool from "../../config/database.js";

export const getSavedLesson = async (userId, lessonId) => {
  const [rows] = await pool.query(
    `SELECT * FROM user_saved WHERE user_id = ? AND lesson_id = ?`,
    [userId, lessonId]
  );
  return rows[0];
};

export const insertSavedLesson = async (userId, lessonId) => {
  await pool.query(
    `INSERT INTO user_saved (user_id, lesson_id) VALUES (?, ?)`,
    [userId, lessonId]
  );
};

export const getUserSavedLessons = async (userId) => {
  const [rows] = await pool.query(
    `SELECT us.userSaved_id, us.lesson_id, l.word, l.animation_path, l.lessonCategory_id 
     FROM user_saved us 
     JOIN lessons l ON us.lesson_id = l.lesson_id 
     WHERE us.user_id = ?`,
    [userId]
  );
  return rows;
};

export const deleteSavedLesson = async (userId, saveId) => {
  await pool.query(
    `DELETE FROM user_saved WHERE lesson_id = ? AND user_id = ?`,
    [saveId, userId]
  );
};
