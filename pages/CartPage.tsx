
import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, Minus, Plus, ArrowRight, CheckCircle2, ShoppingBag, MapPin, Phone, ArrowLeft, Home, Ticket, CreditCard, Banknote, ChevronRight } from 'lucide-react';
import { Order, PaymentMethod } from '../types';
import AddressModal from '../components/AddressModal';

const PAYNET_XOLIS_URL = 'https://app.paynet.uz/?m=49156&i=4805742d-d76c-4b39-8c02-8ddf1c450f33&branchId=&actTypeId=';

const CartPage: React.FC = () => {
  const { cartItems, addToCart, removeFromCart, clearCart, getCartTotal } = useCart();
  const { addOrder } = useAdmin();
  const { user, updateAddress } = useAuth();
  
  // States
  const [step, setStep] = useState<'cart' | 'details' | 'success'>('cart');
  const [error, setError] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  
  // Form States for Checkout
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  useEffect(() => {
    if (user?.currentAddress) {
      setEntrance(user.currentAddress.entrance || '');
      setFloor(user.currentAddress.floor || '');
      setApartment(user.currentAddress.apartment || '');
      setComment(user.currentAddress.comment || '');
    }
  }, [user, step]);
  
  const total = getCartTotal();
  const deliveryFee = 12000; // KFC delivery fee
  const finalTotal = total + deliveryFee;

  const openPaynetXolis = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(PAYNET_XOLIS_URL, { try_instant_view: false });
      return;
    }
    window.open(PAYNET_XOLIS_URL, '_blank', 'noopener,noreferrer');
  };

  const handleFinalCheckout = async () => {
    if (!user?.currentAddress) {
      setError("Yetkazib berish manzili tanlanmagan.");
      setIsAddressModalOpen(true);
      return;
    }

    const updatedAddress = {
      ...user.currentAddress,
      entrance,
      floor,
      apartment,
      comment
    };
    setError(null);

    const newOrder: Order = {
      id: '',
      customer: {
        phone: user.phone,
        name: user.name,
        location: updatedAddress
      },
      items: [...cartItems],
      total: finalTotal,
      status: 'new',
      paymentMethod: paymentMethod,
      timestamp: new Date()
    };

    try {
      await updateAddress(updatedAddress);
      const createdOrder = await addOrder(newOrder);

      const telegramData = {
        order_id: createdOrder.id,
        customer: { name: user.name, phone: user.phone, location: updatedAddress },
        items: cartItems.map(i => ({ name: i.name, price: i.price, qty: i.quantity })),
        total: finalTotal,
        payment: paymentMethod
      };
      
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.sendData(JSON.stringify(telegramData));
      }

      if (paymentMethod === 'card') {
        openPaynetXolis();
      }
      
      setStep('success');
      setTimeout(() => {
          void clearCart();
          setStep('cart');
      }, 3000);
    } catch (checkoutError: any) {
      setError(checkoutError?.message ?? "Buyurtmani rasmiylashtirib bo'lmadi.");
    }
  };

  if (step === 'success') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-white text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 size={40} className="text-[#E4002B]" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Buyurtma Qabul Qilindi!</h2>
        <p className="text-slate-500 mb-4">KFC kuryeri tez orada yetib boradi.</p>
      </div>
    );
  }

  if (cartItems.length === 0 && step === 'cart') {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag size={40} className="text-[#E4002B]" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Savatcha bo'sh</h2>
        <p className="text-slate-500 text-sm">Hali qarsildoq tovuqlarni tanlamadingiz.</p>
      </div>
    );
  }

  // --- CHECKOUT DETAILS VIEW ---
  if (step === 'details') {
    return (
      <div className="min-h-screen bg-slate-50 pb-32 md:pb-10">
        <div className="bg-white px-4 py-4 flex items-center gap-4 sticky top-0 md:top-20 z-30 shadow-sm border-b border-slate-100 md:rounded-xl md:mt-4 md:mb-4">
           <button onClick={() => setStep('cart')} className="text-slate-800">
             <ArrowLeft size={24} />
           </button>
           <h1 className="text-lg font-bold text-slate-900">To'lov</h1>
        </div>

        <div className="p-4 md:grid md:grid-cols-2 md:gap-8 max-w-4xl mx-auto">
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm font-semibold p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}
            {/* Address Section */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <button 
                onClick={() => setIsAddressModalOpen(true)}
                className="flex items-center gap-3 w-full mb-4"
              >
                 <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-[#E4002B]">
                   <Home size={18} />
                 </div>
                 <div className="flex-1 text-left">
                   <p className="font-bold text-sm text-slate-900">
                     {user?.currentAddress ? "Yetkazish manzili" : "Manzil tanlang"}
                   </p>
                   <p className="text-xs text-slate-500 truncate max-w-[200px]">
                     {user?.currentAddress?.addressName || "Xaritadan belgilang"}
                   </p>
                 </div>
                 <ChevronRight size={16} className="text-slate-400" />
              </button>

              <div className="grid grid-cols-3 gap-3 mb-3">
                 <input type="text" placeholder="Podyezd" value={entrance} onChange={e => setEntrance(e.target.value)} className="bg-slate-50 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-[#E4002B]" />
                 <input type="text" placeholder="Qavat" value={floor} onChange={e => setFloor(e.target.value)} className="bg-slate-50 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-[#E4002B]" />
                 <input type="text" placeholder="Kv./Ofis" value={apartment} onChange={e => setApartment(e.target.value)} className="bg-slate-50 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-[#E4002B]" />
              </div>

              <div className="bg-slate-50 rounded-xl px-3 py-3">
                 <input type="text" placeholder="Kuryer uchun izoh" value={comment} onChange={e => setComment(e.target.value)} className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" />
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
               <h3 className="font-bold text-slate-900 mb-3 text-lg">To'lov turi</h3>
               <div className="flex gap-3">
                  <button onClick={() => setPaymentMethod('card')} className={`flex-1 p-3 rounded-xl border-2 flex flex-col items-start gap-2 transition-all ${paymentMethod === 'card' ? 'border-[#E4002B] bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                    <CreditCard size={20} className={paymentMethod === 'card' ? 'text-[#E4002B]' : 'text-slate-400'} />
                    <span className={`text-xs font-bold ${paymentMethod === 'card' ? 'text-slate-900' : 'text-slate-500'}`}>Karta (Paynet Xolis)</span>
                  </button>
                  <button onClick={() => setPaymentMethod('cash')} className={`flex-1 p-3 rounded-xl border-2 flex flex-col items-start gap-2 transition-all ${paymentMethod === 'cash' ? 'border-[#E4002B] bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                    <Banknote size={20} className={paymentMethod === 'cash' ? 'text-[#E4002B]' : 'text-slate-400'} />
                    <span className={`text-xs font-bold ${paymentMethod === 'cash' ? 'text-slate-900' : 'text-slate-500'}`}>Naqd</span>
                  </button>
               </div>

               {paymentMethod === 'card' && (
                 <p className="mt-3 text-xs text-slate-600">
                   To'lash tugmasini bossangiz, Paynet Xolis ilovasi ochiladi.
                 </p>
               )}
            </div>
          </div>

          {/* Right Column / Summary for Desktop */}
          <div className="mt-4 md:mt-0">
             <div className="bg-white rounded-t-3xl md:rounded-3xl p-6 pb-20 md:pb-6 md:sticky md:top-24 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] md:shadow-lg md:border border-slate-100">
               <h3 className="text-xl font-bold text-slate-900 mb-4 hidden md:block">Hisob-kitob</h3>
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold text-slate-900 md:text-base">Jami</h3>
                 <span className="text-2xl font-black text-[#E4002B]">{finalTotal.toLocaleString()}</span>
               </div>
               
               <div className="space-y-2 mb-6 border-b border-slate-100 pb-4">
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Mahsulotlar</span>
                    <span className="font-bold text-slate-900">{total.toLocaleString()} so'm</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Yetkazib berish</span>
                    <span className="font-bold text-slate-900">{deliveryFee.toLocaleString()} so'm</span>
                 </div>
               </div>

                {/* Mobile Fixed Button */}
                <div className="fixed bottom-0 left-0 w-full bg-white p-4 border-t border-slate-100 z-[60] pb-safe md:hidden">
                  <button onClick={handleFinalCheckout} className="w-full bg-[#E4002B] text-white rounded-xl py-4 flex items-center justify-between px-6 font-bold text-lg active:scale-95 transition-transform shadow-xl shadow-red-200 uppercase tracking-wide">
                    <span>To'lash</span>
                    <span>{finalTotal.toLocaleString()} so'm</span>
                  </button>
                </div>

                {/* Desktop Button */}
                <button onClick={handleFinalCheckout} className="hidden md:flex w-full bg-[#E4002B] hover:bg-red-700 text-white rounded-xl py-4 items-center justify-center px-6 font-bold text-lg active:scale-95 transition-transform shadow-xl shadow-red-200 uppercase tracking-wide">
                    To'lash - {finalTotal.toLocaleString()} so'm
                </button>
             </div>
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
  }

  // --- CART VIEW ---
  return (
    <div className="pt-6 pb-32 md:pb-10 px-4 min-h-screen bg-slate-50">
      <h1 className="text-2xl font-bold text-slate-900 mb-6 uppercase tracking-tight">Savatcha</h1>
      
      <div className="md:grid md:grid-cols-3 md:gap-8">
        <div className="space-y-4 md:col-span-2">
          {cartItems.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0">
                 <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 text-sm mb-1 leading-tight">{item.name}</h4>
                <p className="text-xs text-slate-500 font-medium mb-2">{item.price.toLocaleString()} so'm</p>
              </div>
              <div className="flex flex-col items-end gap-3">
                 <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-200">
                    <button onClick={() => { void removeFromCart(item.id, 1); }} className="p-1.5 hover:bg-white rounded-md transition-colors">
                      {item.quantity === 1 ? <Trash2 size={16} className="text-red-500" /> : <Minus size={16} className="text-slate-600" />}
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => { void addToCart(item, 1); }} className="p-1.5 hover:bg-white rounded-md transition-colors">
                      <Plus size={16} className="text-slate-600" />
                    </button>
                 </div>
                 <span className="text-sm font-bold text-slate-900">
                   {(item.price * item.quantity).toLocaleString()}
                 </span>
              </div>
            </div>
          ))}
        </div>

        <div className="md:col-span-1 mt-6 md:mt-0">
           {/* Desktop Summary Card */}
           <div className="hidden md:block bg-white p-6 rounded-3xl shadow-lg border border-slate-100 sticky top-24">
              <div className="flex justify-between items-center mb-6">
                <span className="text-slate-500 font-medium text-sm uppercase">Jami summa</span>
                <span className="text-2xl font-black text-slate-900">{total.toLocaleString()}</span>
              </div>
              <button 
                onClick={() => setStep('details')}
                className="w-full bg-[#E4002B] hover:bg-red-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-red-200 uppercase tracking-wide"
              >
                Rasmiylashtirish <ArrowRight size={18} />
              </button>
           </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Card */}
      <div className="md:hidden fixed bottom-20 left-4 right-4 bg-white p-5 rounded-2xl shadow-xl border border-slate-100 z-20">
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-500 font-medium text-sm uppercase">Jami summa</span>
          <span className="text-2xl font-black text-slate-900">{total.toLocaleString()} so'm</span>
        </div>
        <button 
          onClick={() => setStep('details')}
          className="w-full bg-[#E4002B] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-red-200 uppercase tracking-wide"
        >
          Rasmiylashtirish <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default CartPage;
