import React, { useState } from 'react';
import { Search, Package, AlertCircle, RefreshCw } from 'lucide-react';
import { Product, Translation } from '../types';
import { Button } from './Button';

interface ProductDatabaseProps {
  products: Product[];
  onRefresh: () => Promise<void>;
  onBack: () => void;
  t: Translation;
}

export const ProductDatabase: React.FC<ProductDatabaseProps> = ({ products, onRefresh, onBack, t }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
        await onRefresh();
    } finally {
        setIsRefreshing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
         <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
             <div className="relative w-full md:w-96">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             
             <div className="flex gap-4 items-center w-full md:w-auto">
                 <Button 
                    variant="secondary" 
                    onClick={handleRefresh} 
                    disabled={isRefreshing}
                    className="flex-1 md:flex-none"
                 >
                    <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                    {t.reloadData}
                 </Button>
                 
                 <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600">
                    <Package size={16} />
                    <span>{products.length} {t.products}</span>
                 </div>
             </div>
         </div>
         
         <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {filteredProducts.map((p) => (
                        <div key={p.id} className="flex gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-md bg-white dark:bg-gray-700/30">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-600 rounded-lg flex-shrink-0 overflow-hidden">
                                {p.imageUrl ? (
                                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 dark:text-white truncate">{p.name}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{p.code}</p>
                                <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">{p.price} {t.currency}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <AlertCircle size={32} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">{t.noData}</p>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};