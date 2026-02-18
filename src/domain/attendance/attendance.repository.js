import pool from "../../config/database.js";

export const getAttendanceByUserId = async (userId) => {
  const [rows] = await pool.query(
    "SELECT * FROM attendances WHERE user_id = ? ORDER BY attend_date DESC",
    [userId]
  );
  return rows;
};
