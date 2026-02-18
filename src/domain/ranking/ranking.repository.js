import pool from "../../config/database.js";

export const getWeeklyRanking = async (weekStartDate) => {
  const [rows] = await pool.query(
    `SELECT u.username, r.week_points
     FROM rankings r
     JOIN users u ON u.user_id = r.user_id
     WHERE r.week_start_date = ?
     ORDER BY r.week_points DESC`,
    [weekStartDate]
  );
  return rows;
};
