import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { Category } from '../../types';

const AdminCategories: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  
  const [formData, setFormData] = useState<Category>({
    id: '',
    name: '',
    icon: ''
  });

  const openModal = (cat?: Category) => {
    if (cat) {
      setEditingCat(cat);
      setFormData(cat);
    } else {
      setEditingCat(null);
      setFormData({
        id: Date.now().toString(),
        name: '',
        icon: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCat) {
      updateCategory(formData);
    } else {
      addCategory(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bo'limlarni Boshqarish</h1>
        <button 
          onClick={() => openModal()}
          className="bg-[#E4002B] text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium"
        >
          <Plus size={20} /> Qo'shish
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl">
                {cat.icon}
              </div>
              <h3 className="font-bold text-lg text-slate-900">{cat.name}</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openModal(cat)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                <Edit2 size={18} />
              </button>
              <button onClick={() => deleteCategory(cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg">{editingCat ? 'Tahrirlash' : "Yangi qo'shish"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nomi</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#E4002B] outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ikonka (Emoji)</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#E4002B] outline-none"
                  value={formData.icon}
                  onChange={e => setFormData({...formData, icon: e.target.value})}
                />
              </div>
              
              <button type="submit" className="w-full bg-[#E4002B] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                <Save size={20} /> Saqlash
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
