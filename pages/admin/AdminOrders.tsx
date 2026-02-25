
import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { OrderStatus } from '../../types';
import { MapPin, Phone, Clock, ChefHat, Bike, CheckCircle, AlertOctagon } from 'lucide-react';

const statusConfig: Record<OrderStatus, { color: string, label: string, icon: any }> = {
  new: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Yangi', icon: Clock },
  cooking: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Oshxonada', icon: ChefHat },
  delivering: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Kuryerda', icon: Bike },
  completed: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Tamomlandi', icon: CheckCircle },
  cancelled: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Bekor qilindi', icon: AlertOctagon },
};

type TabType = 'all' | OrderStatus;

const AdminOrders: React.FC = () => {
  const { orders, updateOrderStatus } = useAdmin();
  const [activeTab, setActiveTab] = useState<TabType>('new');

  // Filter orders based on active tab
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  const tabs: { id: TabType; label: string }[] = [
    { id: 'new', label: 'Yangi' },
    { id: 'cooking', label: 'Tayyorlash' },
    { id: 'delivering', label: 'Yetkazish' },
    { id: 'completed', label: 'Tarix' },
    { id: 'cancelled', label: 'Bekor' },
    { id: 'all', label: 'Barchasi' },
  ];

  return (
    <div className="p-4 bg-slate-50 min-h-screen pb-24 md:pb-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Buyurtmalar</h1>
        <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
          Jami: {orders.length}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide md:flex-wrap">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tab.id === 'all' 
            ? orders.length 
            : orders.filter(o => o.status === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                isActive 
                  ? 'bg-[#E4002B] text-white border-[#E4002B] shadow-lg shadow-red-100' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white text-[#E4002B]' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
               <Clock size={32} />
            </div>
            <p className="text-slate-500 font-medium">Bu bo'limda buyurtmalar yo'q</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const StatusIcon = statusConfig[order.status].icon;
            
            return (
              <div key={order.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-bold text-slate-700 border border-slate-200">
                      {(order.customer.name?.trim()?.charAt(0) || order.customer.phone.charAt(0) || '#').toUpperCase()}
                    </div>
                    <div>
                       <p className="font-bold text-sm text-slate-900">{order.customer.name || "Mijoz"}</p>
                       <p className="text-[10px] text-slate-400 font-medium uppercase">{order.customer.phone}</p>
                       <p className="text-[10px] text-slate-400 font-medium uppercase">{order.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 uppercase tracking-wide ${statusConfig[order.status].color}`}>
                    <StatusIcon size={12} />
                    {statusConfig[order.status].label}
                  </div>
                </div>

                {order.customer.location && (
                   <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                     <a 
                       href={`https://www.google.com/maps?q=${order.customer.location.lat},${order.customer.location.lng}`}
                       target="_blank"
                       rel="noreferrer"
                       className="text-xs text-slate-700 flex items-start gap-2 hover:text-blue-600 transition-colors group"
                     >
                       <MapPin size={14} className="text-[#E4002B] mt-0.5 flex-shrink-0" />
                       <span className="line-clamp-2 leading-relaxed font-medium">
                         {order.customer.location.addressName}
                       </span>
                     </a>
                     {order.customer.location.comment && (
                       <p className="text-xs text-slate-500 mt-2 pl-6 border-l-2 border-slate-200 italic">
                         "{order.customer.location.comment}"
                       </p>
                     )}
                   </div>
                )}

                <div className="flex-1 space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm items-center border-b border-dashed border-slate-100 pb-1 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 bg-slate-100 px-1.5 rounded text-xs">{item.quantity}x</span>
                        <span className="text-slate-600 truncate max-w-[150px]">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-700">{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between items-center mb-4 pt-3 border-t border-slate-100">
                     <span className="text-xs font-bold text-slate-400 uppercase">Jami summa</span>
                     <span className="font-black text-lg text-[#E4002B]">{order.total.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {order.status === 'new' && (
                      <button onClick={() => updateOrderStatus(order.id, 'cooking')} className="col-span-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <ChefHat size={16} /> Oshxonaga
                      </button>
                    )}
                    {order.status === 'cooking' && (
                      <button onClick={() => updateOrderStatus(order.id, 'delivering')} className="col-span-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Bike size={16} /> Kuryerga berish
                      </button>
                    )}
                    {order.status === 'delivering' && (
                      <button onClick={() => updateOrderStatus(order.id, 'completed')} className="col-span-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <CheckCircle size={16} /> Yetkazildi
                      </button>
                    )}
                    
                    {/* Common actions */}
                    {order.status !== 'cancelled' && order.status !== 'completed' && (
                       <>
                         {order.status !== 'new' && order.status !== 'cooking' && order.status !== 'delivering' && <div className="hidden"></div>}
                         <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="col-span-2 mt-2 py-2 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors">
                            Bekor qilish
                         </button>
                       </>
                    )}
                    {order.status === 'new' && (
                        <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="col-span-2 mt-1 py-2 text-red-400 hover:text-red-600 text-xs font-bold">
                           Bekor qilish
                        </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
