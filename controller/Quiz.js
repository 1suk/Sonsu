import pool from "../database.js";
import { addUserPoint } from "../utils/Point.js";

export const generateQuiz = async (req, res) => {
  const userId = req.user_id;
  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "userId가 필요합니다." });
  }

  try {
    const [lessonData] = await pool.query(
      `SELECT ul.userLesson_id, l.lesson_id, l.word
       FROM user_lessons ul
       JOIN lessons l ON ul.lesson_id = l.lesson_id
       WHERE ul.user_id = ?
         AND DATE(ul.lesson_date) = CURDATE()
         AND ul.status = 'completed'
       ORDER BY RAND()
       LIMIT 5`,
      [userId]
    );

    if (lessonData.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "오늘 학습한 단어가 없습니다." });
    }

    if (lessonData.length < 5) {
      return res.json({
        success: true,
        message: `오늘 학습한 단어가 ${lessonData.length}개입니다. 5문제 풀어주세요.`,
      });
    }
    const learnedWords = lessonData.map((l) => l.word);

    // ✅ lessonData에 포함되지 않은 단어 중에서 랜덤하게 5개 추출
    const [randomLessons] = await pool.query(
      `SELECT word FROM lessons
       WHERE word NOT IN (?)
       ORDER BY RAND()
       LIMIT ?`,
      [learnedWords, lessonData.length]
    );

    const lessonIds = lessonData.map((lesson) => lesson.lesson_id);

    const [animationData] = await pool.query(
      `SELECT lesson_id, animation_path FROM lessons WHERE lesson_id IN (?)`,
      [lessonIds]
    );

    const animationMap = animationData.reduce((acc, item) => {
      acc[item.lesson_id] = item.animation_path || null;
      return acc;
    }, {});

    const quizData = lessonData.map((lesson, index) => {
      const isCorrect = Math.random() < 0.5;
      const wrongWord = randomLessons[index]?.word || "잘못된 단어";
      const question = isCorrect ? lesson.word : wrongWord;

      return {
        question,
        check_answer: isCorrect,
        userLesson_id: lesson.userLesson_id,
        lesson_id: lesson.lesson_id,
        animation_path: animationMap[lesson.lesson_id] || null,
      };
    });

    const [sessionResult] = await pool.query(
      "INSERT INTO quiz_sessions (user_id) VALUES (?)",
      [userId]
    );
    const sessionId = sessionResult.insertId;

    const quizInsertQuery = `INSERT INTO quizzes (session_id, userLesson_id, lesson_id, question, check_answer) VALUES ?`;
    const quizValues = quizData.map((quiz) => [
      sessionId,
      quiz.userLesson_id,
      quiz.lesson_id,
      quiz.question,
      quiz.check_answer ? 1 : 0,
    ]);
    await pool.query(quizInsertQuery, [quizValues]);

    const [quizIds] = await pool.query(
      `SELECT quiz_id FROM quizzes WHERE session_id = ?`,
      [sessionId]
    );

    const OX_quiz = quizData.map((quiz, index) => ({
      quiz_id: quizIds[index]?.quiz_id,
      question: quiz.question,
      check_answer: quiz.check_answer,
      lesson_id: quiz.lesson_id,
      animation_path: quiz.animation_path,
    }));
    // console.log(" 생성된 퀴즈 데이터:", quizData);
    res.json({ success: true, sessionId, quizzes: OX_quiz });
  } catch (error) {
    console.error("OX 퀴즈 생성 오류:", error);
    res.status(500).json({ success: false, message: "OX 퀴즈 생성 실패" });
  }
};

export const checkQuiz = async (req, res) => {
  const { sessionId, answers } = req.body;
  const userId = req.user_id;

  if (!sessionId || !Array.isArray(answers) || !userId) {
    return res.status(400).json({
      success: false,
      message: "잘못된 요청입니다.",
    });
  }

  try {
    // ✅ lesson_id, word, animation_path 포함된 퀴즈 정보 가져오기
    const [quizData] = await pool.query(
      `SELECT q.quiz_id, q.check_answer, q.lesson_id, l.word AS wrong_word, l.animation_path 
       FROM quizzes q 
       JOIN lessons l ON q.lesson_id = l.lesson_id 
       WHERE q.session_id = ?`,
      [sessionId]
    );

    console.log("쿼리 결과:", quizData);

    if (quizData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "해당 세션의 퀴즈를 찾을 수 없습니다.",
      });
    }

    if (answers.length !== quizData.length) {
      return res.status(400).json({
        success: false,
        message: "제출한 답안 개수가 퀴즈 개수와 맞지 않습니다.",
      });
    }

    // ✅ 채점
    const results = quizData.map((quiz) => {
      const userAnswer = answers.find((a) => a.quiz_id === quiz.quiz_id);
      const isCorrect =
        userAnswer &&
        typeof userAnswer.answer === "boolean" &&
        quiz.check_answer === (userAnswer.answer ? 1 : 0);

      return {
        quiz_id: quiz.quiz_id,
        lesson_id: quiz.lesson_id,
        isCorrect,
        message: isCorrect ? "정답" : "오답",
      };
    });

    const score = results.filter((result) => result.isCorrect).length;
    //점수 저장
    const [scoreResult] = await pool.query(
      `INSERT INTO quiz_scores (user_id, session_id, correct_count, total_questions) VALUES (?, ?, ?, ?)`,
      [userId, sessionId, score, quizData.length]
    );
    const scoreId = scoreResult.insertId;

    if (score >= 3) {
      await addUserPoint({
        user_id: userId,
        points: 10,
        reason: "quiz",
        score_id: scoreId,
      });
    }

    //오답 저장
    const wrongAnswers = results.filter((r) => !r.isCorrect);
    if (wrongAnswers.length > 0) {
      const values = wrongAnswers.map((data) => [
        userId,
        data.quiz_id,
        sessionId,
        data.lesson_id,
      ]);

      await pool.query(
        `INSERT INTO wrong_answers(user_id, quiz_id, session_id, lesson_id) 
        VALUES ?
        ON DUPLICATE KEY UPDATE recorded_at = CURRENT_TIMESTAMP`,
        [values]
      );
      res.json({
        success: true,
        score,
        total: quizData.length,
        results,
      });
    }
  } catch (error) {
    console.error("퀴즈 채점 오류:", error);
    res.status(500).json({ success: false, message: "채점 실패" });
  }
};

export const wrongAnswers = async (req, res) => {
  const userId = req.user_id;
  if (!userId) {
    return res.status(400).json({ message: "userId가 필요합니다" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT wa.quiz_id, wa.session_id, wa.lesson_id,lc.part_number,lc.category,l.step_number, l.word, l.animation_path, wa.recorded_at
       FROM wrong_answers wa
       JOIN lessons l ON l.lesson_id = wa.lesson_id
       JOIN lesson_categories lc ON l.lessonCategory_id = lc.lessonCategory_id 
       WHERE wa.user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      rows,
    });
  } catch (error) {
    console.error("오답 목록 가져오기 실패:", error.message);
    res.status(500).json({
      success: false,
      message: "오답 목록을 가져오는데 실패했습니다.",
    });
  }
};

export const deleteWrongAnswers = async (req, res) => {
  const userId = req.user_id;
  const wrongAnswerId = req.params.wrongAnswer_id;

  if (!userId || !wrongAnswerId) {
    return res
      .status(400)
      .json({ message: "사용자 ID와 오답 ID가 모두 필요합니다. " });
  }
  const [wrongAnswers] = await pool.query(
    `SELECT * FROM wrong_answers WHERE user_id =? and wrongAnswer_id = ?`,
    [userId, wrongAnswerId]
  );
  if (wrongAnswers.length === 0) {
    return res.status(404).json({ message: "저장된 오답 항목이 없습니다" });
  }
  try {
    await pool.query(
      `DELETE FROM wrong_answers WHERE user_id =? and wrongAnswer_id=? `,
      [userId, wrongAnswerId]
    );
    res.status(200).json({ message: "오답 항목 삭제가 완료되었습니다." });
  } catch (error) {
    console.error("오답 삭제 실패:", error.message);
    res.status(500).json({ message: "오답 항목 삭제 실패했습니다." });
  }
};
