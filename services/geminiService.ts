import { GoogleGenAI, Type, Content } from "@google/genai";
import { getApiKey } from './dataService';
import type { Message, FinalSummary, MoodMeterQuadrant } from '../types';

// Helper function to get a configured GoogleGenAI instance
const getAI = () => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API 키가 설정되지 않았습니다. 먼저 API 키를 설정해주세요.");
    }
    return new GoogleGenAI({ apiKey });
};

export const testApiKey = async (apiKey: string): Promise<boolean> => {
    try {
        const ai = new GoogleGenAI({ apiKey });
        // Use a simple, low-cost model for testing
        await ai.models.generateContent({ model: "gemini-2.5-flash", contents: "test" });
        return true;
    } catch (error) {
        console.error("API Key test failed:", error);
        return false;
    }
};

const buildChatHistory = (history: Message[]): Content[] => {
  return history.map(message => ({
    role: message.sender === 'user' ? 'user' : 'model',
    parts: [{ text: message.text }],
  }));
};

export const getChatResponse = async (history: Message[]): Promise<string> => {
  const ai = getAI();
  const model = 'gemini-2.5-pro';
  const systemInstruction = `당신은 '따뜻한 마음 코치'입니다. 사용자의 이전 대화를 바탕으로, 사용자에게 깊이 공감하고 그 감정의 원인에 대해 더 탐색할 수 있는 개방형 질문 하나를 부드럽게 제시하세요. 1-2문장으로 짧게 답변하세요. 절대 조언을 하거나 판단하지 마세요.`;
  const contents = buildChatHistory(history);

  try {
    const response = await ai.models.generateContent({ model, contents, config: { systemInstruction } });
    return response.text.trim();
  } catch (error) {
    console.error("Error getting chat response:", error);
    throw new Error("답변을 생성하는 중 오류가 발생했습니다.");
  }
};

export const getFinalChatResponse = async (history: Message[]): Promise<string> => {
  const ai = getAI();
  const model = 'gemini-2.5-pro';
  const systemInstruction = `당신은 '따뜻한 마음 코치'입니다. 사용자의 이전 대화를 바탕으로, 대화를 마무리하는 부드럽고 따뜻한 한두 문장의 끝맺음 인사를 해주세요. 절대 질문을 하거나 조언하지 마세요.`;
  const contents = buildChatHistory(history);

  try {
    const response = await ai.models.generateContent({ model, contents, config: { systemInstruction } });
    return response.text.trim();
  } catch (error) {
    console.error("Error getting final chat response:", error);
    throw new Error("마지막 답변을 생성하는 중 오류가 발생했습니다.");
  }
};

const summarySchema = {
  type: Type.OBJECT,
  properties: {
    'mood': { type: Type.STRING, description: '대화 전체를 바탕으로 사용자의 기분을 한두 단어로 요약합니다. (예: "성취감과 기쁨")' },
    'message': { type: Type.STRING, description: '대화를 바탕으로 사용자에게 따뜻하고 격려가 되는 마지막 메시지를 작성합니다.' },
  },
  required: ['mood', 'message'],
};

export const getFinalSummary = async (history: Message[]): Promise<FinalSummary> => {
  const ai = getAI();
  const prompt = `당신은 감정 분석 전문가입니다. 다음 대화 내용을 종합적으로 분석하여 사용자의 오늘 기분과 따뜻한 말 한마디를 JSON 형식으로 요약해주세요.\n\n[대화 내용]\n---\n${history.map(m => `${m.sender === 'user' ? '나' : '코치'}: ${m.text}`).join('\n')}\n---`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: summarySchema },
    });
    return JSON.parse(response.text.trim()) as FinalSummary;
  } catch (error) {
    console.error("Error getting final summary:", error);
    throw new Error("최종 요약을 생성하는 중 오류가 발생했습니다.");
  }
};

export const getMoodMeterQuadrant = async (mood: string): Promise<MoodMeterQuadrant> => {
  const ai = getAI();
  const model = 'gemini-2.5-flash';
  const prompt = `제시된 감정 설명을 분석하여 무드미터의 4가지 사분면 중 하나로 분류해주세요. 무드미터는 에너지(높음/낮음)와 유쾌함(유쾌/불쾌)을 기준으로 감정을 나눕니다.
- YELLOW: 높은 에너지, 유쾌한 감정 (예: 행복, 신남, 뿌듯함)
- RED: 높은 에너지, 불쾌한 감정 (예: 화남, 불안, 두려움)
- BLUE: 낮은 에너지, 불쾌한 감정 (예: 슬픔, 외로움, 피곤함)
- GREEN: 낮은 에너지, 유쾌한 감정 (예: 평온, 안정감, 만족)

다음 감정을 분류하고, 반드시 YELLOW, RED, BLUE, GREEN 중 하나로만 답변해주세요.

감정: "${mood}"`;

  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    const quadrant = response.text.trim().toUpperCase();
    if (['YELLOW', 'RED', 'BLUE', 'GREEN'].includes(quadrant)) {
        return quadrant as MoodMeterQuadrant;
    }
    return 'BLUE'; // Default fallback
  } catch (error) {
    console.error("Error getting mood meter quadrant:", error);
    return 'BLUE'; // Return a default value on error
  }
};