
import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ShoppingBag, User, MapPin, ChevronDown } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import AddressModal from './AddressModal';

const DesktopHeader: React.FC = () => {
  const { cartItems } = useCart();
  const { user, updateAddress } = useAuth();
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const location = useLocation();
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Hide header on login page
  if (location.pathname === '/login') return null;

  return (
    <>
      <header className="hidden md:block sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/sco/thumb/b/bf/KFC_logo.svg/2048px-KFC_logo.svg.png" 
              alt="KFC" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-8">
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                `font-bold text-sm uppercase tracking-wide transition-colors ${isActive ? 'text-[#E4002B]' : 'text-slate-600 hover:text-slate-900'}`
              }
            >
              Asosiy
            </NavLink>
            <NavLink 
              to="/menu" 
              className={({ isActive }) => 
                `font-bold text-sm uppercase tracking-wide transition-colors ${isActive ? 'text-[#E4002B]' : 'text-slate-600 hover:text-slate-900'}`
              }
            >
              Menyu
            </NavLink>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-6">
            {/* Address Display - Now Clickable */}
            <button 
              onClick={() => setIsAddressModalOpen(true)}
              className="hidden lg:flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 px-4 py-2 rounded-full border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-95 group"
            >
               <MapPin size={16} className="text-[#E4002B] group-hover:scale-110 transition-transform" />
               <span className="truncate max-w-[180px]">
                 {user?.currentAddress?.addressName || "Manzilni tanlang"}
               </span>
               <ChevronDown size={14} className="text-slate-400" />
            </button>

            <Link to="/profile" className="flex items-center gap-2 text-slate-600 hover:text-[#E4002B] transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                 <User size={20} />
              </div>
              <span className="font-bold text-sm hidden lg:block">{user?.name || "Profil"}</span>
            </Link>

            <Link to="/cart" className="relative group">
              <div className="w-12 h-12 rounded-full bg-[#E4002B] text-white flex items-center justify-center shadow-md shadow-red-200 transition-transform group-hover:scale-105">
                <ShoppingBag size={22} />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-slate-900 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                    {itemCount}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>
      </header>

      <AddressModal 
        isOpen={isAddressModalOpen} 
        onClose={() => setIsAddressModalOpen(false)}
        onSave={updateAddress}
        initialAddress={user?.currentAddress}
      />
    </>
  );
};

export default DesktopHeader;
