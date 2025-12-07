import { GoogleGenAI } from "@google/genai";
import { GeminiAnalysisResult, Product } from "../types";

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
    Analyze this product image.
    Identify the Brand name, Product Name, and Category.
    Extract relevant keywords regarding material, color, and style.
    
    Return ONLY a JSON object with this structure:
    {
      "detectedName": "Product Name",
      "detectedBrand": "Brand Name",
      "category": "Category",
      "keywords": ["tag1", "tag2"]
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

// Helper to convert URL to Base64 (needed for Gemini input)
const urlToBase64 = async (url: string): Promise<string | null> => {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                // Return just the base64 part
                resolve(result.includes(',') ? result.split(',')[1] : result);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn(`Failed to fetch image for comparison: ${url}`, e);
        return null;
    }
};

export const verifyVisualMatch = async (capturedImageBase64: string, candidates: Product[]): Promise<string | null> => {
    const client = getAI();
    if (!client || candidates.length === 0) return null;

    // Remove prefix from captured image
    const cleanCaptured = capturedImageBase64.includes(',') ? capturedImageBase64.split(',')[1] : capturedImageBase64;

    const parts: any[] = [];
    
    // Add captured image as the "Target"
    parts.push({ text: "TARGET IMAGE (The image captured by user):" });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanCaptured } });

    // Process candidates and add their images
    const validCandidates: string[] = [];
    
    for (const prod of candidates) {
        if (!prod.imageUrl) continue;
        
        const b64 = await urlToBase64(prod.imageUrl);
        if (b64) {
            parts.push({ text: `CANDIDATE ID: ${prod.id}` });
            parts.push({ inlineData: { mimeType: 'image/jpeg', data: b64 } });
            validCandidates.push(prod.id);
        }
    }

    if (validCandidates.length === 0) return null;

    parts.push({ 
        text: `
        I have provided a TARGET IMAGE followed by several CANDIDATE IMAGES.
        
        Your task is to visually compare the TARGET image with the CANDIDATE images.
        Identify which candidate is the SAME physical product as the target.
        Ignore lighting differences or slight angle changes. Focus on the object shape, pattern, and design details.
        
        Return ONLY a JSON object:
        {
            "matchFound": boolean,
            "bestMatchId": "ID_OF_BEST_MATCH" or null,
            "confidence": number (0-100)
        }
        ` 
    });

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts }
        });
        
        const cleanText = (response.text || "").replace(/```json\n?|\n?```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            if (result.matchFound && result.confidence > 70) {
                return result.bestMatchId;
            }
        }
        return null;
    } catch (error) {
        console.error("Visual Verification Error:", error);
        return null;
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