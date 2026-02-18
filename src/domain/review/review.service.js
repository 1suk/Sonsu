import * as reviewRepository from "./review.repository.js";

export const saveLesson = async (userId, lessonId) => {
  const existing = await reviewRepository.getSavedLesson(userId, lessonId);
  if (existing) {
    return { alreadySaved: true, message: "이미 즐겨찾기에 추가된 강의입니다." };
  }

  await reviewRepository.insertSavedLesson(userId, lessonId);
  return { message: "즐겨찾기 추가되었습니다." };
};

export const getSavedLessons = async (userId) => {
  return await reviewRepository.getUserSavedLessons(userId);
};

export const deleteSavedLesson = async (userId, saveId) => {
  const existing = await reviewRepository.getSavedLesson(userId, saveId);
  if (!existing) {
    throw new Error("해당 즐겨찾기 항목이 존재하지 않습니다.");
  }
  await reviewRepository.deleteSavedLesson(userId, saveId);
};
