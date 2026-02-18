import pool from "../database.js";

export const lessonSaved = async (req, res) => {
  const userId = req.user_id;
  const lessonId = req.body.lessonId;

  if (!userId || !lessonId) {
    return res
      .status(400)
      .json({ message: "사용자 ID와 강의 ID가 필요합니다." });
  }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM user_saved WHERE user_id = ? AND lesson_id = ?`,
      [userId, lessonId]
    );

    if (rows.length > 0) {
      return res
        .status(200)
        .json({ message: "이미 즐겨찾기에 추가된 강의입니다." });
    }

    await pool.query(
      `INSERT INTO user_saved (user_id, lesson_id) VALUES (?, ?)`,
      [userId, lessonId]
    );
    res.status(200).json({ message: "즐겨찾기 추가되었습니다." });
    console.log(rows);
  } catch (error) {
    console.error("즐겨찾기 추가 실패:", error.message);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const fetchSavedLesson = async (req, res) => {
  const userId = req.user_id;

  try {
    const [rows] = await pool.query(
      `SELECT us.userSaved_id, us.lesson_id, l.word, l.animation_path, l.lessonCategory_id 
         FROM user_saved us 
         JOIN lessons l ON us.lesson_id = l.lesson_id 
         WHERE us.user_id = ?`,
      [userId]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.log("불러오기 실패:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const deleteSavedLesson = async (req, res) => {
  const userId = req.user_id;
  const saveId = req.params.saveId;
  try {
    if (!userId || !saveId) {
      return res
        .status(400)
        .json({ message: "사용자 ID와 저장된 강의 ID가 필요합니다." });
    }
    const [savedLesson] = await pool.query(
      `SELECT * FROM user_saved WHERE user_id = ? AND lesson_id = ?`,
      [userId, saveId]
    );
    if (savedLesson.length == 0) {
      return res
        .status(404)
        .json({ message: "해당 즐겨찾기 항목이 존재하지 않습니다." });
    }
    await pool.query(
      `DELETE FROM user_saved WHERE lesson_id=? AND user_id = ? `,
      [saveId, userId]
    );
    res.status(200).json({ message: "즐겨찾기에서 삭제되었습니다." });
  } catch (error) {
    console.log("즐겨찾기 항목 삭제 실패", error.message);
    res.status(500).json({ message: "서버 오류가 발생했습니다" });
  }
};
