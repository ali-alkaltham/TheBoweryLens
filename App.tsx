import React, { useState, useEffect, useCallback } from 'react';
import { ScanLine, Settings, Database, Search, ChevronRight, AlertCircle, Sparkles, X, Tag, Moon, Sun, Globe, Image as ImageIcon, Camera, Languages, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, AppView, GeminiAnalysisResult, Language, Theme } from './types';
import { Scanner } from './components/Scanner';
import { ProductDatabase } from './components/ProductDatabase';
import { Button } from './components/Button';
import { analyzeProductImage, translateTextToArabic } from './services/geminiService';
import { saveProductsToDB, getProductsFromDB } from './services/db';
import { translations } from './translations';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [products, setProducts] = useState<Product[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<{product: Product, score: number}[]>([]);
  const [geminiResult, setGeminiResult] = useState<GeminiAnalysisResult | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
  const [isTranslatingDesc, setIsTranslatingDesc] = useState(false);
  const [showTranslatedDesc, setShowTranslatedDesc] = useState(false);
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'ar';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'light';
  });

  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const parseExcelData = (data: any[]) => {
    if (data.length < 2) return [];
    const headers = (data[0] as string[]).map(h => (h || '').toString().toLowerCase().trim());
    const rows = data.slice(1);

    return rows.map((row: any) => {
      const getVal = (possibleHeaders: string[]) => {
        const index = headers.findIndex(h => possibleHeaders.some(ph => h.includes(ph)));
        return index !== -1 && row[index] !== undefined ? row[index] : '';
      };

      return {
        id: Math.random().toString(36).substr(2, 9),
        code: getVal(['code', 'sku', 'id', 'رمز', 'كود', 'رقم'])?.toString() || '',
        name: getVal(['name', 'title', 'product', 'اسم', 'منتج'])?.toString() || 'Unknown',
        brand: getVal(['brand', 'manufacturer', 'ماركة', 'براند', 'شركة'])?.toString() || '',
        description: getVal(['desc', 'details', 'وصف', 'تفاصيل', 'معلومات'])?.toString() || '',
        price: getVal(['price', 'cost', 'سعر', 'ثمن', 'قيمة'])?.toString() || '0',
        imageUrl: getVal(['image', 'url', 'photo', 'img', 'صورة', 'رابط'])?.toString() || '',
      };
    }).filter((p: Product) => p.name && p.name !== 'Unknown');
  };

  const loadData = useCallback(async () => {
    setIsLoadingDB(true);
    
    try {
      console.log("Attempting to fetch products.xlsx from server...");
      const response = await fetch(`/products.xlsx?t=${Date.now()}`);
      
      if (response.ok) {
        console.log("File found on server! Parsing...");
        const arrayBuffer = await response.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const parsedProducts = parseExcelData(data as any[]);
        
        if (parsedProducts.length > 0) {
          console.log(`Loaded ${parsedProducts.length} products from server file.`);
          setProducts(parsedProducts);
          await saveProductsToDB(parsedProducts);
          setIsLoadingDB(false);
          return;
        }
      } else {
        console.log("products.xlsx not found on server (404).");
      }
    } catch (err) {
      console.error("Error fetching/parsing server file:", err);
    }

    try {
      console.log("Checking local database...");
      const dbProducts = await getProductsFromDB();
      if (dbProducts.length > 0) {
        console.log(`Loaded ${dbProducts.length} products from local DB.`);
        setProducts(dbProducts);
      }
    } catch (err) {
      console.error("Error loading from DB:", err);
    }
    
    setIsLoadingDB(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setTranslatedDesc(null);
    setShowTranslatedDesc(false);
    setIsTranslatingDesc(false);
  }, [selectedProduct]);

  const formatPrice = (price: string | number) => {
    if (!price) return '0';
    const cleanPrice = price.toString().replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanPrice);
    if (isNaN(num)) return price.toString();
    return num.toLocaleString('en-US');
  };

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setView(AppView.RESULT);
    setAnalyzing(true);
    setMatchedProducts([]);
    setGeminiResult(null);

    try {
      const analysis = await analyzeProductImage(imageData);
      setGeminiResult(analysis);

      if (products.length > 0) {
        const results = products.map(p => {
          let score = 0;
          const normalize = (str: string) => str.toLowerCase().replace(/[^\w\u0600-\u06FF]/g, ' ').trim();
          
          const pName = normalize(p.name);
          const pBrand = normalize(p.brand);
          const pCode = normalize(p.code);
          
          const dName = normalize(analysis.detectedName);
          const dBrand = normalize(analysis.detectedBrand);

          const dNameTokens = dName.split(/\s+/).filter(t => t.length > 2);
          const pNameTokens = pName.split(/\s+/).filter(t => t.length > 2);

          if (pCode && dName.includes(pCode)) score += 200;
          if (pName === dName) score += 100;
          else if (pName.includes(dName) || dName.includes(pName)) score += 60;

          let matchedTokens = 0;
          dNameTokens.forEach(token => {
             if (pName.includes(token)) matchedTokens++;
          });
          if (matchedTokens > 0) score += (matchedTokens * 15);

          if (pBrand && dBrand) {
             if (pBrand.includes(dBrand) || dBrand.includes(pBrand)) score += 40;
          }

          const normalizedKeywords = analysis.keywords.map(k => normalize(k));
          normalizedKeywords.forEach(k => {
             if (!k) return;
             if (pName.includes(k)) score += 20;
             if (p.description && normalize(p.description).includes(k)) score += 5;
             if (pNameTokens.includes(k)) score += 25;
          });

          return { product: p, score };
        });

        const bestMatches = results
            .filter(r => r.score >= 15)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        setMatchedProducts(bestMatches);
      }

    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTranslateDescription = async () => {
    if (!selectedProduct?.description) return;
    if (showTranslatedDesc) {
        setShowTranslatedDesc(false);
        return;
    }
    if (translatedDesc) {
        setShowTranslatedDesc(true);
        return;
    }
    setIsTranslatingDesc(true);
    try {
        const translated = await translateTextToArabic(selectedProduct.description);
        setTranslatedDesc(translated);
        setShowTranslatedDesc(true);
    } catch (error) {
        console.error("Translation failed", error);
    } finally {
        setIsTranslatingDesc(false);
    }
  };

  if (view === AppView.SCAN) {
    return <Scanner onCapture={handleCapture} onCancel={() => setView(AppView.HOME)} t={t} />;
  }

  if (view === AppView.ADMIN) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 bg-dot-pattern transition-colors duration-300">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="max-w-7xl mx-auto p-4 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-500/30">
                  <Database size={20} />
                </div>
                <h1 className="font-bold text-gray-900 dark:text-white text-lg">{t.database}</h1>
             </div>
             <Button variant="outline" onClick={() => setView(AppView.HOME)} className="!py-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 hover:dark:border-gray-500">
                {t.back}
             </Button>
          </div>
        </header>
        <main className="max-w-7xl mx-auto pt-6">
          <ProductDatabase 
            products={products} 
            onRefresh={loadData}
            onBack={() => setView(AppView.HOME)} 
            t={t}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 bg-dot-pattern transition-colors duration-300 flex flex-col relative overflow-x-hidden">
      
      {/* Sidebar */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${isSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none delay-300'}`}>
         <div 
           className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
           onClick={() => setSidebarOpen(false)}
         />
         <div className={`absolute top-0 bottom-0 ${lang === 'ar' ? 'left-0' : 'right-0'} w-72 max-w-[80vw] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 transform border-r border-gray-200 dark:border-gray-800 ${isSidebarOpen ? 'translate-x-0' : (lang === 'ar' ? '-translate-x-full' : 'translate-x-full')}`}>
            <div className="p-6 h-full flex flex-col">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.settings}</h2>
                  <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
                    <X size={20} />
                  </button>
               </div>
               <div className="space-y-6 flex-1">
                  <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl transition-colors">
                     <span className="flex items-center gap-3 text-gray-700 dark:text-gray-200 font-medium">
                        {theme === 'dark' ? <Moon size={20} className="text-blue-500"/> : <Sun size={20} className="text-amber-500"/>}
                        {t.darkMode}
                     </span>
                     <button 
                       onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                       className={`w-14 h-8 rounded-full p-1 transition-all duration-300 flex items-center shadow-inner ${theme === 'dark' ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}
                     >
                       <span className="w-6 h-6 rounded-full bg-white shadow-md transform transition-transform" />
                     </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl transition-colors">
                     <span className="flex items-center gap-3 text-gray-700 dark:text-gray-200 font-medium">
                        <Globe size={20} className="text-emerald-500"/> 
                        {t.language}
                     </span>
                     <button 
                       onClick={() => setLang(prev => prev === 'ar' ? 'en' : 'ar')}
                       className="px-4 py-1.5 bg-white dark:bg-gray-700 rounded-lg text-sm font-bold text-gray-800 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600 hover:scale-105 transition-all"
                     >
                        {lang === 'ar' ? 'English' : 'العربية'}
                     </button>
                  </div>
                  <hr className="border-gray-200 dark:border-gray-800 my-4" />
                  <button 
                    onClick={() => { setSidebarOpen(false); setView(AppView.ADMIN); }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all group"
                  >
                     <div className="bg-white dark:bg-blue-900/50 p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                        <Database size={20} />
                     </div>
                     <span className="font-semibold">{t.database}</span>
                  </button>
               </div>
               <div className="text-center text-xs text-gray-400 mt-6 font-mono">
                 TheBoweryLens v2.1
               </div>
            </div>
         </div>
      </div>

      <header className="sticky top-0 z-40 bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 transition-colors">
        <div className="max-w-7xl mx-auto w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-lg opacity-20 dark:opacity-40 rounded-full"></div>
                  <div className="relative w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <ScanLine size={22} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                    <h1 className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 leading-tight tracking-tight">{t.appTitle}</h1>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all active:scale-95"
                >
                <Settings size={24} strokeWidth={2} />
                </button>
            </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 relative">
        
        {view === AppView.HOME && (
            <div className="flex flex-col items-center justify-center min-h-[75vh] py-10 space-y-16">
                
                <div className="relative group cursor-pointer" onClick={() => setView(AppView.SCAN)}>
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 dark:bg-indigo-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>

                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-10"></div>
                      <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 rounded-full animate-pulse-slow"></div>
                      
                      <button 
                          className="relative w-56 h-56 md:w-64 md:h-64 bg-white dark:bg-gray-800/90 backdrop-blur-xl rounded-full flex flex-col items-center justify-center shadow-2xl shadow-blue-500/20 border border-white/50 dark:border-gray-700 transition-transform duration-500 hover:scale-105 active:scale-95"
                      >
                          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30 text-white transform group-hover:rotate-12 transition-transform duration-500">
                              <Camera size={40} />
                          </div>
                          <span className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">{t.scanProduct}</span>
                          <span className="text-sm text-gray-400 mt-2 font-medium">{t.tapToCapture}</span>
                      </button>
                    </div>
                </div>

                <div className="w-full max-w-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-white/50 dark:border-gray-700 transition-colors hover:bg-white/80 dark:hover:bg-gray-800/80">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                          {isLoadingDB ? <Loader2 size={24} className="animate-spin" /> : <Database size={24} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">{t.dbStatus}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {isLoadingDB ? "جارٍ التحقق من السيرفر..." : 
                                 products.length > 0 
                                    ? `${t.productsLoaded.replace('منتج', products.length.toString())}` 
                                    : "لم يتم العثور على ملف products.xlsx"}
                            </p>
                        </div>
                    </div>
                    
                    {products.length === 0 && !isLoadingDB ? (
                        <div className="text-center">
                            <p className="text-xs text-red-500 mb-2">تأكد من وضع ملف products.xlsx داخل مجلد public</p>
                            <Button 
                                variant="secondary" 
                                fullWidth 
                                onClick={() => setView(AppView.ADMIN)}
                                className="rounded-xl shadow-lg shadow-emerald-500/20"
                            >
                                {t.setupData}
                            </Button>
                        </div>
                    ) : !isLoadingDB && (
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-white dark:bg-gray-700/50 rounded-2xl p-4 text-center border border-gray-100 dark:border-gray-700">
                               <span className="block text-3xl font-bold text-gray-800 dark:text-white mb-1">{products.length}</span>
                               <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.products}</span>
                           </div>
                           <div className="bg-white dark:bg-gray-700/50 rounded-2xl p-4 text-center border border-gray-100 dark:border-gray-700">
                               <span className="block text-3xl font-bold text-gray-800 dark:text-white mb-1">
                                   {new Set(products.map(p => p.brand)).size}
                               </span>
                               <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.brands}</span>
                           </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* RESULT VIEW */}
        {view === AppView.RESULT && (
            <div className="flex flex-col lg:flex-row gap-8 h-full">
                
                <div className="w-full lg:w-1/3 flex-shrink-0">
                    <div className="sticky top-28">
                        <div className="relative w-full aspect-[3/4] lg:aspect-auto lg:h-[32rem] bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
                            <img src={capturedImage || ''} alt="Captured" className="w-full h-full object-cover opacity-90" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                {analyzing && (
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-6 rounded-2xl flex flex-col items-center gap-4 animate-pulse shadow-2xl">
                                        <Sparkles className="animate-spin text-blue-400" size={32} />
                                        <span className="font-semibold tracking-wide">{t.analyzing}</span>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => setView(AppView.HOME)} 
                                className="absolute top-4 left-4 bg-black/20 hover:bg-black/40 backdrop-blur-md p-3 rounded-full text-white z-10 transition-colors border border-white/10"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-2/3 space-y-6 pb-12">
                    {!analyzing && geminiResult && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-900/20">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Sparkles size={180} />
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
                            <div className="relative z-10 p-8">
                                <div className="flex items-center gap-2 mb-4">
                                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10 text-blue-50">{t.aiAnalysis}</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{geminiResult.detectedName}</h2>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="bg-white text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg">{geminiResult.detectedBrand}</span>
                                    <div className="h-6 w-px bg-white/30 mx-1"></div>
                                    <span className="text-blue-100 font-medium">{geminiResult.category}</span>
                                </div>
                                <div className="mt-6 flex flex-wrap gap-2">
                                  {geminiResult.keywords.slice(0, 5).map(k => (
                                      <span key={k} className="text-xs bg-black/20 backdrop-blur-md px-3 py-1 rounded-lg text-blue-100 border border-white/10">#{k}</span>
                                  ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                                  <Search size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {t.dbResults}
                                </h3>
                            </div>
                            {matchedProducts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {matchedProducts.map((match, idx) => (
                                        <div key={idx} className="group bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex gap-5" onClick={() => setSelectedProduct(match.product)}>
                                            <div className="w-28 h-28 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex-shrink-0 relative shadow-inner">
                                                {match.product.imageUrl ? (
                                                    <img src={match.product.imageUrl} alt={match.product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <ImageIcon size={24} />
                                                    </div>
                                                )}
                                                {idx === 0 && (
                                                  <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg shadow-sm">
                                                    {t.bestMatch}
                                                  </div>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between py-1">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{match.product.name}</h4>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1.5">{match.product.brand}</p>
                                                </div>
                                                <div className="flex justify-between items-end mt-3">
                                                    <p className="text-blue-600 dark:text-blue-400 font-bold text-xl">{formatPrice(match.product.price)} <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">{t.currency}</span></p>
                                                    <button 
                                                        className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                                                    >
                                                        <ChevronRight size={16} className={lang === 'ar' ? 'rotate-180' : ''} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                      <AlertCircle size={32} />
                                    </div>
                                    <p className="text-gray-800 dark:text-white font-bold text-lg">{t.noMatchTitle}</p>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-xs mx-auto">{t.tryUpdate}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    )}
                </div>
            </div>
        )}

        {selectedProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col md:flex-row max-h-[90vh] ring-1 ring-white/20">
                    <div className="relative h-72 md:h-auto md:w-1/2 bg-gray-100 dark:bg-gray-900 flex-shrink-0 group">
                        {selectedProduct.imageUrl ? (
                            <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 dark:bg-gray-800"><ImageIcon size={64} opacity={0.5}/></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:hidden"></div>
                        <button 
                            onClick={() => setSelectedProduct(null)} 
                            className="absolute top-4 right-4 md:left-4 md:right-auto bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/20 p-2.5 rounded-full text-white transition-all transform hover:rotate-90 shadow-lg"
                        >
                            <X size={20}/>
                        </button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 md:w-1/2 flex flex-col bg-white dark:bg-gray-800">
                        <div className="flex-1">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                   <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md uppercase tracking-wider">{selectedProduct.brand}</span>
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight mt-1">{selectedProduct.name}</h2>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl mt-8 flex justify-between items-center border border-gray-100 dark:border-gray-700/50">
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 block">{t.price}</span>
                                    <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatPrice(selectedProduct.price)} <span className="text-lg text-gray-400 font-normal">{t.currency}</span></span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 flex items-center justify-end gap-1">
                                        <Tag size={12}/> {t.productCode}
                                    </span>
                                    <span className="font-mono font-bold text-gray-700 dark:text-gray-200 text-lg tracking-wide">{selectedProduct.code || "---"}</span>
                                </div>
                            </div>
                        
                            <div className="py-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Sparkles size={16} className="text-amber-500"/> 
                                        {t.productDetails}
                                    </h3>
                                    
                                    <button 
                                        onClick={handleTranslateDescription}
                                        disabled={isTranslatingDesc}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                                    >
                                        {isTranslatingDesc ? (
                                            <>
                                                <Loader2 size={12} className="animate-spin"/> {t.translating}
                                            </>
                                        ) : (
                                            <>
                                                <Languages size={14}/> 
                                                {showTranslatedDesc ? t.showOriginal : t.translateToAr}
                                            </>
                                        )}
                                    </button>
                                </div>
                                
                                <div className="bg-white dark:bg-gray-800 rounded-xl leading-relaxed text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap transition-all duration-300">
                                    {showTranslatedDesc && translatedDesc 
                                        ? translatedDesc 
                                        : (selectedProduct.description || t.noDesc)}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 dark:border-gray-700 mt-auto">
                            <Button fullWidth onClick={() => setSelectedProduct(null)} className="h-12 text-base shadow-lg shadow-blue-500/20">{t.close}</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;