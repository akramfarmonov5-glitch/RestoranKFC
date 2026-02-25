
import React, { useEffect, useState, useRef } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Save, Upload, FileText, Info } from 'lucide-react';

const AdminKnowledge: React.FC = () => {
  const { knowledgeBase, updateKnowledgeBase } = useAdmin();
  const [text, setText] = useState(knowledgeBase);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(knowledgeBase);
  }, [knowledgeBase]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await updateKnowledgeBase(text);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error: any) {
      alert(error?.message ?? "Bilimlar bazasini saqlab bo'lmadi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simple text file reading
    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          // Append to existing text
          setText(prev => prev + (prev ? "\n\n" : "") + `--- ${file.name} ---\n` + content);
        }
      };
      reader.readAsText(file);
    } else {
      alert("Hozircha faqat .txt fayllar qo'llab-quvvatlanadi. Word fayllarni matnini nusxalab qo'yishingiz mumkin.");
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen pb-32 md:pb-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
           <div>
             <h1 className="text-2xl font-bold text-slate-900 mb-2">Bilimlar Bazasi</h1>
             <p className="text-sm text-slate-500">
               Sun'iy intellektga restoraningiz haqida ma'lumotlarni o'rgating.
             </p>
           </div>
           
           {/* Desktop Save Button */}
           <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`hidden md:flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg hover:shadow-xl ${
                 isSaved ? 'bg-green-600' : 'bg-[#E4002B] hover:bg-red-700 shadow-red-200'
              }`}
            >
              {isSaving ? 'Saqlanmoqda...' : isSaved ? 'Saqlandi!' : <><Save size={20} /> Saqlash</>}
            </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 flex flex-col">
           {/* Info & Upload Row */}
           <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg text-blue-800 text-sm flex-1">
                 <Info className="flex-shrink-0 w-5 h-5 mt-0.5" />
                 <p>Bu yerga yozilgan ma'lumotlar (ish vaqti, Wi-Fi, manzil mo'ljali) AI tomonidan o'rganib chiqiladi va mijozlarga javob berishda ishlatiladi.</p>
              </div>

              <div className="flex-shrink-0">
                 <input 
                   type="file" 
                   ref={fileInputRef}
                   className="hidden" 
                   accept=".txt"
                   onChange={handleFileUpload}
                 />
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="w-full md:w-auto flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-4 py-3 rounded-xl transition-colors active:bg-slate-200"
                 >
                   <Upload size={18} />
                   .txt yuklash
                 </button>
              </div>
           </div>

           {/* Text Area - Auto height with min-height */}
           <textarea 
             className="flex-1 w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#E4002B] focus:bg-white transition-all font-mono text-sm leading-relaxed min-h-[60vh] md:min-h-[500px] resize-y"
             placeholder="Masalan: Bizning restoran 09:00 dan 23:00 gacha ishlaydi. Wi-Fi paroli: kfc_2024. Bizda bolalar maydonchasi bor..."
             value={text}
             onChange={(e) => setText(e.target.value)}
           ></textarea>
        </div>
      </div>

      {/* Mobile Fixed Save Button */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white p-4 border-t border-slate-100 z-30 pb-safe">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
             isSaved ? 'bg-green-600 text-white' : 'bg-[#E4002B] text-white shadow-red-200'
          }`}
        >
          {isSaving ? 'Saqlanmoqda...' : isSaved ? 'Saqlandi!' : <><Save size={20} /> Saqlash</>}
        </button>
      </div>
    </div>
  );
};

export default AdminKnowledge;
