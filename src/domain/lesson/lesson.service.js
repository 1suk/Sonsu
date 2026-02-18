import * as lessonRepository from "./lesson.repository.js";
import { fetchProgressCategory } from "../../utils/Progress.js";
import { addUserPoint } from "../../utils/Point.js";

export const getLessonsByLevel = async (levelId) => {
  const categories = await lessonRepository.getCategoriesByLevelId(levelId);

  if (!categories.length) {
    return [];
  }

  const categoryIds = categories.map((c) => c.lessonCategory_id);
  const lessons = await lessonRepository.getLessonsByCategoryIds(categoryIds);

  return categories.map((category) => ({
    ...category,
    words: lessons
      .filter(
        (lesson) => lesson.lessonCategory_id === category.lessonCategory_id
      )
      .map((lesson) => ({
        lessonId: lesson.lesson_id,
        word: lesson.word,
      })),
  }));
};

export const getLessonsByCategory = async (categoryId) => {
  return await lessonRepository.getLessonsByCategoryId(categoryId);
};

export const startLesson = async (userId, lessonId) => {
  const lessonInfo = await lessonRepository.getLessonById(lessonId);

  if (!lessonInfo) {
    throw new Error("존재하지 않는 강의입니다.");
  }

  const existing = await lessonRepository.getUserLesson(userId, lessonId);

  if (existing) {
    if (existing.status === "in_progress") {
      return { message: "강의는 이미 진행 중입니다." };
    }
    if (existing.status === "completed") {
      return { message: "강의는 이미 완료되었습니다." };
    }
  }

  await lessonRepository.upsertUserLesson(
    userId,
    lessonId,
    lessonInfo.lessonCategory_id,
    "in_progress"
  );
  return { message: "강의 시작" };
};

export const completeLesson = async (userId, lessonId) => {
  const existing = await lessonRepository.getUserLesson(userId, lessonId);

  if (!existing) {
    throw new Error("해당 학습 기록을 찾을 수 없습니다.");
  }

  if (existing.status === "completed") {
    return { alreadyCompleted: true, message: "이미 완료된 강의입니다." };
  }

  // 2. 상태 업데이트
  console.log("[Service] 상태 업데이트 시도...");
  const success = await lessonRepository.updateUserLessonStatus(
    userId,
    lessonId,
    "completed"
  );

  if (!success) {
    throw new Error("강의 완료 처리에 실패했습니다.");
  }

  // 3. userLessonId 조회
  const userLessonId = await lessonRepository.getUserLessonId(userId, lessonId);

  // 4. 레슨 완료 포인트 지급
  try {
    await addUserPoint({
      user_id: userId,
      points: 20,
      reason: "lesson",
      userLesson_id: userLessonId,
    });
  } catch (error) {
    console.error("레슨 포인트 지급 실패:", error);
    throw error;
  }

  const completedCategories = await fetchProgressCategory(userId);

  if (!completedCategories) {
    throw new Error("카테고리 정보를 가져오는데 실패했습니다.");
  }

  // 6. 완료된 레슨 목록 조회
  const completedLessons = await lessonRepository.getCompletedLessons(userId);

  // 7. 출석 처리
  try {
    await lessonRepository.upsertAttendance(userId);
    console.log("[출석 처리 완료");
  } catch (error) {
    console.error("출석 처리 실패:", error);
    throw error;
  }

  // 8. 출석 포인트 지급
  try {
    await addUserPoint({
      user_id: userId,
      points: 30,
      reason: "attendance",
      attend_date: new Date().toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("[출석 포인트 지급 실패:", error);
    throw error;
  }

  return {
    message: "수강 완료 및 포인트 지급 완료",
    completedCategories,
    completedLessons,
  };
};
