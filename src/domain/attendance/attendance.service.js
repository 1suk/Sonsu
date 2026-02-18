import * as attendanceRepository from "./attendance.repository.js";

export const getUserAttendance = async (userId) => {
  return await attendanceRepository.getAttendanceByUserId(userId);
};
