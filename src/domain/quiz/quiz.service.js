import * as quizRepository from "./quiz.repository.js";
import { addUserPoint } from "../../utils/Point.js";

export const generateQuiz = async (userId) => {
  const lessonData = await quizRepository.getTodayCompletedLessons(userId);

  if (lessonData.length === 0) {
    throw new Error("오늘 학습한 단어가 없습니다.");
  }

  if (lessonData.length < 5) {
    return {
      partial: true,
      message: `오늘 학습한 단어가 ${lessonData.length}개입니다. 5문제 풀어주세요.`,
    };
  }

  const learnedWords = lessonData.map((l) => l.word);
  const randomLessons = await quizRepository.getRandomLessonsExcluding(learnedWords, lessonData.length);

  const lessonIds = lessonData.map((lesson) => lesson.lesson_id);
  const animationData = await quizRepository.getLessonsByIds(lessonIds);

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

  const sessionId = await quizRepository.createQuizSession(userId);

  const quizValues = quizData.map((quiz) => [
    sessionId,
    quiz.userLesson_id,
    quiz.lesson_id,
    quiz.question,
    quiz.check_answer ? 1 : 0,
  ]);
  await quizRepository.insertQuizzes(quizValues);

  const quizIds = await quizRepository.getQuizzesShortBySessionId(sessionId);

  const OX_quiz = quizData.map((quiz, index) => ({
    quiz_id: quizIds[index]?.quiz_id,
    question: quiz.question,
    check_answer: quiz.check_answer,
    lesson_id: quiz.lesson_id,
    animation_path: quiz.animation_path,
  }));

  return { sessionId, quizzes: OX_quiz };
};

export const checkQuiz = async (userId, sessionId, answers) => {
  const quizData = await quizRepository.getQuizzesWithLessonDetailsBySessionId(sessionId);

  if (quizData.length === 0) {
    throw new Error("해당 세션의 퀴즈를 찾을 수 없습니다.");
  }

  if (answers.length !== quizData.length) {
    throw new Error("제출한 답안 개수가 퀴즈 개수와 맞지 않습니다.");
  }

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
  const scoreId = await quizRepository.insertQuizScore(userId, sessionId, score, quizData.length);

  if (score >= 3) {
    await addUserPoint({
      user_id: userId,
      points: 10,
      reason: "quiz",
      score_id: scoreId,
    });
  }

  const wrongAnswers = results.filter((r) => !r.isCorrect);
  if (wrongAnswers.length > 0) {
    const values = wrongAnswers.map((data) => [
      userId,
      data.quiz_id,
      sessionId,
      data.lesson_id,
    ]);
    await quizRepository.insertWrongAnswers(values);
  }

  return { score, total: quizData.length, results };
};

export const getWrongAnswers = async (userId) => {
  return await quizRepository.getUserWrongAnswers(userId);
};

export const deleteWrongAnswer = async (userId, wrongAnswerId) => {
  const wrongAnswer = await quizRepository.getWrongAnswer(userId, wrongAnswerId);
  if (!wrongAnswer) {
    throw new Error("저장된 오답 항목이 없습니다");
  }
  await quizRepository.deleteWrongAnswer(userId, wrongAnswerId);
};
