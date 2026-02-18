import * as progressRepository from "./progress.repository.js";
import { fetchProgressCategory } from "../../utils/Progress.js";

export const getContinueLesson = async (userId) => {
  const lastLesson = await progressRepository.getLastCompletedLesson(userId);
  if (!lastLesson) {
    throw new Error("최근 강의가 없습니다");
  }

  const nextLessonId = lastLesson.lesson_id + 1;
  const nextLesson = await progressRepository.getNextLesson(nextLessonId);
  if (!nextLesson) {
    throw new Error("다음 강의가 없습니다.");
  }

  return nextLesson;
};

export const getProgressTopic = async (userId) => {
  return await progressRepository.getUserLessonsStatus(userId);
};

export const getProgressCategory = async (userId) => {
  return await fetchProgressCategory(userId);
};

export const getProgressPercentage = async (userId) => {
  const total = await progressRepository.getTotalLessonsCount();
  const completed = await progressRepository.getUserCompletedLessonsCount(userId);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  return `${progress}%`;
};
