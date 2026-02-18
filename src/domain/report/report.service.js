import { fetchReportData, weeklyPromptData } from "../../utils/Report.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const getWeeklyReport = async (userId) => {
  const data = await fetchReportData(userId);
  const prompt = weeklyPromptData(data);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "당신은 교육 분석 도우미입니다. 사용자에게 친절하면서도 핵심만 요약한 주간 리포트를 작성해주세요. 너무 길거나 장황하지 않게 해주세요.\n\n" +
              prompt +
              "\n\n리포트는 간결하고 핵심 위주로 작성해주세요.",
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,
    },
  });

  const report = result.response.text();
  return { report, lessonCount: data.lessonCount };
};
