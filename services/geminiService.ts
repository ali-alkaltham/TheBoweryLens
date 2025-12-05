import { GoogleGenAI } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

let ai: GoogleGenAI | null = null;

const getAI = () => {
    if (!ai) {
        const apiKey = process.env.API_KEY;
        if (apiKey) {
            ai = new GoogleGenAI({ apiKey });
        } else {
            console.warn("API Key not found!");
        }
    }
    return ai;
};

export const analyzeProductImage = async (base64Image: string): Promise<GeminiAnalysisResult> => {
  const client = getAI();
  if (!client) throw new Error("API Key missing");

  // Remove data URL prefix
  const base64Data = base64Image.split(',')[1];

  const prompt = `
    Analyze this product image. Identify the brand, product name, category, and text on the packaging (Arabic and English).
    Return ONLY a JSON object with this structure:
    {
      "detectedName": "Full Product Name",
      "detectedBrand": "Brand Name",
      "category": "Category",
      "keywords": ["keyword1", "keyword2", "arabic_text_on_package", "english_text_on_package"]
    }
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: prompt }
        ]
      }
    });

    const text = response.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid JSON response");
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      detectedName: "Unknown Product",
      detectedBrand: "Unknown",
      category: "General",
      keywords: []
    };
  }
};

export const translateTextToArabic = async (text: string): Promise<string> => {
    const client = getAI();
    if (!client) return text;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following product description to Arabic. Keep it professional and concise:\n\n${text}`
        });
        return response.text || text;
    } catch (error) {
        console.error("Translation Error:", error);
        return text;
    }
};