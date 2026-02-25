
import React from 'react';
import { Product } from '../types';
import { MOCK_MENU } from '../constants';
import { Plus } from 'lucide-react';

interface MenuProps {
  onAddItem: (item: Product) => void;
}

const Menu: React.FC<MenuProps> = ({ onAddItem }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {MOCK_MENU.map((item) => (
        <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 hover:shadow-md transition-shadow flex flex-col">
          <div className="relative h-32 mb-3 rounded-lg overflow-hidden bg-slate-50">
             <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-900 leading-tight">{item.name}</h4>
            <p className="text-sm text-slate-500 uppercase tracking-wide text-xs mt-1">{item.category}</p>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="font-black text-slate-900">{item.price.toLocaleString()} so'm</span>
            <button 
              onClick={() => onAddItem(item)}
              className="p-2 bg-[#E4002B] text-white hover:bg-red-700 rounded-full transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Menu;
