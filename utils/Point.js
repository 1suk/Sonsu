import pool from "../database.js";
import { getWeekStartDate } from "../utils/Date.js";

export async function addUserPoint({
  user_id,
  points,
  reason,
  userLesson_id = null,
  score_id = null,
  attend_date = null,
}) {
  const [existing] = await pool.query(
    `SELECT * FROM user_points 
         WHERE user_id = ? AND reason = ? 
         AND score_id <=> ? AND userLesson_id <=> ?  AND attend_date <=> ?`,
    [user_id, reason, score_id, userLesson_id, attend_date]
  );

  if (existing.length > 0) return; // 중복 방지

  await pool.query(
    `INSERT INTO user_points (user_id, points, reason, userLesson_id, score_id, attend_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, points, reason, userLesson_id, score_id, attend_date]
  );

  const weekStartDate = getWeekStartDate();
  await pool.query(
    `INSERT INTO rankings (user_id, week_start_date, week_points)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE week_points = week_points + ?`,
    [user_id, weekStartDate, points, points]
  );
}
