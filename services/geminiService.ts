import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const modelId = 'gemini-2.5-flash';

export const askLindaToImprove = async (taskTitle: string, taskDesc: string): Promise<string> => {
  if (!apiKey) return "Мишаня, нужен API ключ, чтобы я мог помочь!";

  try {
    const prompt = `Ты - умный и лаконичный менеджер проектов. 
    Пользователь написал задачу: "${taskTitle}". 
    Описание: "${taskDesc}".
    
    Твоя цель: Перепиши описание задачи так, чтобы оно было более профессиональным, четким и вдохновляющим. 
    Используй деловой стиль, избегай воды.
    Верни ТОЛЬКО улучшенный текст описания.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    return response.text || taskDesc;
  } catch (error: any) {
    console.error("AI failed:", error);
    if (error.status === 403 || (error.message && error.message.includes("Region not supported"))) {
      return `${taskDesc}\n\n(Линда: Мишаня, я сейчас недоступна в твоем регионе. Попробуй включить VPN.)`;
    }
    return "Прости, Мишаня, я немного задумалась (ошибка API).";
  }
};

export const askLindaForIdeas = async (columnId: string): Promise<{ title: string; description: string; color: string }[]> => {
  if (!apiKey) return [];

  try {
    const contextMap = {
      'todo': 'новые стратегические задачи для бизнеса',
      'doing': 'задачи в активной разработке',
      'done': 'метрики успеха и завершенные вехи'
    };

    const prompt = `Придумай 3 креативные задачи для колонки "${columnId}" (${contextMap[columnId as keyof typeof contextMap]}).
    Верни ответ в формате JSON.
    Каждая задача должна иметь title, description и color.
    ВАЖНО: Color должен быть одним из этих hex кодов: #6366f1, #8b5cf6, #ec4899, #10b981, #3b82f6, #f59e0b.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              color: { type: Type.STRING }
            },
            required: ["title", "description", "color"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI brainstorm failed:", error);
    if (error.status === 403 || (error.message && error.message.includes("Region not supported"))) {
      alert("AI недоступен в вашем регионе. Попробуйте VPN.");
    }
    return [];
  }
};