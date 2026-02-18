import * as classRepository from "./class.repository.js";
import { generateCode } from "../../utils/Code.js";
import { fetchReportData, weeklyPromptData } from "../../utils/Report.js";
import OpenAI from "openai";

export const createNewClass = async (
  className,
  adminId,
  description,
  colorId
) => {
  const classCode = generateCode();
  const classId = await classRepository.createClass(
    className,
    adminId,
    description,
    colorId,
    classCode
  );
  return { classId, classCode };
};

export const getClassDetails = async (classId) => {
  const cls = await classRepository.getClassById(classId);
  if (!cls) throw new Error("클래스를 찾을 수 없습니다.");
  return cls;
};

export const listAllClasses = async () => {
  return await classRepository.getAllClasses();
};

export const updateClassDetails = async (classId, updateData) => {
  const { className, description, colorId } = updateData;
  const fields = [];
  const values = [];

  if (className !== undefined) {
    fields.push("class_name = ?");
    values.push(className);
  }
  if (description !== undefined) {
    fields.push("description = ?");
    values.push(description);
  }
  if (colorId !== undefined) {
    fields.push("color_id = ?");
    values.push(colorId);
  }

  if (fields.length === 0) throw new Error("수정할 값이 없습니다.");

  const success = await classRepository.updateClass(classId, fields, values);
  if (!success) throw new Error("해당 클래스가 존재하지 않습니다.");
};

export const removeClass = async (classId) => {
  const success = await classRepository.deleteClass(classId);
  if (!success) throw new Error("해당 클래스가 존재하지 않습니다.");
};

export const inviteMembers = async (classId, memberIds) => {
  const uniqueMembers = [...new Set(memberIds)];
  const values = uniqueMembers.map((id) => [classId, id]);
  await classRepository.addMembersToClass(values);
};

export const listAllUsers = async () => {
  return await classRepository.getAllUsers();
};

export const addLessonsToClass = async (classId, lessonIds) => {
  const uniqueLessons = [...new Set(lessonIds)];
  const values = uniqueLessons.map((lessonId) => [classId, lessonId]);
  await classRepository.addLessonsToClass(values);
};

export const removeLessonsFromClass = async (classId, lessonIds) => {
  await classRepository.deleteLessonsFromClass(classId, lessonIds);
};

export const getLessonsForUser = async (memberId) => {
  const rows = await classRepository.getLessonsForUser(memberId);
  return groupLessons(rows);
};

export const getLessonsForAdmin = async (classId) => {
  const rows = await classRepository.getLessonsForAdmin(classId);
  return groupLessons(rows);
};

function groupLessons(rows) {
  const grouped = rows.reduce((acc, row) => {
    const categoryId = row.lessonCategory_id;
    if (!acc[categoryId]) {
      acc[categoryId] = {
        id: categoryId,
        categoryName: row.category,
        partNumber: row.part_number,
        lessonLevel: row.lessonLevel_id || null,
        lessons: [],
      };
    }
    acc[categoryId].lessons.push({
      lessonId: row.lesson_id,
      word: row.word,
      animationPath: row.animation_path,
      stepNumber: row.step_number,
    });
    return acc;
  }, {});
  return Object.values(grouped);
}

export const addCategoriesToClass = async (classId, categoryIds) => {
  const uniqueCategories = [...new Set(categoryIds)];
  const lessons = await classRepository.getLessonsByCategoryIds(
    uniqueCategories
  );
  if (lessons.length === 0) throw new Error("해당 카테고리에 레슨이 없습니다.");

  const lessonIds = lessons.map((l) => l.lesson_id);
  const existingLessons = await classRepository.getExistingLessonsInClass(
    classId,
    lessonIds
  );
  const existingIds = new Set(existingLessons.map((l) => l.lesson_id));

  const newLessons = lessons.filter((l) => !existingIds.has(l.lesson_id));
  if (newLessons.length === 0)
    throw new Error("모든 레슨이 이미 추가되어 있습니다.");

  const values = newLessons.map((l) => [classId, l.lesson_id]);
  await classRepository.addLessonsToClass(values);
};

export const removeCategoriesFromClass = async (classId, categoryIds) => {
  const uniqueCategories = [...new Set(categoryIds)];
  const lessons = await classRepository.getLessonsByCategoryIds(
    uniqueCategories
  );
  if (lessons.length === 0) throw new Error("해당 카테고리에 레슨이 없습니다.");

  const lessonIds = lessons.map((l) => l.lesson_id);
  await classRepository.deleteLessonsFromClass(classId, lessonIds);
};

export const listClassMembers = async (classId) => {
  return await classRepository.getClassMembers(classId);
};

export const removeMembersFromClass = async (classId, memberIds) => {
  await classRepository.deleteMembersFromClass(classId, memberIds);
};

export const getMypageData = async (memberId) => {
  const total = await classRepository.getLessonsTotalCount();
  const completed = await classRepository.getUserCompletedLessonsCount(
    memberId
  );
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const attendance = await classRepository.getAttendanceByUserId(memberId);

  let report = null;
  let lessonCount = 0;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const data = await fetchReportData(memberId);
    lessonCount = data.lessonCount;
    const prompt = weeklyPromptData(data);
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "당신은 교육 분석 도우미입니다. 사용자에게 친절하면서도 핵심만 요약한 주간 리포트를 작성해주세요. 너무 길거나 장황하지 않게 해주세요.",
        },
        {
          role: "user",
          content: prompt + "\n\n리포트는 간결하고 핵심 위주로 작성해주세요.",
        },
      ],
    });
    report = completion.choices[0]?.message?.content || null;
  } catch (gptErr) {
    console.error("주간 리포트 생성 실패:", gptErr);
  }

  return { progress: `${progress}%`, attendance, report, lessonCount };
};
