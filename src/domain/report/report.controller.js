import * as reportService from "./report.service.js";

export const weeklyReport = async (req, res) => {
  const userId = req.user_id;

  try {
    const result = await reportService.getWeeklyReport(userId);
    res.json(result);
  } catch (err) {
    console.error("GPT 분석 실패:", err);
    res.status(500).json({ message: "주간 리포트 생성 실패" });
  }
};
