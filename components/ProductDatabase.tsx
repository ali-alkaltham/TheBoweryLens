import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Trash2, Database } from 'lucide-react';
import { Product } from '../types';
import { Button } from './Button';
import { Translation } from '../translations';

interface ProductDatabaseProps {
  products: Product[];
  onProductsUpdate: (products: Product[]) => void;
  onBack: () => void;
  t: Translation;
}

export const ProductDatabase: React.FC<ProductDatabaseProps> = ({ products, onProductsUpdate, onBack, t }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Assuming row 0 is header.
        if (data.length < 2) {
            setError(t.fileEmpty);
            return;
        }

        const headers = (data[0] as string[]).map(h => (h || '').toString().toLowerCase().trim());
        const rows = data.slice(1);

        const newProducts: Product[] = rows.map((row: any) => {
          // Robust mapping helper
          const getVal = (possibleHeaders: string[]) => {
            const index = headers.findIndex(h => possibleHeaders.some(ph => h.includes(ph)));
            return index !== -1 && row[index] !== undefined ? row[index] : '';
          };

          return {
            id: Math.random().toString(36).substr(2, 9),
            // Enhanced keywords for better matching
            code: getVal(['code', 'sku', 'id', 'رمز', 'كود', 'رقم'])?.toString() || '',
            name: getVal(['name', 'title', 'product', 'اسم', 'منتج'])?.toString() || t.unknownProduct,
            brand: getVal(['brand', 'manufacturer', 'ماركة', 'براند', 'شركة'])?.toString() || '',
            description: getVal(['desc', 'details', 'وصف', 'تفاصيل', 'معلومات'])?.toString() || '',
            price: getVal(['price', 'cost', 'سعر', 'ثمن', 'قيمة'])?.toString() || '0',
            imageUrl: getVal(['image', 'url', 'photo', 'img', 'صورة', 'رابط'])?.toString() || '',
          };
        }).filter(p => p.name && p.name !== t.unknownProduct); 

        if (newProducts.length === 0) {
            setError(t.noValidProducts);
            return;
        }

        onProductsUpdate(newProducts);
        setError('');
      } catch (err) {
        console.error(err);
        setError(t.errorReading);
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
     const ws = XLSX.utils.aoa_to_sheet([
      ["رمز المنتج", "اسم المنتج", "ماركة المنتج", "وصف المنتج", "سعر المنتج", "رابط صورة المنتج"],
      ["1001", "بيبسي 330 مل", "بيبسي", "مشروب غازي منعش", "2.5", "https://example.com/pepsi.jpg"]
     ]);
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "المنتجات");
     XLSX.writeFile(wb, "template_products.xlsx");
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
                <FileSpreadsheet size={32} />
            </div>
            <h3 className="text-xl font-semibold dark:text-white">{t.uploadFile}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">Excel (.xlsx, .xls) containing product Name, Price, Brand, Code, and Description.</p>
            
            <div className="flex gap-4 justify-center pt-2">
                 <Button onClick={() => fileInputRef.current?.click()} icon={<Upload size={18} />}>
                    {t.uploadExcel}
                 </Button>
                 <button onClick={downloadTemplate} className="text-blue-600 dark:text-blue-400 text-sm underline px-2 hover:text-blue-800">
                    {t.downloadTemplate}
                 </button>
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls" 
                className="hidden" 
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 text-lg">{t.currentProducts} ({products.length})</h3>
            {products.length > 0 && (
                <button 
                    onClick={() => onProductsUpdate([])}
                    className="text-red-500 text-sm flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                >
                    <Trash2 size={16} /> {t.deleteAll}
                </button>
            )}
        </div>
        
        {/* Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => (
                <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex sm:flex-col gap-4 items-center sm:items-start transition-colors hover:shadow-md">
                    <div className="w-16 h-16 sm:w-full sm:h-40 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                        {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">{t.noImage}</div>
                        )}
                    </div>
                    <div className="flex-1 w-full">
                        <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{p.name}</h4>
                        <div className="flex justify-between items-center mt-1">
                             <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[50%]">{p.brand}</p>
                             <p className="text-xs text-gray-400 font-mono">{p.code}</p>
                        </div>
                        <p className="text-blue-600 dark:text-blue-400 font-bold mt-2">{p.price} {t.currency}</p>
                    </div>
                </div>
            ))}
            {products.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    {t.noValidProducts}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};