import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const { login, loginWithTelegram } = useAuth();
  const [phone, setPhone] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const telegramInitData = useMemo(() => {
    const raw = window.Telegram?.WebApp?.initData;
    return typeof raw === 'string' ? raw.trim() : '';
  }, []);
  const telegramAutoTriedRef = useRef(false);
  const hasTelegramAuth = telegramInitData.length > 0;

  useEffect(() => {
    if (!hasTelegramAuth || telegramAutoTriedRef.current) return;

    telegramAutoTriedRef.current = true;
    let isCancelled = false;

    const autoLogin = async () => {
      setIsSubmitting(true);
      setError('');

      const result = await loginWithTelegram(telegramInitData);
      if (!result.ok && !isCancelled) {
        setError(result.error);
        setIsSubmitting(false);
      }
    };

    void autoLogin();

    return () => {
      isCancelled = true;
    };
  }, [hasTelegramAuth, loginWithTelegram, telegramInitData]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 9) val = val.slice(0, 9);
    setPhone(val);
    setError('');
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (isSubmitting) return;

    if (phone.length < 9) {
      setError("Raqamni to'liq kiriting");
      return;
    }

    setIsSubmitting(true);
    const result = await login('KFC Mehmoni', `+998 ${phone}`, adminCode.trim() || undefined);
    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  const handleTelegramSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (isSubmitting || !hasTelegramAuth) return;

    setIsSubmitting(true);
    setError('');

    const result = await loginWithTelegram(telegramInitData, adminCode.trim() || undefined);
    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  const isFormValid = phone.length === 9 && !isSubmitting;

  return (
    <div className="min-h-screen bg-white flex flex-col px-4 py-4 relative">
      <div className="flex justify-center mb-8 pt-8">
        <img
          src="https://upload.wikimedia.org/wikipedia/sco/thumb/b/bf/KFC_logo.svg/2048px-KFC_logo.svg.png"
          alt="KFC Logo"
          className="h-20 w-auto object-contain"
        />
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full -mt-20">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Tizimga kirish</h2>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <div className="flex gap-3 items-center bg-slate-50 rounded-xl px-4 py-4 border transition-colors focus-within:bg-white focus-within:border-[#E4002B] focus-within:ring-1 focus-within:ring-[#E4002B] border-transparent">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/8/84/Flag_of_Uzbekistan.svg"
                alt="UZ"
                className="w-6 h-4 object-cover rounded-sm shadow-sm"
              />
              <span className="font-bold text-slate-900 text-lg">+998</span>
            </div>

            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="00 000-00-00"
              className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-slate-900 placeholder:text-slate-400"
              autoFocus
            />
          </div>

          {showAdminCode && (
            <input
              type="password"
              value={adminCode}
              onChange={e => setAdminCode(e.target.value)}
              placeholder="Admin kod (ixtiyoriy)"
              className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-transparent focus:border-[#E4002B] focus:ring-1 focus:ring-[#E4002B] outline-none font-semibold"
            />
          )}

          <button
            type="button"
            onClick={() => setShowAdminCode(v => !v)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 text-left"
          >
            {showAdminCode ? 'Admin kodni yashirish' : 'Admin sifatida kirish'}
          </button>

          {error && <p className="text-red-500 text-xs mt-2 ml-1 font-medium">{error}</p>}
        </form>

        <div className="mt-8 space-y-3">
          {hasTelegramAuth && (
            <button
              onClick={handleTelegramSubmit}
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 uppercase tracking-wide ${
                isSubmitting ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#229ED9] text-white shadow-xl shadow-cyan-100'
              }`}
            >
              {isSubmitting ? 'Tekshirilmoqda...' : 'Telegram orqali kirish'}
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 uppercase tracking-wide ${
              isFormValid ? 'bg-[#E4002B] text-white shadow-xl shadow-red-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Kirilmoqda...' : 'Davom etish'}
          </button>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-400 mb-4 px-4 leading-tight">
        KFC ga kirish orqali siz <span className="text-slate-900 font-bold">Foydalanish shartlari</span>ga rozilik bildirasiz.
      </p>
    </div>
  );
};

export default LoginPage;

