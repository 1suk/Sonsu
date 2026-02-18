import pool from "../../config/database.js";

export const getTodayCompletedLessons = async (userId) => {
  const [rows] = await pool.query(
    `SELECT ul.userLesson_id, l.lesson_id, l.word
     FROM user_lessons ul
     JOIN lessons l ON ul.lesson_id = l.lesson_id
     WHERE ul.user_id = ?
       AND DATE(ul.lesson_date) = CURDATE()
       AND ul.status = 'completed'
     ORDER BY RAND()
     LIMIT 5`,
    [userId]
  );
  return rows;
};

export const getRandomLessonsExcluding = async (excludedWords, limit) => {
  const [rows] = await pool.query(
    `SELECT word FROM lessons
     WHERE word NOT IN (?)
     ORDER BY RAND()
     LIMIT ?`,
    [excludedWords, limit]
  );
  return rows;
};

export const getLessonsByIds = async (lessonIds) => {
  const [rows] = await pool.query(
    `SELECT lesson_id, animation_path FROM lessons WHERE lesson_id IN (?)`,
    [lessonIds]
  );
  return rows;
};

export const createQuizSession = async (userId) => {
  const [result] = await pool.query(
    "INSERT INTO quiz_sessions (user_id) VALUES (?)",
    [userId]
  );
  return result.insertId;
};

export const insertQuizzes = async (values) => {
  const query = `INSERT INTO quizzes (session_id, userLesson_id, lesson_id, question, check_answer) VALUES ?`;
  await pool.query(query, [values]);
};

export const getQuizzesShortBySessionId = async (sessionId) => {
  const [rows] = await pool.query(
    `SELECT quiz_id FROM quizzes WHERE session_id = ?`,
    [sessionId]
  );
  return rows;
};

export const getQuizzesWithLessonDetailsBySessionId = async (sessionId) => {
  const [rows] = await pool.query(
    `SELECT q.quiz_id, q.check_answer, q.lesson_id, l.word AS wrong_word, l.animation_path 
     FROM quizzes q 
     JOIN lessons l ON q.lesson_id = l.lesson_id 
     WHERE q.session_id = ?`,
    [sessionId]
  );
  return rows;
};

export const insertQuizScore = async (userId, sessionId, score, total) => {
  const [result] = await pool.query(
    `INSERT INTO quiz_scores (user_id, session_id, correct_count, total_questions) VALUES (?, ?, ?, ?)`,
    [userId, sessionId, score, total]
  );
  return result.insertId;
};

export const insertWrongAnswers = async (values) => {
  await pool.query(
    `INSERT INTO wrong_answers(user_id, quiz_id, session_id, lesson_id) 
     VALUES ?
     ON DUPLICATE KEY UPDATE recorded_at = CURRENT_TIMESTAMP`,
    [values]
  );
};

export const getUserWrongAnswers = async (userId) => {
  const [rows] = await pool.query(
    `SELECT wa.quiz_id, wa.session_id, wa.lesson_id, lc.part_number, lc.category, l.step_number, l.word, l.animation_path, wa.recorded_at, wa.wrongAnswer_id
     FROM wrong_answers wa
     JOIN lessons l ON l.lesson_id = wa.lesson_id
     JOIN lesson_categories lc ON l.lessonCategory_id = lc.lessonCategory_id 
     WHERE wa.user_id = ?`,
    [userId]
  );
  return rows;
};

export const getWrongAnswer = async (userId, wrongAnswerId) => {
  const [rows] = await pool.query(
    `SELECT * FROM wrong_answers WHERE user_id = ? AND wrongAnswer_id = ?`,
    [userId, wrongAnswerId]
  );
  return rows[0];
};

export const deleteWrongAnswer = async (userId, wrongAnswerId) => {
  await pool.query(
    `DELETE FROM wrong_answers WHERE user_id = ? AND wrongAnswer_id = ?`,
    [userId, wrongAnswerId]
  );
};
