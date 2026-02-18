import pool from "../database.js";
import { fetchProgressCategory } from "../utils/Progress.js";
import { addUserPoint } from "../utils/Point.js";

// export const lessonLevel = async (req, res) => {
//   const levelId = req.params.level_id;
//   try {
//     const [results] = await pool.query(
//       "SELECT * FROM lesson_categories WHERE lessonLevel_id = ?",
//       [levelId]
//     );
//     res.json(results);
//     // console.log(results);
//   } catch (err) {
//     console.error(err);
//     return res.status(500).send(err);
//   }
// };

export const lessonLevel = async (req, res) => {
  const levelId = req.params.level_id;

  try {
    const [categories] = await pool.query(
      "SELECT lessonCategory_id, lessonLevel_id, category, part_number FROM lesson_categories WHERE lessonLevel_id = ?",
      [levelId]
    );

    if (!categories.length) {
      return res.json({ categoriesWithWord: [] });
    }

    const categoryIds = categories.map((c) => c.lessonCategory_id);

    const [lessons] = await pool.query(
      "SELECT lesson_id, lessonCategory_id, word FROM lessons WHERE lessonCategory_id IN (?)",
      [categoryIds]
    );

    const categoriesWithWord = categories.map((category) => ({
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
    res.json({ categoriesWithWord });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "서버 에러가 발생했습니다." });
  }
};

// export const lessonTopic = async (req, res) => {
//   const categoryId = req.params.category_id;
//   const bucketName = "sonsustorage.firebasestorage.app";

//   try {
//     const [results] = await pool.query(
//       "SELECT * FROM lessons WHERE lessonCategory_id = ?",
//       [categoryId]
//     );

//     const updatedResults = results.map((lesson) => {
//       if (lesson.animation_path.startsWith("gs://")) {
//         let fileName = lesson.animation_path.split("/").pop();
//         lesson.animation_path = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${fileName}?alt=media`;
//       }
//       return lesson;
//     });
//     res.json(updatedResults);
//   } catch (err) {
//     console.error(err);
//     return res.status(500).send(err);
//   }
// };

export const lessonTopic = async (req, res) => {
  const categoryId = req.params.category_id;

  try {
    const [lesson] = await pool.query(
      "SELECT * FROM lessons WHERE lessonCategory_id = ?",
      [categoryId]
    );

    res.json(lesson);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
};

export const startLesson = async (req, res) => {
  const userId = req.user_id;
  const { lessonId } = req.body;
  console.log("유저정보:", userId);

  if (!lessonId) {
    return res.status(400).json({ message: "lessonId가 제공되지 않았습니다." });
  }

  try {
    // lessonCategory_id 가져오기
    const [lessonInfo] = await pool.query(
      "SELECT lessonCategory_id FROM lessons WHERE lesson_id = ?",
      [lessonId]
    );

    if (lessonInfo.length === 0) {
      return res.status(404).json({ message: "존재하지 않는 강의입니다." });
    }

    const lessonCategoryId = lessonInfo[0].lessonCategory_id;

    // 중복 확인 (이미 진행 중이거나 완료된 강의)
    const [existing] = await pool.query(
      "SELECT * FROM user_lessons WHERE user_id = ? AND lesson_id = ?",
      [userId, lessonId]
    );

    if (existing.length > 0) {
      if (existing[0].status === "in_progress") {
        return res.status(200).json({ message: "강의는 이미 진행 중입니다." });
      }
      if (existing[0].status === "completed") {
        return res.status(200).json({ message: "강의는 이미 완료되었습니다." });
      }
    }

    // INSERT 시 lessonCategory_id 추가 (중복 방지)
    await pool.query(
      "INSERT INTO user_lessons (user_id, lesson_id, lessonCategory_id, status) VALUES (?, ?, ?, 'in_progress')\n       ON DUPLICATE KEY UPDATE\n         lessonCategory_id = VALUES(lessonCategory_id),\n         status = IF(user_lessons.status = 'completed', 'completed', 'in_progress')",
      [userId, lessonId, lessonCategoryId]
    );

    res.status(201).json({ message: "강의 시작" });
  } catch (err) {
    console.error("서버 오류 발생:", err);
    return res
      .status(500)
      .json({ message: "서버 오류 발생", error: err.message });
  }
};

export const CompleteLesson = async (req, res) => {
  const userId = req.user_id;
  const { lessonId } = req.body;

  console.log(
    `[CompleteLesson] 요청 - userId: ${userId}, lessonId: ${lessonId}`
  );

  try {
    // 먼저 이미 완료된 강의인지 확인
    const [existing] = await pool.query(
      "SELECT status FROM user_lessons WHERE user_id = ? AND lesson_id = ?",
      [userId, lessonId]
    );

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ error: "해당 학습 기록을 찾을 수 없습니다." });
    }

    if (existing[0].status === "completed") {
      return res.status(200).json({ message: "이미 완료된 강의입니다." });
    }

    const [result] = await pool.query(
      "UPDATE user_lessons SET status = 'completed' WHERE user_id = ? AND lesson_id = ? AND status != 'completed'",
      [userId, lessonId]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: "강의 완료 처리에 실패했습니다." });
    }

    const [userLessonRows] = await pool.query(
      `
      SELECT userLesson_id FROM user_lessons WHERE user_id = ? AND lesson_id = ?
      `,
      [userId, lessonId]
    );

    const userLessonRow = userLessonRows[0];
    const userLessonId = userLessonRow?.userLesson_id;

    await addUserPoint({
      user_id: userId,
      points: 20,
      reason: "lesson",
      userLesson_id: userLessonId,
    });
    console.log(
      `[CompleteLesson] 레슨 포인트 지급 완료 - userId: ${userId}, points: 20`
    );

    const completedCategories = await fetchProgressCategory(userId);
    // console.log("progressCategory 결과:", completedCategories);

    if (!completedCategories) {
      return res
        .status(500)
        .json({ error: "카테고리 정보를 가져오는 데 실패했습니다." });
    }
    //웹소켓
    if (req.io) {
      req.io.emit("categoryUpdated", completedCategories);
      // console.log("이벤트 전송됨", completedCategories);
    } else {
      console.error("WebSocket(io) 객체가 정의되지 않음");
    }

    // 완료된 강의 정보를 가져오기
    const [completedLessons] = await pool.query(
      `SELECT lesson_id, status FROM user_lessons WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );

    // 완료된 강의 정보를 웹소켓으로 전송
    if (req.io) {
      req.io.emit("progressUpdated", completedLessons);
      console.log("수업 완료 이벤트 전송됨", completedLessons);
    } else {
      console.error("WebSocket(io) 객체가 정의되지 않음");
    }

    // 출석 처리
    await pool.query(
      `INSERT INTO attendances (user_id, attend_date)
         VALUES (?, CURDATE())
         ON DUPLICATE KEY UPDATE status = TRUE`,
      [userId]
    );

    await addUserPoint({
      user_id: userId,
      points: 30,
      reason: "attendance",
      attend_date: new Date().toISOString().split("T")[0],
    });
    console.log(
      `[CompleteLesson] 출석 포인트 지급 완료 - userId: ${userId}, points: 30`
    );

    res.status(200).json({ message: "수강 완료 및 포인트 지급 완료" });
  } catch (err) {
    console.error("서버 오류:", err);
    return res.status(500).json({ error: "서버 오류" });
  }
};
