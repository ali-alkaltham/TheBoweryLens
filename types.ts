export interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  description: string;
  price: string | number;
  imageUrl: string;
}

export interface GeminiAnalysisResult {
  detectedBrand: string;
  detectedName: string;
  keywords: string[];
  category: string;
}

export enum AppView {
  HOME = 'HOME',
  ADMIN = 'ADMIN',
  SCAN = 'SCAN',
  RESULT = 'RESULT',
}

export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';
