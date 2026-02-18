import pool from "../database.js";

export const fetchReportData = async (userId) => {
  if (!userId) {
    throw new Error("사용자 ID가 없습니다.");
  }

  try {
    const [lessons] = await pool.query(
      `
      SELECT l.word, ul.lesson_date, lc.category, ll.level
      FROM user_lessons ul
      JOIN lessons l ON ul.lesson_id = l.lesson_id
      JOIN lesson_categories lc ON ul.lessonCategory_id = lc.lessonCategory_id
      JOIN lesson_levels ll ON lc.lessonLevel_id = ll.lessonLevel_id
      WHERE ul.user_id = ?
      `,
      [userId]
    );
    const [lessonCount] = await pool.query(
      `
      SELECT DAYNAME(ul.lesson_date) as day, COUNT(*) as lesson_count
      FROM user_lessons ul
      WHERE ul.user_id = ?
        AND YEARWEEK(ul.lesson_date, 1) = YEARWEEK(NOW(), 1)
      GROUP BY day
      ORDER BY FIELD(day,
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
      `,
      [userId]
    );
    const [quizzes] = await pool.query(
      `
      SELECT q.check_answer, l.word, lc.category
      FROM quizzes q
      JOIN lessons l ON q.lesson_id = l.lesson_id
      JOIN lesson_categories lc ON l.lessonCategory_id = lc.lessonCategory_id
      WHERE q.quiz_date >= CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY
        AND q.userLesson_id IN (SELECT userLesson_id FROM user_lessons WHERE user_id = ?)
      `,
      [userId]
    );

    const [correction] = await pool.query(
      `
        SELECT correct_count, total_questions
        FROM quiz_scores
        WHERE user_id = ?
            AND score_date >= CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY 
            AND score_date <= CURDATE(); 
        `,
      [userId]
    );

    const [attendances] = await pool.query(
      `
      SELECT attend_date FROM attendances
      WHERE user_id = ? AND YEARWEEK(attend_date, 1) = YEARWEEK(NOW(), 1)
      `,
      [userId]
    );

    return {
      lessons,
      lessonCount,
      quizzes,
      correction,
      attendances,
    };
  } catch (error) {
    console.error("리포트 데이터 조회 중 오류:", error);
    throw new Error("서버 오류가 발생했습니다.");
  }
};

export const weeklyPromptData = ({
  lessons,
  quizzes,
  attendances,
  correction,
  lessonCount,
}) => {
  const lessonWords = lessons.map((l) => l.word);
  const lessonCategories = lessons.map((l) => l.category);
  const lessonLevels = lessons.map((l) => l.level);
  const quizSummary = quizzes.map(
    (q) => `${q.word}: ${q.check_answer ? "정답" : "오답"}`
  );
  const quizCategories = quizzes.map((q) => q.category);
  const attendanceDays = attendances.map((a) =>
    new Date(a.attend_date).toLocaleDateString("ko-KR", { weekday: "long" })
  );
  const lessonPerDay = lessonCount.map(
    (lc) => `${lc.day}: ${lc.lesson_count}회`
  );

  // 오답률 계산
  let quizWrongRate = "데이터 없음";

  if (correction && correction.length > 0) {
    const totalCorrect = correction.reduce(
      (sum, item) => sum + item.correct_count,
      0
    );
    const totalQuestions = correction.reduce(
      (sum, item) => sum + item.total_questions,
      0
    );

    if (totalQuestions > 0) {
      const wrongRate = (1 - totalCorrect / totalQuestions) * 100;
      quizWrongRate = `${
        Math.round(wrongRate * 10) / 10
      }% (${totalCorrect} / ${totalQuestions})`;
    }
  }

  return `
    당신은 사용자의 주간 학습 데이터를 분석해주는 인공지능입니다.
    아래 실제 데이터를 바탕으로 너가 분석해서 친절한 리포트를 작성해주세요.
    더 추가해서 하고 싶은거 말해줘

    ### 분석 항목
  
    1. **학습 패턴 분석**
       - 어떤 요일에 가장 활발히 학습했는지
  
    2. **레슨 학습 분포**
       - 가장 많이 학습한 카테고리
       - 주로 학습한 난이도
       - 특정 주제나 단어에 편중되었는지
  
    3. **퀴즈 성과 분석**
       - 퀴즈 오답률 (낮을수록 좋음)
       - 많이 틀린 단어나 카테고리
       - 지난주 대비 향상된 영역
  
    4. **출석 현황**
       - 출석과 학습량의 상관관계 분석
  
    5. **개인화 피드백**
       - 칭찬할 점, 개선할 점
       - 다음 주에 추천할 학습 전략
  
    ### 주간 사용자 데이터
  
    - 학습 단어 목록: ${lessonWords.join(", ")}
    - 레슨 카테고리: ${lessonCategories.join(", ")}
    - 레슨 난이도: ${lessonLevels.join(", ")}
    - 퀴즈 결과: ${quizSummary.join(", ")}
    - 퀴즈 카테고리: ${quizCategories.join(", ")}
    - 퀴즈 오답률: ${quizWrongRate}
    - 출석 요일: ${attendanceDays.join(", ")}
    - 요일별 학습 횟수: ${lessonPerDay.join(", ")}
    `;
};
