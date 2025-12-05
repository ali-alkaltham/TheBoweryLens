import { GoogleGenAI } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

let ai: GoogleGenAI | null = null;

const getAI = () => {
    if (!ai) {
        // Now exclusively using process.env.API_KEY as configured in vite.config.ts
        const apiKey = process.env.API_KEY;
        if (apiKey && apiKey.length > 0) {
            console.log("Gemini Service initialized.");
            ai = new GoogleGenAI({ apiKey });
        } else {
            console.error("API Key is missing! Please check Vercel environment variables.");
        }
    }
    return ai;
};

export const analyzeProductImage = async (base64Image: string): Promise<GeminiAnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
      console.error("API Key missing in process.env");
      throw new Error("API Key missing. Check configuration.");
  }

  const client = getAI();
  if (!client) throw new Error("AI Client init failed");

  // Remove data URL prefix if present
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

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
    // Clean markdown code blocks if present
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    // Extract JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error("Invalid JSON response");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
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