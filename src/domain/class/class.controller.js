import * as classService from "./class.service.js";

export const generateClass = async (req, res) => {
  const { className, description, colorId } = req.body;
  const adminId = req.user_id;

  try {
    const { classId, classCode } = await classService.createNewClass(className, adminId, description, colorId);
    res.status(201).json({
      message: "클래스가 성공적으로 생성하였습니다.",
      class_id: classId,
      class_code: classCode,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "클래스 생성 실패" });
  }
};

export const selectClass = async (req, res) => {
  const { classId } = req.params;
  try {
    const data = await classService.getClassDetails(classId);
    res.status(200).json({ message: "클래스 불러오는데 성공하였습니다.", data });
  } catch (err) {
    console.error(err);
    const status = err.message.includes("찾을 수 없습니다") ? 404 : 500;
    res.status(status).json({ message: err.message });
  }
};

export const selectClassAll = async (req, res) => {
  try {
    const data = await classService.listAllClasses();
    if (data.length === 0) return res.status(404).json({ message: "클래스를 찾을 수 없습니다." });
    res.status(200).json({ message: "전체 클래스 불러오는데 성공하였습니다.", data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "클래스 불러오는데 실패하였습니다." });
  }
};

export const editClass = async (req, res) => {
  const { classId } = req.params;
  const { className, description, colorId } = req.body;

  try {
    await classService.updateClassDetails(classId, { className, description, colorId });
    res.status(200).json({ message: "클래스 수정이 완료되었습니다." });
  } catch (err) {
    console.error(err);
    const status = err.message === "수정할 값이 없습니다." ? 400 : (err.message.includes("존재하지 않습니다") ? 404 : 500);
    res.status(status).json({ message: err.message });
  }
};

export const deleteClass = async (req, res) => {
  const { classId } = req.params;
  try {
    await classService.removeClass(classId);
    res.status(200).json({ message: "클래스가 성공적으로 삭제되었습니다." });
  } catch (err) {
    console.error(err);
    const status = err.message.includes("존재하지 않습니다") ? 404 : 500;
    res.status(status).json({ message: err.message });
  }
};

export const inviteClass = async (req, res) => {
  const { classId } = req.params;
  const { memberIds } = req.body;

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ message: "클래스와 멤버를 모두 선택해주세요" });
  }

  try {
    await classService.inviteMembers(classId, memberIds);
    res.status(201).json({ message: "성공적으로 멤버가 추가되었습니다." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "이미 초대된 멤버이 포함되어 있습니다." });
    console.error(err);
    res.status(500).json({ message: "멤버 초대 실패" });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await classService.listAllUsers();
    res.status(200).json({ message: "유저 목록 불러오기 성공했습니다.", users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "유저 목록 불러오기 실패했습니다." });
  }
};

export const addLessons = async (req, res) => {
  const { classId } = req.params;
  const { lessonIds } = req.body;

  if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
    return res.status(400).json({ message: "레슨을 선택해주세요." });
  }

  try {
    await classService.addLessonsToClass(classId, lessonIds);
    res.status(201).json({ message: "성공적으로 레슨이 클래스에 추가되었습니다." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "이미 추가된 레슨이 포함되어 있습니다." });
    console.error(err);
    res.status(500).json({ message: "레슨 추가 실패" });
  }
};

export const deletelessons = async (req, res) => {
  const { classId } = req.params;
  const { lessonIds } = req.body;

  if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
    return res.status(400).json({ message: "삭제할 레슨을 선택해주세요" });
  }

  try {
    await classService.removeLessonsFromClass(classId, lessonIds);
    res.status(200).json({ message: "성공적으로 레슨을 삭제했습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "삭제 실패하였습니다." });
  }
};

export const selLessonsUser = async (req, res) => {
  const memberId = req.user_id;
  try {
    const data = await classService.getLessonsForUser(memberId);
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "불러오기 실패하였습니다." });
  }
};

export const selLessonsAdmin = async (req, res) => {
  const { classId } = req.params;
  try {
    const data = await classService.getLessonsForAdmin(classId);
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "불러오기 실패" });
  }
};

export const addCategories = async (req, res) => {
  const { classId } = req.params;
  const { categoryIds } = req.body;

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    return res.status(400).json({ message: "카테고리를 선택해주세요." });
  }

  try {
    await classService.addCategoriesToClass(classId, categoryIds);
    res.status(201).json({ message: "레슨이 추가되었습니다." });
  } catch (err) {
    console.error(err);
    const status = err.message.includes("없습니다") ? 404 : (err.message.includes("이미 추가") ? 400 : 500);
    res.status(status).json({ message: err.message });
  }
};

export const delCategories = async (req, res) => {
  const { classId } = req.params;
  const { categoryIds } = req.body;

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    return res.status(400).json({ message: "삭제할 카테고리를 선택해주세요." });
  }

  try {
    await classService.removeCategoriesFromClass(classId, categoryIds);
    res.status(200).json({ message: "해당 카테고리의 레슨들이 클래스에서 삭제되었습니다." });
  } catch (err) {
    console.error(err);
    const status = err.message.includes("없습니다") ? 404 : 500;
    res.status(status).json({ message: err.message });
  }
};

export const getUsersClass = async (req, res) => {
  const { classId } = req.params;
  try {
    const users = await classService.listClassMembers(classId);
    res.status(200).json({ message: "사용자 정보를 불러왔습니다.", users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "사용자 정보 불러오기 실패" });
  }
};

export const deleteUserClass = async (req, res) => {
  const { classId } = req.params;
  const { memberIds } = req.body;

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ message: "삭제할 사용자를 선택해주세요." });
  }

  try {
    await classService.removeMembersFromClass(classId, memberIds);
    res.status(200).json({ message: "사용자 삭제 성공했습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "사용자 삭제 실패" });
  }
};

export const getMypage = async (req, res) => {
  const { memberId } = req.params;

  if (!req.user_id) return res.status(401).json({ message: "로그인 필요" });
  if (String(req.user_id) !== String(memberId) && req.role !== "admin") {
    return res.status(403).json({ message: "접근 권한이 없습니다." });
  }

  try {
    const data = await classService.getMypageData(memberId);
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "마이페이지 통합 데이터 조회 실패" });
  }
};
