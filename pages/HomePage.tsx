
import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import AddressModal from '../components/AddressModal';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, MapPin, ChevronDown } from 'lucide-react';

const HomePage: React.FC = () => {
  const { menuItems, promotions, categories } = useAdmin();
  const { user, updateAddress } = useAuth();
  
  const featured = menuItems; 
  
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  useEffect(() => {
    if (user && !user.currentAddress) {
      const timer = setTimeout(() => setIsAddressModalOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <div className="pb-24 md:pb-12 bg-slate-50 min-h-screen">
      {/* Mobile Header (Hidden on Desktop) */}
      <div className="md:hidden sticky top-0 z-40 bg-white shadow-sm pt-4 pb-2 px-4">
         <div className="flex items-center gap-1 mb-1">
           <span className="text-xs text-slate-400 font-medium">Yetkazib berish manzili</span>
         </div>
         <button 
           onClick={() => setIsAddressModalOpen(true)}
           className="flex items-center gap-2 text-slate-900 font-bold text-lg active:opacity-70"
         >
           <MapPin size={20} className="text-[#E4002B]" />
           <span className="truncate max-w-[250px]">
             {user?.currentAddress ? user.currentAddress.addressName : "Manzilni tanlang"}
           </span>
           <ChevronDown size={16} className="text-slate-400" />
         </button>
      </div>

      {/* Hero Header */}
      <div className="px-4 mt-4 mb-6 md:mt-8">
        <div className="bg-[#E4002B] text-white p-6 rounded-[2rem] relative shadow-lg overflow-hidden border-2 border-white/20 h-48 md:h-64 flex flex-col justify-center max-w-5xl mx-auto">
          <div className="relative z-10 w-2/3">
            <h2 className="text-3xl md:text-5xl font-black leading-none mb-2 tracking-tight uppercase italic drop-shadow-md">
              IT'S FINGER<br/>LICKIN'<br/>GOOD
            </h2>
            <p className="text-white text-sm md:text-lg mb-4 font-medium opacity-90 drop-shadow-sm">KFC endi ovozli yordamchi bilan!</p>
          </div>
          
          <div className="absolute top-0 right-0 w-40 h-full bg-white opacity-10 skew-x-12 transform translate-x-10"></div>
          <div className="absolute top-0 right-14 w-10 h-full bg-white opacity-10 skew-x-12 transform translate-x-10"></div>
          
          <img 
            src="https://images.ctfassets.net/wtodlh47qqxe/6y7z8a9b0c1d2e3f/fedcba0987654321fedcba0987654321/Bucket_26_Wings_772x574.png?w=600&h=446&q=90&fm=webp" 
            alt="KFC Bucket"
            className="absolute -bottom-8 -right-8 w-48 md:w-72 h-auto object-contain drop-shadow-2xl rotate-[-5deg]"
          />
        </div>
      </div>

      {/* PROMO BANNERS SECTION - Responsive Grid on MD */}
      <div className="px-4 mb-8">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Aksiyalar</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 snap-x md:grid md:grid-cols-3 md:mx-0 md:px-0 md:overflow-visible">
          {promotions.map((promo) => (
             <div key={promo.id} className="snap-center flex-shrink-0 w-[280px] md:w-auto h-[160px] md:h-[200px] rounded-2xl overflow-hidden relative group shadow-md transition-transform hover:shadow-lg">
                <img src={promo.image} alt={promo.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-4 w-full">
                  <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full mb-2 inline-block ${promo.color || 'bg-[#E4002B]'}`}>
                     Aksiya
                  </span>
                  <h4 className="text-white font-bold text-lg leading-tight mb-1">{promo.title}</h4>
                  <p className="text-white/80 text-xs line-clamp-1">{promo.description}</p>
                </div>
             </div>
          ))}
        </div>
      </div>

      {/* Featured Section - Responsive Grid on MD */}
      <div className="px-4 mb-8">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-xl font-bold text-slate-900">Top Mahsulotlar</h3>
          <Link to="/menu" className="text-[#E4002B] text-sm font-bold flex items-center gap-1 uppercase">
            Barchasi <ArrowRight size={14} />
          </Link>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:grid md:grid-cols-4 lg:grid-cols-5 md:mx-0 md:px-0 md:overflow-visible">
          {featured.map(item => (
            <Link key={item.id} to="/menu" className="flex-shrink-0 w-[170px] md:w-auto bg-white rounded-2xl p-2.5 shadow-sm border border-slate-100 block group transition-all active:scale-95 hover:shadow-md">
              <div className="relative h-32 rounded-xl overflow-hidden mb-2.5 bg-slate-50">
                <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                <div className="absolute top-1.5 right-1.5 bg-white/90 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-[10px] font-bold shadow-sm">
                  <Star size={8} className="text-[#E4002B] fill-[#E4002B]" /> 4.9
                </div>
              </div>
              <h4 className="font-bold text-slate-900 text-sm truncate leading-tight mb-0.5">{item.name}</h4>
              <p className="text-slate-400 text-[10px] mb-2 truncate font-medium uppercase tracking-wide">{item.category}</p>
              
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-900 text-sm">{item.price.toLocaleString()} so'm</span>
                <div className="w-8 h-8 rounded-full bg-[#E4002B] flex items-center justify-center text-white shadow-md shadow-red-200">
                  <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Categories Teaser */}
      <div className="px-4">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Menyu bo'limlari</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <Link to="/menu" key={cat.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3 hover:shadow-md transition-shadow active:scale-95 border-l-4 border-l-transparent hover:border-l-[#E4002B]">
               <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-xl shadow-sm">
                 {cat.icon}
               </div>
               <span className="font-bold text-sm text-slate-800 uppercase tracking-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <AddressModal 
        isOpen={isAddressModalOpen} 
        onClose={() => setIsAddressModalOpen(false)}
        onSave={updateAddress}
        initialAddress={user?.currentAddress}
      />
    </div>
  );
};

export default HomePage;
