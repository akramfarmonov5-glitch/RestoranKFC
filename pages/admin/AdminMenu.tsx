
import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Trash2, Edit2, Plus, X, Save } from 'lucide-react';
import { Product } from '../../types';

const AdminMenu: React.FC = () => {
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = useAdmin();
  const [editingItem, setEditingItem] = useState<Partial<Product> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSave = () => {
    if (!editingItem?.name || !editingItem?.price || !editingItem?.category) return;

    // Use the image URL provided by the user, or fallback to a random one ONLY if it's completely empty.
    const imageToUse = editingItem.image && editingItem.image.trim() !== '' 
      ? editingItem.image 
      : `https://picsum.photos/200/200?random=${Date.now()}`;

    const product: Product = {
      id: editingItem.id || Date.now().toString(),
      name: editingItem.name,
      price: Number(editingItem.price),
      category: editingItem.category,
      image: imageToUse,
      description: editingItem.description || '',
    };

    if (editingItem.id) {
      updateMenuItem(product);
    } else {
      addMenuItem(product);
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const openNew = () => {
    setEditingItem({ category: 'Asosiy', image: '' });
    setIsModalOpen(true);
  };

  const openEdit = (item: Product) => {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 bg-slate-50 min-h-screen pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Menyu Boshqaruvi</h1>
        <button onClick={openNew} className="bg-blue-600 text-white p-2 rounded-full shadow-lg">
          <Plus size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {menuItems.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <img src={item.image} className="w-16 h-16 rounded-lg object-cover bg-slate-100" alt={item.name} />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 truncate">{item.name}</h3>
              <p className="text-xs text-slate-500 truncate">{item.description || 'Tavsif yo\'q'}</p>
              <p className="text-sm text-slate-500 font-medium mt-1">{item.price.toLocaleString()} so'm</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(item)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <Edit2 size={16} />
              </button>
              <button onClick={() => deleteMenuItem(item.id)} className="p-2 bg-red-50 rounded-lg text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {editingItem?.id ? "Tahrirlash" : "Yangi taom"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1 hover:bg-slate-100 rounded-full">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nomi</label>
                <input 
                  className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
                  value={editingItem?.name || ''}
                  onChange={e => setEditingItem(prev => ({...prev, name: e.target.value}))}
                  placeholder="Masalan: Oshpaz Palov"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Rasm URL</label>
                <input 
                  className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
                  value={editingItem?.image || ''}
                  onChange={e => setEditingItem(prev => ({...prev, image: e.target.value}))}
                  placeholder="https://rasm-linki.jpg"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Qisqa Tavsif</label>
                <textarea 
                  className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 h-20 resize-none text-sm transition-colors"
                  value={editingItem?.description || ''}
                  onChange={e => setEditingItem(prev => ({...prev, description: e.target.value}))}
                  placeholder="Taom haqida qisqacha ma'lumot..."
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Narxi (so'm)</label>
                  <input 
                    type="number"
                    className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
                    value={editingItem?.price || ''}
                    onChange={e => setEditingItem(prev => ({...prev, price: Number(e.target.value)}))}
                    placeholder="45000"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Kategoriya</label>
                  <select 
                    className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 bg-white transition-colors"
                    value={editingItem?.category || 'Asosiy'}
                    onChange={e => setEditingItem(prev => ({...prev, category: e.target.value}))}
                  >
                    <option>Asosiy</option>
                    <option>Basketlar</option>
                    <option>Burgerlar</option>
                    <option>Tvisterlar</option>
                    <option>Sneklar</option>
                    <option>Tovuq</option>
                    <option>Ichimliklar</option>
                    <option>Shirinlik</option>
                  </select>
                </div>
              </div>

              <button onClick={handleSave} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                <Save size={18} /> Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
