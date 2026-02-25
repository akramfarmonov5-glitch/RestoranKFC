
import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { TrendingUp, ShoppingBag, DollarSign, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const { orders } = useAdmin();

  const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-[#E4002B] mb-2">
            <ShoppingBag size={20} />
            <span className="text-sm font-medium">Buyurtmalar</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
          <p className="text-xs text-slate-400">{activeOrders} faol</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <DollarSign size={20} />
            <span className="text-sm font-medium">Tushum</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-400">so'm</p>
        </div>
      </div>

      <div className="space-y-4">
        <Link to="/admin/orders" className="block w-full bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50">
          <span className="font-semibold text-slate-700">Buyurtmalarni Boshqarish</span>
          <TrendingUp size={20} className="text-slate-400" />
        </Link>
        <Link to="/admin/menu" className="block w-full bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50">
          <span className="font-semibold text-slate-700">Menyu Tahrirlash</span>
          <TrendingUp size={20} className="text-slate-400" />
        </Link>
        <Link to="/admin/categories" className="block w-full bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50">
          <span className="font-semibold text-slate-700">Bo'limlarni Boshqarish</span>
          <TrendingUp size={20} className="text-slate-400" />
        </Link>
        <Link to="/admin/promotions" className="block w-full bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50">
          <span className="font-semibold text-slate-700">Aksiyalarni Boshqarish</span>
          <TrendingUp size={20} className="text-slate-400" />
        </Link>
        <Link to="/admin/knowledge" className="block w-full bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 shadow-sm">
          <div className="flex items-center gap-3">
             <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
               <BookOpen size={20} />
             </div>
             <div>
               <span className="font-semibold text-slate-900 block">Bilimlar Bazasi</span>
               <span className="text-xs text-slate-400">AI miyasini o'qitish</span>
             </div>
          </div>
          <TrendingUp size={20} className="text-slate-400" />
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
