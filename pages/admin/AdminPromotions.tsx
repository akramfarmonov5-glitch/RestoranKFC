import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { Promotion } from '../../types';

const AdminPromotions: React.FC = () => {
  const { promotions, addPromotion, updatePromotion, deletePromotion } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  
  const [formData, setFormData] = useState<Promotion>({
    id: '',
    title: '',
    description: '',
    image: '',
    color: 'bg-[#E4002B]'
  });

  const openModal = (promo?: Promotion) => {
    if (promo) {
      setEditingPromo(promo);
      setFormData(promo);
    } else {
      setEditingPromo(null);
      setFormData({
        id: Date.now().toString(),
        title: '',
        description: '',
        image: '',
        color: 'bg-[#E4002B]'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPromo) {
      updatePromotion(formData);
    } else {
      addPromotion(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Aksiyalarni Boshqarish</h1>
        <button 
          onClick={() => openModal()}
          className="bg-[#E4002B] text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium"
        >
          <Plus size={20} /> Qo'shish
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.map(promo => (
          <div key={promo.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="h-40 relative">
              <img src={promo.image} alt={promo.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-3 left-3 right-3">
                <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full mb-1 inline-block ${promo.color}`}>
                  Aksiya
                </span>
                <h3 className="font-bold text-white text-lg leading-tight">{promo.title}</h3>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">{promo.description}</p>
              <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                <button onClick={() => openModal(promo)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => deletePromotion(promo.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg">{editingPromo ? 'Tahrirlash' : "Yangi qo'shish"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sarlavha</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#E4002B] outline-none"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tavsif</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#E4002B] outline-none resize-none"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rasm URL</label>
                <input 
                  required
                  type="url" 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#E4002B] outline-none"
                  value={formData.image}
                  onChange={e => setFormData({...formData, image: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rang klassi (Tailwind)</label>
                <input 
                  required
                  type="text" 
                  placeholder="Masalan: bg-red-600"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#E4002B] outline-none"
                  value={formData.color}
                  onChange={e => setFormData({...formData, color: e.target.value})}
                />
              </div>
              
              <button type="submit" className="w-full bg-[#E4002B] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-4">
                <Save size={20} /> Saqlash
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromotions;
