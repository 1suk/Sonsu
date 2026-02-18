import pool from "../../config/database.js";

export const createClass = async (className, adminId, description, colorId, classCode) => {
  const [result] = await pool.query(
    `INSERT INTO classes (class_name, admin_id, description, color_id, class_code)
     VALUES (?, ?, ?, ?, ?)`,
    [className, adminId, description, colorId, classCode]
  );
  return result.insertId;
};

export const getClassById = async (classId) => {
  const [rows] = await pool.query(
    `SELECT class_id, class_name, description, class_code, cl.color_hex
     FROM classes c
     JOIN colors cl ON c.color_id = cl.color_id
     WHERE class_id = ?`,
    [classId]
  );
  return rows[0];
};

export const getAllClasses = async () => {
  const [rows] = await pool.query(
    `SELECT class_id, class_name, description, class_code, cl.color_hex
     FROM classes c
     JOIN colors cl ON c.color_id = cl.color_id`
  );
  return rows;
};

export const updateClass = async (classId, fields, values) => {
  const [result] = await pool.query(
    `UPDATE classes SET ${fields.join(",")} WHERE class_id = ?`,
    [...values, classId]
  );
  return result.affectedRows > 0;
};

export const deleteClass = async (classId) => {
  const [result] = await pool.query(`DELETE FROM classes WHERE class_id = ?`, [classId]);
  return result.affectedRows > 0;
};

export const addMembersToClass = async (values) => {
  await pool.query(`INSERT INTO class_groups(class_id, member_id) VALUES ?`, [values]);
};

export const getAllUsers = async () => {
  const [rows] = await pool.query(`SELECT user_id, username FROM users WHERE role = 'user'`);
  return rows;
};

export const addLessonsToClass = async (values) => {
  await pool.query(`INSERT INTO class_lessons (class_id, lesson_id) VALUES ?`, [values]);
};

export const deleteLessonsFromClass = async (classId, lessonIds) => {
  await pool.query(`DELETE FROM class_lessons WHERE class_id = ? AND lesson_id IN (?)`, [classId, lessonIds]);
};

export const getLessonsForUser = async (memberId) => {
  const [rows] = await pool.query(
    `SELECT 
      cl.class_id, cg.member_id, l.lesson_id, l.word, l.animation_path, 
      lc.lessonCategory_id, lc.part_number, lc.category,
      ROW_NUMBER() OVER (PARTITION BY l.lessonCategory_id ORDER BY cl.created_at ASC) AS step_number
     FROM class_lessons cl
     JOIN class_groups cg ON cl.class_id = cg.class_id
     JOIN lessons l ON cl.lesson_id = l.lesson_id
     JOIN lesson_categories lc ON l.lessonCategory_id = lc.lessonCategory_id
     WHERE cg.member_id = ?`,
    [memberId]
  );
  return rows;
};

export const getLessonsForAdmin = async (classId) => {
  const [rows] = await pool.query(
    `SELECT l.lesson_id, l.word, l.animation_path, lc.lessonCategory_id, 
            lc.part_number, lc.category, lc.lessonLevel_id,
            ROW_NUMBER() OVER (PARTITION BY l.lessonCategory_id ORDER BY cl.created_at ASC) AS step_number
     FROM class_lessons cl
     JOIN lessons l ON cl.lesson_id = l.lesson_id
     JOIN lesson_categories lc ON l.lessonCategory_id = lc.lessonCategory_id
     WHERE cl.class_id = ?
     ORDER BY lc.lessonCategory_id, cl.created_at`,
    [classId]
  );
  return rows;
};

export const getLessonsByCategoryIds = async (categoryIds) => {
  const [rows] = await pool.query(
    `SELECT lesson_id FROM lessons WHERE lessonCategory_id IN (?)`,
    [categoryIds]
  );
  return rows;
};

export const getExistingLessonsInClass = async (classId, lessonIds) => {
  const [rows] = await pool.query(
    `SELECT lesson_id FROM class_lessons WHERE class_id = ? AND lesson_id IN (?)`,
    [classId, lessonIds]
  );
  return rows;
};

export const getClassMembers = async (classId) => {
  const [rows] = await pool.query(
    `SELECT class_id, member_id, username
     FROM class_groups cg
     JOIN users u ON u.user_id = cg.member_id
     WHERE class_id = ?`,
    [classId]
  );
  return rows;
};

export const deleteMembersFromClass = async (classId, memberIds) => {
  await pool.query(`DELETE FROM class_groups WHERE class_id = ? AND member_id IN (?)`, [classId, memberIds]);
};

export const getLessonsTotalCount = async () => {
  const [[{ total }]] = await pool.query("SELECT COUNT(*) as total FROM lessons");
  return total;
};

export const getUserCompletedLessonsCount = async (memberId) => {
  const [[{ completed }]] = await pool.query("SELECT COUNT(*) as completed FROM user_lessons WHERE user_id = ?", [memberId]);
  return completed;
};

export const getAttendanceByUserId = async (memberId) => {
  const [rows] = await pool.query("SELECT * FROM attendances WHERE user_id = ? ORDER BY attend_date DESC", [memberId]);
  return rows;
};
