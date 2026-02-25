
import React from 'react';
import { CartItem } from '../types';
import { ShoppingBag, Trash2 } from 'lucide-react';

interface CartProps {
  items: CartItem[];
  onRemoveItem: (id: string) => void;
}

const Cart: React.FC<CartProps> = ({ items, onRemoveItem }) => {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (items.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
        <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500">Savatchangiz bo'sh</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Buyurtma</h3>
        <span className="bg-red-100 text-[#E4002B] text-xs px-2 py-1 rounded-full font-bold">
          {items.reduce((acc, i) => acc + i.quantity, 0)} dona
        </span>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0">
               <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-slate-900 truncate">{item.name}</h4>
              <p className="text-xs text-slate-500">{item.quantity} x {item.price.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm text-slate-700">{(item.price * item.quantity).toLocaleString()}</p>
              <button 
                onClick={() => onRemoveItem(item.id)}
                className="text-red-400 hover:text-red-600 text-xs mt-1"
              >
                O'chirish
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-600 font-medium">Jami</span>
          <span className="text-xl font-black text-slate-900">{total.toLocaleString()}</span>
        </div>
        <button className="w-full py-3 bg-[#E4002B] hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-red-200 uppercase tracking-wide">
          Rasmiylashtirish
        </button>
      </div>
    </div>
  );
};

export default Cart;
