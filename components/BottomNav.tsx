
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';

const BottomNav: React.FC = () => {
  const { cartItems } = useCart();
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const navClass = ({ isActive }: { isActive: boolean }) => 
    `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-[#E4002B]' : 'text-slate-400'}`;

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 h-16 pb-safe z-50 shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
      <div className="grid grid-cols-4 h-full">
        <NavLink to="/" className={navClass}>
          <Home size={22} strokeWidth={2.5} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Asosiy</span>
        </NavLink>
        <NavLink to="/menu" className={navClass}>
          <UtensilsCrossed size={22} strokeWidth={2.5} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Menyu</span>
        </NavLink>
        <NavLink to="/cart" className={navClass}>
          <div className="relative">
            <ShoppingBag size={22} strokeWidth={2.5} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#E4002B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center border-2 border-white">
                {itemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide">Savatcha</span>
        </NavLink>
        <NavLink to="/profile" className={navClass}>
          <User size={22} strokeWidth={2.5} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Profil</span>
        </NavLink>
      </div>
    </div>
  );
};

export default BottomNav;
