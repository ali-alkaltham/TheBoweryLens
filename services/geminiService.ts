import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

// Lazy initialization to prevent crash on app load
let aiInstance: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing. Please check your Vercel settings.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const analyzeProductImage = async (base64Image: string): Promise<GeminiAnalysisResult> => {
  // Remove header if present (data:image/jpeg;base64,)
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this product image to identify it against a database.
            1. Extract the brand name and exact product name. 
            2. CRITICAL: If there is Arabic text on the packaging, capture it exactly in 'keywords'.
            3. CRITICAL: If there is English text, capture it exactly in 'keywords'.
            4. If the product is a known international brand, include both its English and Arabic common names in 'keywords' (e.g. 'Pepsi' and 'بيبسي').
            5. List visual attributes (color, type) in keywords.
            
            Return JSON.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedBrand: { type: Type.STRING },
            detectedName: { type: Type.STRING },
            keywords: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            category: { type: Type.STRING },
          },
          required: ["detectedBrand", "detectedName", "keywords", "category"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as GeminiAnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const translateTextToArabic = async (text: string): Promise<string> => {
  if (!text) return "";
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Translate the following product description into clear, professional Arabic. If the text is already in Arabic, improve its phrasing. Return ONLY the translated text without any explanations.\n\nText: "${text}"`,
    });
    return response.text || text;
  } catch (error) {
    console.error("Translation Error:", error);
    return text; // Return original text on failure
  }
};