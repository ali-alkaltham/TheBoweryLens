export interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  description: string;
  price: string;
  imageUrl: string;
}

export enum AppView {
  HOME = 'home',
  SCAN = 'scan',
  RESULT = 'result',
  ADMIN = 'admin'
}

export interface GeminiAnalysisResult {
  detectedName: string;
  detectedBrand: string;
  category: string;
  keywords: string[];
}

export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';

export interface Translation {
  appTitle: string;
  scanProduct: string;
  tapToCapture: string;
  dbStatus: string;
  productsLoaded: string;
  noData: string;
  setupData: string;
  products: string;
  brands: string;
  analyzing: string;
  aiAnalysis: string;
  dbResults: string;
  bestMatch: string;
  currency: string;
  noMatchTitle: string;
  tryUpdate: string;
  price: string;
  productCode: string;
  productDetails: string;
  close: string;
  database: string;
  back: string;
  uploadExcel: string;
  dragDrop: string;
  browse: string;
  processing: string;
  searchPlaceholder: string;
  settings: string;
  darkMode: string;
  language: string;
  cameraPermissionDenied: string;
  cameraError: string;
  translateToAr: string;
  showOriginal: string;
  translating: string;
  noDesc: string;
  reloadData: string;
}