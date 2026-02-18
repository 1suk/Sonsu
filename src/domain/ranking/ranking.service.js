import * as rankingRepository from "./ranking.repository.js";
import { getWeekStartDate } from "../../utils/Date.js";

export const getWeeklyRanking = async () => {
  const weekStartDate = getWeekStartDate();
  return await rankingRepository.getWeeklyRanking(weekStartDate);
};
