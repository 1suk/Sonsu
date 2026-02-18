import pool from "../database.js";
import { getWeekStartDate } from "../utils/Date.js";

export const weeklyRanking = async (req, res) => {
  try {
    const weekStartDate = getWeekStartDate();

    const [rows] = await pool.query(
      `SELECT u.username, r.week_points
         FROM rankings r
         JOIN users u ON u.user_id = r.user_id
         WHERE r.week_start_date = ?
         ORDER BY r.week_points DESC`,
      [weekStartDate]
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error("랭킹 조회 오류:", err);
    res.status(500).json({ error: "랭킹 조회 실패" });
  }
};
