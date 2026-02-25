
import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useCart } from '../context/CartContext';
import { Search, Plus } from 'lucide-react';

const MenuPage: React.FC = () => {
  const { menuItems, categories } = useAdmin();
  const { addToCart } = useCart();
  const [activeCat, setActiveCat] = useState('Barchasi');
  const [search, setSearch] = useState('');

  // Use categories from context, plus 'Barchasi'
  const categoryNames = ['Barchasi', ...categories.map(c => c.name)];

  const filtered = menuItems.filter(item => {
    const matchesCat = activeCat === 'Barchasi' || item.category === activeCat;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="pt-6 pb-24 md:pb-10 px-4 min-h-screen bg-slate-50">
      <h1 className="text-2xl font-black text-slate-900 mb-6 px-2 uppercase tracking-tight">KFC Menyusi</h1>
      
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Qidirish..." 
          className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E4002B] shadow-sm font-medium transition-all focus:shadow-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide md:flex-wrap">
        {categoryNames.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors uppercase tracking-wide ${
              activeCat === cat 
                ? 'bg-[#E4002B] text-white shadow-md shadow-red-200' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid - Adaptive for mobile, tablet, desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="relative h-32 rounded-xl overflow-hidden mb-3 bg-slate-50 group">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 text-sm leading-tight mb-1">{item.name}</h4>
              <p className="text-xs text-slate-500 mb-2 line-clamp-2 leading-relaxed">{item.description}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{item.category}</p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
              <span className="font-black text-slate-900 text-sm">{item.price.toLocaleString()} so'm</span>
              <button 
                onClick={() => addToCart(item, 1)}
                className="w-8 h-8 rounded-full bg-[#E4002B] text-white flex items-center justify-center active:scale-90 transition-transform shadow-md hover:bg-red-700"
              >
                <Plus size={18} strokeWidth={3} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuPage;
