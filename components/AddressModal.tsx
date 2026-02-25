
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, X, Home, ArrowLeft, Search, Loader2 } from 'lucide-react';
import { Address } from '../types';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: Address) => void | Promise<void>;
  initialAddress?: Address;
}

const AddressModal: React.FC<AddressModalProps> = ({ isOpen, onClose, onSave, initialAddress }) => {
  const [step, setStep] = useState<'map' | 'details'>('map');
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialAddress ? { lat: initialAddress.lat, lng: initialAddress.lng } : null
  );
  
  // Details form state - STRICTLY ensure string type to avoid [object Object]
  const [addressName, setAddressName] = useState(
    (initialAddress?.addressName && typeof initialAddress.addressName === 'string') 
      ? initialAddress.addressName 
      : ""
  );
  const [entrance, setEntrance] = useState(initialAddress?.entrance || '');
  const [floor, setFloor] = useState(initialAddress?.floor || '');
  const [apartment, setApartment] = useState(initialAddress?.apartment || '');
  const [comment, setComment] = useState(initialAddress?.comment || '');

  // Leaflet Refs
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Map
  useEffect(() => {
    if (isOpen && step === 'map' && !mapRef.current && mapContainerRef.current) {
      const L = (window as any).L;
      if (!L) return;

      const initialLat = coords?.lat || 41.2995; // Tashkent default
      const initialLng = coords?.lng || 69.2401;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
        layers: [
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          })
        ]
      });

      // Update coords and fetch address when map is dragged
      map.on('moveend', () => {
        const center = map.getCenter();
        setCoords({ lat: center.lat, lng: center.lng });
        fetchAddress(center.lat, center.lng);
      });

      mapRef.current = map;
      
      // If no initial address, try to locate automatically once
      if (!initialAddress) {
        handleLocateMe();
      }
    }

    // Cleanup when modal closes
    if (!isOpen && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, [isOpen, step]);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz`
      );
      if (!response.ok) return;
      
      const data = await response.json();
      
      let formattedAddress = "";
      if (data && data.address) {
        const road = data.address.road || data.address.pedestrian || "";
        const houseNumber = data.address.house_number || "";
        const suburb = data.address.suburb || data.address.district || "";
        
        const parts = [road, houseNumber, suburb].filter(Boolean);
        formattedAddress = parts.join(", ");
      }
      
      if (!formattedAddress && data?.display_name) {
         formattedAddress = data.display_name.split(',').slice(0, 3).join(',');
      }

      setAddressName(typeof formattedAddress === 'string' ? formattedAddress : "Belgilangan joy");
    } catch (error) {
      console.error("Geocoding error:", error);
      setAddressName("Belgilangan joy");
    } finally {
      setLoading(false);
    }
  };

  const handleLocateMe = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          
          if (mapRef.current) {
            mapRef.current.flyTo([latitude, longitude], 17);
          } else {
             // Fallback if map isn't ready
             setCoords({ lat: latitude, lng: longitude });
             fetchAddress(latitude, longitude);
          }
        },
        (err) => {
          console.error(err);
          setLoading(false);
          alert("Geolokatsiyani aniqlab bo'lmadi.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLoading(false);
    }
  };

  const handleConfirmLocation = () => {
    setStep('details');
  };

  const handleSaveAll = async () => {
    if (!coords) return;
    try {
      await onSave({
        lat: coords.lat,
        lng: coords.lng,
        addressName: addressName || "Belgilanmagan manzil",
        entrance,
        floor,
        apartment,
        comment
      });
      onClose();
      setStep('map');
    } catch (saveError: any) {
      alert(saveError?.message ?? "Manzilni saqlab bo'lmadi.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* MAP VIEW STEP */}
      <div className={`flex-1 relative ${step === 'details' ? 'h-1/3 flex-none' : 'h-full'}`}>
        
        {/* Real Map Container */}
        <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-slate-100" />

        {/* Top Controls */}
        <div className="absolute top-4 left-4 z-10">
          <button onClick={onClose} className="bg-white p-3 rounded-full shadow-md text-slate-700 hover:bg-slate-50 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Center Pin Overlay */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-8 flex flex-col items-center pointer-events-none transition-all duration-300 z-20">
           <div className={`bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md shadow-lg mb-2 font-bold uppercase tracking-wide whitespace-nowrap transition-opacity ${loading ? 'opacity-100' : 'opacity-0'}`}>
              Aniqlanmoqda...
           </div>
           <div className="text-[#E4002B] filter drop-shadow-xl">
             <MapPin size={48} fill="#E4002B" className="text-white" />
           </div>
           <div className="w-4 h-1.5 bg-black/20 rounded-[100%] mt-[-4px] blur-[1px]"></div>
        </div>

        {/* Locate Me Button (Only in map view) */}
        {step === 'map' && (
          <div className="absolute bottom-6 right-4 z-10">
            <button onClick={handleLocateMe} className="bg-white p-3 rounded-full shadow-lg text-slate-900 hover:bg-slate-50 transition-transform active:scale-95">
              {loading ? <Loader2 size={24} className="animate-spin text-[#E4002B]" /> : <Navigation size={24} />}
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM SHEET CONTENT */}
      {step === 'map' ? (
        <div className="bg-white p-5 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] relative z-20 -mt-6">
           <h3 className="font-bold text-xl text-slate-900 mb-4">Qayerga yetkazaylik?</h3>
           
           {/* Address Input */}
           <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 mb-4 border focus-within:border-[#E4002B] transition-colors">
              <Search size={20} className="text-slate-400 flex-shrink-0" />
              <input 
                type="text" 
                value={addressName}
                onChange={(e) => setAddressName(e.target.value)}
                className="bg-transparent w-full outline-none font-medium text-slate-900 placeholder:text-slate-400"
                placeholder="Manzilni qidiring..."
              />
              {addressName && (
                <button onClick={() => setAddressName('')} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              )}
           </div>

           <button 
             onClick={handleConfirmLocation}
             className="w-full bg-[#E4002B] text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-red-200 uppercase tracking-wide"
           >
             Tasdiqlash
           </button>
        </div>
      ) : (
        /* DETAILS FORM STEP */
        <div className="bg-white flex-1 p-5 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] relative z-20 -mt-6 flex flex-col overflow-y-auto">
           <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep('map')} className="text-slate-500 p-2 hover:bg-slate-100 rounded-full">
                <ArrowLeft size={24} />
              </button>
              <h3 className="font-bold text-xl text-slate-900">Manzil tafsilotlari</h3>
           </div>

           <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-3 mb-6 border border-slate-100">
             <div className="bg-white p-2 rounded-full text-[#E4002B] shadow-sm flex-shrink-0">
               <Home size={24} />
             </div>
             <div className="flex-1 min-w-0">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Manzil</label>
               <input 
                  type="text"
                  value={addressName}
                  onChange={(e) => setAddressName(e.target.value)}
                  className="w-full bg-transparent font-bold text-slate-900 text-sm outline-none border-b border-transparent focus:border-[#E4002B] pb-0.5 truncate"
                  placeholder="Manzilni yozing"
               />
             </div>
           </div>

           {/* Quick Inputs Row */}
           <div className="grid grid-cols-3 gap-3 mb-4">
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 pl-1 uppercase">Podyezd</label>
                <input 
                  type="text" 
                  value={entrance}
                  onChange={e => setEntrance(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-lg px-3 py-3 font-bold focus:ring-2 focus:ring-[#E4002B]"
                />
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 pl-1 uppercase">Qavat</label>
                <input 
                  type="text" 
                  value={floor}
                  onChange={e => setFloor(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-lg px-3 py-3 font-bold focus:ring-2 focus:ring-[#E4002B]"
                />
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 pl-1 uppercase">Kv./Ofis</label>
                <input 
                  type="text" 
                  value={apartment}
                  onChange={e => setApartment(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-lg px-3 py-3 font-bold focus:ring-2 focus:ring-[#E4002B]"
                />
             </div>
           </div>

           <div className="mb-auto">
              <label className="text-xs font-bold text-slate-500 pl-1 mb-1 block uppercase">Kuryer uchun izoh</label>
              <textarea 
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Masalan: Domofon kodi 123"
                className="w-full bg-slate-100 border-none rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-[#E4002B] resize-none h-24"
              />
           </div>

           <button 
             onClick={handleSaveAll}
             className="w-full bg-[#E4002B] text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform mt-4 shadow-xl shadow-red-200 uppercase tracking-wide"
           >
             Manzilni saqlash
           </button>
        </div>
      )}
    </div>
  );
};

export default AddressModal;
