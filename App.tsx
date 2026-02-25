import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import DesktopHeader from './components/DesktopHeader'; // Import Desktop Header
import LoginPage from './pages/LoginPage';
import { User, Shield, LogOut } from 'lucide-react';

const LiveAgent = lazy(() => import('./components/LiveAgent'));
const HomePage = lazy(() => import('./pages/HomePage'));
const MenuPage = lazy(() => import('./pages/MenuPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminMenu = lazy(() => import('./pages/admin/AdminMenu'));
const AdminKnowledge = lazy(() => import('./pages/admin/AdminKnowledge'));
const AdminPromotions = lazy(() => import('./pages/admin/AdminPromotions'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));

const RouteSkeleton: React.FC = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-slate-400 text-sm font-semibold">
    Yuklanmoqda...
  </div>
);

const ProfilePage = () => {
  const { user, logout, isAdmin } = useAuth();
  const { orders } = useAdmin();
  
  const userOrders = orders.filter(o => o.customer.phone === user?.phone);
  
  return (
    <div className="p-6 pt-10 min-h-screen bg-slate-50 pb-24 md:pb-10">
      <div className="max-w-md mx-auto w-full"> {/* Center content on desktop */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center mb-6">
           <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center text-blue-600">
             <User size={32} />
           </div>
           <h2 className="text-xl font-bold text-slate-900">{user?.name || 'Foydalanuvchi'}</h2>
           <p className="text-slate-400 text-sm">{user?.phone || '+998 -- --- -- --'}</p>
        </div>
        
        {isAdmin && (
          <Link to="/admin" className="block w-full bg-slate-900 text-white p-4 rounded-xl mb-4 flex items-center justify-center gap-2 shadow-lg shadow-slate-300">
            <Shield size={18} /> Admin Panelga Kirish
          </Link>
        )}

        <button 
          onClick={logout}
          className="w-full bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center justify-center gap-2 font-semibold border border-red-100"
        >
          <LogOut size={18} /> Hisobdan chiqish
        </button>

        <h3 className="font-bold text-slate-900 mb-4 px-2">Buyurtmalar tarixi</h3>
        <div className="space-y-3">
           {userOrders.length === 0 ? (
             <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400 text-sm">
                Tarix bo'sh
             </div>
           ) : (
             userOrders.map(order => (
               <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                 <div className="flex justify-between items-center mb-2">
                   <span className="font-bold text-slate-900">#{order.id.slice(-4)}</span>
                   <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                     order.status === 'completed' ? 'bg-green-100 text-green-700' :
                     order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                     'bg-blue-100 text-blue-700'
                   }`}>
                     {order.status === 'completed' ? 'Yetkazildi' : 
                      order.status === 'cancelled' ? 'Bekor qilindi' : 'Jarayonda'}
                   </span>
                 </div>
                 <div className="text-xs text-slate-500 mb-3">
                   {order.timestamp.toLocaleDateString()} {order.timestamp.toLocaleTimeString()}
                 </div>
                 <div className="space-y-1 mb-3">
                   {order.items.map((item, idx) => (
                     <div key={idx} className="flex justify-between text-sm">
                       <span className="text-slate-600">{item.quantity}x {item.name}</span>
                       <span className="font-medium">{(item.price * item.quantity).toLocaleString()}</span>
                     </div>
                   ))}
                 </div>
                 <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                   <span className="text-xs font-bold text-slate-400 uppercase">Jami</span>
                   <span className="font-bold text-[#E4002B]">{order.total.toLocaleString()} so'm</span>
                 </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};

const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/profile" replace />;
  }
  return children;
};

const MainApp: React.FC = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.MainButton.hide(); 
    }
  }, []);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AdminProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative flex flex-col">
            <DesktopHeader />
            
            <div className="flex-1 w-full max-w-7xl mx-auto md:px-6">
              <Suspense fallback={<RouteSkeleton />}>
                <Routes>
                  {/* Customer Routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/menu" element={<MenuPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                  <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
                  <Route path="/admin/menu" element={<AdminRoute><AdminMenu /></AdminRoute>} />
                  <Route path="/admin/knowledge" element={<AdminRoute><AdminKnowledge /></AdminRoute>} />
                  <Route path="/admin/promotions" element={<AdminRoute><AdminPromotions /></AdminRoute>} />
                  <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
                  
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </div>
            
            {/* Global Floating Components */}
            <Suspense fallback={null}>
              <LiveAgent />
            </Suspense>
            <BottomNav />
          </div>
        </Router>
      </CartProvider>
    </AdminProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
