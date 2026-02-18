import * as rankingService from "./ranking.service.js";

export const weeklyRanking = async (req, res) => {
  try {
    const rows = await rankingService.getWeeklyRanking();
    res.status(200).json(rows);
  } catch (err) {
    console.error("랭킹 조회 오류:", err);
    res.status(500).json({ error: "랭킹 조회 실패" });
  }
};
