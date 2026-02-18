import * as attendanceService from "./attendance.service.js";

export const attendance = async (req, res) => {
  const userId = req.user_id;

  if (!userId) {
    return res.status(400).json({ message: "사용자 ID가 필요합니다" });
  }

  try {
    const attendanceRecords = await attendanceService.getUserAttendance(userId);
    res.status(200).json({
      message: "출석 기록 조회가 완료되었습니다.",
      data: attendanceRecords,
    });
  } catch (error) {
    console.error("출석 기록 조회 중 오류 발생:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};
