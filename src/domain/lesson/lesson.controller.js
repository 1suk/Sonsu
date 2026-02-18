import * as lessonService from "./lesson.service.js";

export const lessonLevel = async (req, res) => {
  const levelId = req.params.level_id;
  try {
    const categoriesWithWord = await lessonService.getLessonsByLevel(levelId);
    res.json({ categoriesWithWord });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "서버 에러가 발생했습니다." });
  }
};

export const lessonTopic = async (req, res) => {
  const categoryId = req.params.category_id;
  try {
    const lesson = await lessonService.getLessonsByCategory(categoryId);
    res.json(lesson);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
};

export const startLesson = async (req, res) => {
  const userId = req.user_id;
  const { lessonId } = req.body;

  if (!lessonId) {
    return res.status(400).json({ message: "lessonId가 제공되지 않았습니다." });
  }

  try {
    const result = await lessonService.startLesson(userId, lessonId);
    res.status(result.message === "강의 시작" ? 201 : 200).json(result);
  } catch (err) {
    console.error("서버 오류 발생:", err);
    const status = err.message === "존재하지 않는 강의입니다." ? 404 : 500;
    res.status(status).json({ message: err.message });
  }
};

export const CompleteLesson = async (req, res) => {
  const userId = req.user_id;
  const { lessonId } = req.body;

  try {
    const result = await lessonService.completeLesson(userId, lessonId);

    if (result.alreadyCompleted) {
      return res.status(200).json({ message: result.message });
    }

    // 웹소켓 처리
    if (req.io) {
      req.io.emit("categoryUpdated", result.completedCategories);
      req.io.emit("progressUpdated", result.completedLessons);
    } else {
      console.error("WebSocket(io) 객체가 정의되지 않음");
    }

    res.status(200).json({ message: result.message });
  } catch (err) {
    console.error("서버 오류:", err);
    const status = err.message.includes("기록을 찾을 수 없습니다") ? 404 : (err.message.includes("실패") ? 409 : 500);
    res.status(status).json({ error: err.message });
  }
};
