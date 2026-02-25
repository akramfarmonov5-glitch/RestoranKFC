
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { LiveServerMessage } from '@google/genai';
import { Mic, MicOff, Loader2, X, Minimize2 } from 'lucide-react';
import { createBlob, decode, decodeAudioData } from '../utils/audio';
import { ConnectionState, Message } from '../types';
import { SYSTEM_INSTRUCTION } from '../constants';
import Transcript from './Transcript';
import { useCart } from '../context/CartContext';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const LiveAgent: React.FC = () => {
  const { addToCart, removeFromCart, clearCart, getCartTotal, cartItems } = useCart();
  const { findProductByName, menuItems, knowledgeBase } = useAdmin();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  
  // Refs for Audio & Session
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentInputTranscription = useRef<string>('');
  const currentOutputTranscription = useRef<string>('');

  // Use Ref to hold latest state/functions to avoid stale closures in callbacks
  const stateRef = useRef({
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    getCartTotal,
    findProductByName,
    navigate
  });

  useEffect(() => {
    stateRef.current = {
      cartItems,
      addToCart,
      removeFromCart,
      clearCart,
      getCartTotal,
      findProductByName,
      navigate
    };
  }, [cartItems, addToCart, removeFromCart, clearCart, getCartTotal, findProductByName, navigate]);

  // Helper to safely extract string from potentially malformed AI args
  const safeString = (val: any): string => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object' && val !== null) {
      if ('value' in val) return String(val.value);
      if (Array.isArray(val) && val.length > 0) return String(val[0]);
      return "";
    }
    return "";
  };

  const tokenize = (value: string): string[] => {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9\u0400-\u04FF\u00C0-\u024F\s]/gi, ' ')
      .split(/\s+/)
      .map(part => part.trim())
      .filter(part => part.length > 1);
    return Array.from(new Set(normalized));
  };

  const queryKnowledgeBase = (query: string, knowledgeText: string): string => {
    const q = query.trim();
    const kb = knowledgeText.trim();
    if (!kb) return "Bilimlar bazasi bo'sh. Admin paneldan ma'lumot kiriting.";
    if (!q) return "Savol bo'sh. Qayta so'rab ko'ring.";

    const queryTokens = tokenize(q);
    const rows = kb
      .split(/\r?\n+/)
      .map(line => line.trim())
      .filter(line => line.length > 1 && !line.startsWith('---'));

    const scored = rows
      .map(line => {
        const lineLower = line.toLowerCase();
        let score = 0;

        if (q.length > 3 && lineLower.includes(q.toLowerCase())) score += 8;
        for (const token of queryTokens) {
          if (lineLower.includes(token)) score += 3;
          if (lineLower.startsWith(token)) score += 1;
        }

        return { line, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    if (scored.length === 0) {
      return "Bilimlar bazasida bu savol bo'yicha aniq ma'lumot topilmadi.";
    }

    return `Bilimlar bazasidan topildi:\n${scored.map(item => `- ${item.line}`).join('\n')}`;
  };

  // --- Tools Implementation ---
  const handleVoiceOrder = async (itemName: string, quantity: number): Promise<string> => {
    const { findProductByName, addToCart } = stateRef.current;
    
    // Clean string just in case AI adds quotes
    const cleanName = itemName.replace(/['"]/g, '').trim();
    if (!cleanName) return "Mahsulot nomini tushunmadim. Qaytarib yuboring?";
    
    const product = findProductByName(cleanName);
    
    if (product) {
      addToCart(product, quantity);
      return `Qo'shildi: ${quantity} ta ${product.name}. Yana biror nima xohlaysizmi?`;
    } 
    
    console.log("Product not found via voice:", cleanName);
    return `Kechirasiz, menyuda "${cleanName}" topilmadi. Balki boshqa nom bilan atalarsiz?`;
  };

  const handleVoiceRemove = async (itemName: string, quantity: number): Promise<string> => {
    const { cartItems, removeFromCart, findProductByName } = stateRef.current;

    if (!itemName) return "Mahsulot nomini tushunmadim.";
    
    const search = itemName.toLowerCase().trim();
    let targetItem = cartItems.find(item => item.name.toLowerCase().includes(search));
    
    if (!targetItem) {
        targetItem = cartItems.find(item => search.includes(item.name.toLowerCase()));
    }

    if (!targetItem) {
        const product = findProductByName(itemName);
        if (product) {
            targetItem = cartItems.find(i => i.id === product.id);
        }
    }

    if (!targetItem) return `Savatchada "${itemName}" topilmadi.`;
    
    removeFromCart(targetItem.id, quantity);
    return `${quantity} ta ${targetItem.name} savatchadan olib tashlandi.`;
  };

  const handleVoiceClearCart = async (): Promise<string> => {
    const { clearCart } = stateRef.current;
    clearCart();
    return "Savatcha tozalandi.";
  };

  const handleVoiceGetCart = async (): Promise<string> => {
    const { cartItems, getCartTotal } = stateRef.current;
    if (cartItems.length === 0) return "Savatcha bo'sh.";
    const total = getCartTotal();
    const itemsList = cartItems.map(i => `${i.quantity}x ${i.name}`).join(", ");
    return `Savatcha: ${itemsList}. Jami: ${total.toLocaleString()} so'm.`;
  };

  const handleVoiceConfirm = async (): Promise<string> => {
    const { cartItems, navigate } = stateRef.current;
    if (cartItems.length === 0) return "Savatcha bo'sh. Avval mahsulot tanlang.";
    navigate('/cart');
    return "To'lov sahifasiga o'tildi.";
  };

  const cleanupAudio = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (processorRef.current) processorRef.current.disconnect();
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
  }, []);

  const formatConnectionError = (raw: unknown): string => {
    const text = String(raw ?? '').trim();
    const lower = text.toLowerCase();

    if (!text) return "Ulanishda xatolik yuz berdi.";
    if (lower.includes('quota') || lower.includes('billing')) {
      return "Gemini limiti tugagan. Billingni tekshiring yoki yangi API kalit qo'ying.";
    }
    if (lower.includes('api key') || lower.includes('unauthorized') || lower.includes('permission')) {
      return "Gemini API kaliti yaroqsiz yoki ruxsat yo'q.";
    }
    if (lower.includes('notallowederror') || lower.includes('microphone') || lower.includes('permission denied')) {
      return "Mikrofon ruxsatini yoqing va qayta urinib ko'ring.";
    }
    if (lower.includes('juda ko')) {
      return "AI so'rovlari limiti oshib ketdi. 1 daqiqa kutib qayta urinib ko'ring.";
    }
    return `Ulanish xatosi: ${text}`;
  };

  const connectToGemini = async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      setAgentError(null);
      nextStartTimeRef.current = 0;
      setIsExpanded(true); 

      let knowledgeBaseSnapshot = knowledgeBase;
      try {
        const kbRes = await authFetch('/api/knowledge');
        if (kbRes.ok) {
          const kbPayload = await kbRes.json();
          if (typeof kbPayload?.content === 'string') {
            knowledgeBaseSnapshot = kbPayload.content;
          }
        }
      } catch (kbError) {
        console.error('Knowledge fetch failed before live session', kbError);
      }

      // Provide menu list directly in system instruction for better context
      const menuList = menuItems.map(item => 
        `"${item.name}" (${item.category})`
      ).join('\n');
      const promptKnowledge = knowledgeBaseSnapshot.trim()
        ? knowledgeBaseSnapshot.trim().slice(0, 12_000)
        : "Bilimlar bazasi hali to'ldirilmagan.";

      const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION}
      
      \n\n[BILIMLAR BAZASI (KNOWLEDGE BASE)]:
      ${promptKnowledge}

      \n\n[MAVJUD MENYU (AVAILABLE MENU)]:
      ${menuList}
      
      MUHIM: Agar mijoz umumiy nom aytsa (masalan 'Cola'), menyudan eng mosini tanlang (masalan 'Pepsi 0.5L') va o'sha aniq nomni 'addToOrder' ga yuboring.
      MUHIM 2: Agar savol restoran ma'lumotlari (ish vaqti, manzil mo'ljali, aloqa, to'lov, yetkazish, Wi-Fi, qoida) haqida bo'lsa, avval 'queryKnowledgeBase' funksiyasini chaqiring. Taxmin qilmang, faqat knowledge base ma'lumotiga tayaning.`;

      const liveTokenRes = await authFetch('/api/ai/live-token');
      if (!liveTokenRes.ok) {
        const errorPayload = await liveTokenRes.json().catch(() => ({}));
        throw new Error(errorPayload?.error ?? "Gemini token olib bo'lmadi.");
      }

      const liveTokenPayload = await liveTokenRes.json();
      const liveToken = typeof liveTokenPayload?.token === 'string' ? liveTokenPayload.token : null;
      const liveModel = typeof liveTokenPayload?.model === 'string' ? liveTokenPayload.model : 'gemini-2.5-flash-native-audio-preview-09-2025';
      if (!liveToken) throw new Error("Gemini token mavjud emas.");

      const genAi = await import('@google/genai');
      const { GoogleGenAI, Modality, Type } = genAi;

      const tools = [{
        functionDeclarations: [
          {
            name: 'addToOrder',
            description: "Add an item to the cart. IMPORTANT: Try to match the user's request to one of the exact names in the 'AVAILABLE MENU' list before calling this.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                itemName: { type: Type.STRING, description: "The closest matching product Name from the Menu List" },
                quantity: { type: Type.NUMBER, description: "Quantity" },
              },
              required: ['itemName'],
            },
          },
          {
            name: 'removeFromOrder',
            description: "Remove an item from the cart.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                itemName: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
              },
              required: ['itemName'],
            },
          },
          {
            name: 'clearOrder',
            description: "Remove all items from the cart.",
            parameters: { type: Type.OBJECT, properties: {} },
          },
          {
            name: 'getCartStatus',
            description: "Get current items and total price in cart.",
            parameters: { type: Type.OBJECT, properties: {} },
          },
          {
            name: 'confirmOrder',
            description: "Go to checkout/payment page.",
            parameters: { type: Type.OBJECT, properties: {} },
          },
          {
            name: 'queryKnowledgeBase',
            description: "Search the restaurant knowledge base for factual answers (hours, address, delivery, payment, contacts, policies, Wi-Fi). Always use this before answering informational questions.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING, description: "User question or keywords to search in knowledge base" },
              },
              required: ['query'],
            },
          },
        ]
      }];

      const ai = new GoogleGenAI({ apiKey: liveToken, httpOptions: { apiVersion: 'v1alpha' } });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const inputCtx = inputAudioContextRef.current;
      const outputCtx = outputAudioContextRef.current;
      
      if (!inputCtx || !outputCtx) throw new Error("Audio Context Init Failed");
      await inputCtx.resume();
      await outputCtx.resume();

      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: liveModel,
        callbacks: {
          onopen: () => {
            console.log("Live API Connection Opened");
            setConnectionState(ConnectionState.CONNECTED);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolumeLevel(Math.min(Math.sqrt(sum / inputData.length) * 5, 1));

              sessionPromise.then(session => session.sendRealtimeInput({ media: createBlob(inputData) }));
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             console.log("Live API Message:", message);
             if (message.serverContent?.outputTranscription) currentOutputTranscription.current += message.serverContent.outputTranscription.text;
             if (message.serverContent?.inputTranscription) currentInputTranscription.current += message.serverContent.inputTranscription.text;
             
             if (message.serverContent?.turnComplete) {
               const u = currentInputTranscription.current;
               const m = currentOutputTranscription.current;
               if (u.trim()) setMessages(p => [...p, { id: Date.now()+'-u', role: 'user', text: u, timestamp: new Date() }]);
               if (m.trim()) setMessages(p => [...p, { id: Date.now()+'-m', role: 'model', text: m, timestamp: new Date() }]);
               currentInputTranscription.current = '';
               currentOutputTranscription.current = '';
             }

             if (message.toolCall) {
               const functionResponses = [];
               for (const fc of message.toolCall.functionCalls) {
                 let result = "Xatolik";
                 const args = (fc.args as any) || {};
                 
                 try {
                   console.log(`Tool Call: ${fc.name}`, args); // Debug log
                   const nameArg = safeString(args.itemName).trim();
                   const qtyArg = Number(args.quantity);
                   const quantity = (Number.isFinite(qtyArg) && qtyArg > 0) ? qtyArg : 1;

                   if (fc.name === 'addToOrder') result = await handleVoiceOrder(nameArg, quantity);
                   else if (fc.name === 'removeFromOrder') result = await handleVoiceRemove(nameArg, quantity);
                   else if (fc.name === 'clearOrder') result = await handleVoiceClearCart();
                   else if (fc.name === 'getCartStatus') result = await handleVoiceGetCart();
                   else if (fc.name === 'confirmOrder') result = await handleVoiceConfirm();
                   else if (fc.name === 'queryKnowledgeBase') {
                     const queryArg = safeString(args.query).trim();
                     result = queryKnowledgeBase(queryArg, knowledgeBaseSnapshot);
                   }
                 } catch(e) { 
                    console.error("Tool execution error", e); 
                    result = "Texnik xatolik yuz berdi.";
                 }
                 functionResponses.push({ id: fc.id, name: fc.name, response: { result } });
               }
               sessionPromise.then(s => s.sendToolResponse({ functionResponses }));
             }

             const parts = message.serverContent?.modelTurn?.parts;
             if (parts) {
               for (const part of parts) {
                 const base64Audio = part.inlineData?.data;
                 if (base64Audio) {
                   const ctx = outputAudioContextRef.current;
                   if (ctx) {
                     try {
                       const buf = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                       nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                       const source = ctx.createBufferSource();
                       source.buffer = buf;
                       source.connect(outputNode);
                       source.addEventListener('ended', () => sourcesRef.current.delete(source));
                       source.start(nextStartTimeRef.current);
                       nextStartTimeRef.current += buf.duration;
                       sourcesRef.current.add(source);
                     } catch (err) {
                       console.error("Audio decode error", err);
                     }
                   }
                 } else if (part.text) {
                   console.log("Model Text Response:", part.text);
                 }
               }
             }
             
             if (message.serverContent?.interrupted) {
               sourcesRef.current.forEach(s => s.stop());
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
               currentOutputTranscription.current = '';
             }
          },
          onclose: (event) => {
            console.log("Live API Connection Closed", event);
            const reason = (event as any)?.reason ? String((event as any).reason) : '';
            if (reason) {
              setAgentError(formatConnectionError(reason));
              setConnectionState(ConnectionState.ERROR);
              return;
            }
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error("Live API Connection Error:", err);
            const errorText = (err as any)?.message ?? String(err);
            setAgentError(formatConnectionError(errorText));
            setConnectionState(ConnectionState.ERROR);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: dynamicSystemInstruction,
          tools: tools,
        },
      });
      sessionPromiseRef.current = sessionPromise;

      // --- TRIGGER GREETING ---
      const session = await sessionPromise;
      session.sendRealtimeInput({
        text: "Salom"
      });

    } catch (error) {
      const errorText = (error as any)?.message ?? String(error);
      setAgentError(formatConnectionError(errorText));
      setConnectionState(ConnectionState.ERROR);
    }
  };

  const disconnect = () => {
    cleanupAudio();
    setConnectionState(ConnectionState.DISCONNECTED);
    setAgentError(null);
    setVolumeLevel(0);
    setIsExpanded(false);
  };

  useEffect(() => () => cleanupAudio(), [cleanupAudio]);

  const isCartPage = location.pathname === '/cart';
  // Desktop adjustments: remove bottom offset since nav is top
  const bottomOffset = isCartPage ? 'bottom-28 md:bottom-8' : 'bottom-20 md:bottom-8';

  if (!isExpanded) {
    return (
      <button 
        onClick={connectToGemini}
        className={`fixed ${bottomOffset} right-4 z-[60] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-90 bg-[#E4002B] text-white hover:bg-red-700 hover:scale-105 border-2 border-white`}
      >
        {connectionState === ConnectionState.CONNECTING ? (
          <Loader2 className="animate-spin w-7 h-7" />
        ) : connectionState === ConnectionState.CONNECTED ? (
          <div className="relative">
             <Mic className="w-7 h-7 animate-pulse" />
             <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#E4002B]"></span>
          </div>
        ) : (
          <MicOff className="w-7 h-7" />
        )}
      </button>
    );
  }

  return (
    <div className={`fixed ${bottomOffset} right-4 z-[60] w-[90vw] max-w-sm flex flex-col items-end pointer-events-none`}>
       <div className="bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden w-full pointer-events-auto animate-in slide-in-from-bottom-5 duration-300 flex flex-col">
          <div className="p-4 bg-[#E4002B] text-white flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="relative">
                   <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                      {connectionState === ConnectionState.CONNECTING ? <Loader2 className="animate-spin w-5 h-5" /> : <Mic className="w-5 h-5" />}
                   </div>
                   {connectionState === ConnectionState.CONNECTED && (
                      <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-40" style={{ transform: `scale(${1 + volumeLevel})` }} />
                   )}
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">
                    {connectionState === ConnectionState.CONNECTED 
                      ? "Eshitmoqdaman..." 
                      : connectionState === ConnectionState.ERROR 
                        ? "Xatolik yuz berdi" 
                        : "Ulanmoqda..."}
                  </h3>
                  <p className="text-[10px] text-white/80 font-medium">
                    {connectionState === ConnectionState.ERROR 
                      ? "Qayta urinish uchun mikrofon tugmasini bosing" 
                      : "KFC Voice Assistant"}
                  </p>
                </div>
             </div>
             <div className="flex gap-1">
               <button onClick={() => setIsExpanded(false)} className="p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors">
                 <Minimize2 size={18} />
               </button>
               <button onClick={disconnect} className="p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors">
                 <X size={18} />
               </button>
             </div>
          </div>
          
          <div className="h-64 bg-slate-50 relative">
             <div className="absolute inset-0 overflow-y-auto">
                <Transcript messages={messages} isListening={connectionState === ConnectionState.CONNECTED} />
             </div>
          </div>

          {connectionState === ConnectionState.ERROR && agentError && (
            <div className="px-3 py-2 text-xs text-red-700 bg-red-50 border-t border-red-100">
              {agentError}
            </div>
          )}
          
          {connectionState === ConnectionState.CONNECTED && (
            <div className="h-1 bg-slate-100 w-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-75 ease-out" style={{ width: `${volumeLevel * 100}%` }}></div>
            </div>
          )}

          <div className="p-3 bg-white border-t border-slate-100 flex justify-center">
             <button 
                onClick={disconnect}
                className="text-xs font-bold text-red-500 uppercase tracking-wide px-4 py-2 hover:bg-red-50 rounded-lg transition-colors"
             >
               Suhbatni tugatish
             </button>
          </div>
       </div>
    </div>
  );
};

export default LiveAgent;
