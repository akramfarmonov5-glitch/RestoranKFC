import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Order, Product, OrderStatus, Promotion, Category } from '../types';
import { useAuth } from './AuthContext';
import { apiUrl, withApiHeaders } from '../utils/api';

interface AdminContextType {
  menuItems: Product[];
  orders: Order[];
  knowledgeBase: string;
  promotions: Promotion[];
  categories: Category[];
  addOrder: (order: Order) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  addMenuItem: (item: Product) => Promise<void>;
  updateMenuItem: (item: Product) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  findProductByName: (name: string) => Product | undefined;
  updateKnowledgeBase: (text: string) => Promise<void>;
  addPromotion: (promo: Promotion) => Promise<void>;
  updatePromotion: (promo: Promotion) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  addCategory: (cat: Category) => Promise<void>;
  updateCategory: (cat: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const toOrders = (payload: any[]): Order[] =>
  payload.map((o: any) => ({
    ...o,
    timestamp: new Date(o.timestamp),
  }));

const ensureOk = async (res: Response, fallbackMessage: string): Promise<void> => {
  if (res.ok) return;
  const data = await res.json().catch(() => ({}));
  throw new Error(data?.error ?? fallbackMessage);
};

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, authFetch } = useAuth();
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<string>('');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [menuRes, promoRes, catRes] = await Promise.all([
        fetch(apiUrl('/api/menu'), { headers: withApiHeaders() }),
        fetch(apiUrl('/api/promotions'), { headers: withApiHeaders() }),
        fetch(apiUrl('/api/categories'), { headers: withApiHeaders() }),
      ]);

      if (menuRes.ok) setMenuItems(await menuRes.json());
      if (promoRes.ok) setPromotions(await promoRes.json());
      if (catRes.ok) setCategories(await catRes.json());

      if (!isAuthenticated) {
        setOrders([]);
        setKnowledgeBase('');
        return;
      }

      const ordersEndpoint = isAdmin ? '/api/orders' : '/api/orders/my';
      const ordersRes = await authFetch(ordersEndpoint);
      if (ordersRes.ok) {
        const fetchedOrders = await ordersRes.json();
        setOrders(toOrders(fetchedOrders));
      }

      const kbRes = await authFetch('/api/knowledge');
      if (kbRes.ok) {
        const kbData = await kbRes.json();
        setKnowledgeBase(kbData.content ?? '');
      }
    } catch (error) {
      console.error('Failed to fetch app data', error);
    }
  }, [authFetch, isAdmin, isAuthenticated]);

  useEffect(() => {
    fetchData();
    const intervalMs = isAdmin ? 10_000 : 30_000;
    const interval = setInterval(fetchData, intervalMs);
    return () => clearInterval(interval);
  }, [fetchData, isAdmin]);

  const addOrder = useCallback(
    async (order: Order): Promise<Order> => {
      const res = await authFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      await ensureOk(res, 'Buyurtmani saqlab bo‘lmadi.');

      const payload = await res.json().catch(() => null);
      const created = payload?.order ? toOrders([payload.order])[0] : order;
      setOrders(prev => [created, ...prev]);
      return created;
    },
    [authFetch]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      if (!isAdmin) throw new Error('Faqat admin order statusni o‘zgartira oladi.');

      const res = await authFetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await ensureOk(res, 'Buyurtma statusini yangilab bo‘lmadi.');

      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status } : o)));
    },
    [authFetch, isAdmin]
  );

  const addMenuItem = useCallback(
    async (item: Product) => {
      if (!isAdmin) throw new Error('Faqat admin menyuni o‘zgartira oladi.');
      const res = await authFetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      await ensureOk(res, "Menyu elementi qo'shilmadi.");
      setMenuItems(prev => [...prev, item]);
    },
    [authFetch, isAdmin]
  );

  const updateMenuItem = useCallback(
    async (item: Product) => {
      if (!isAdmin) throw new Error('Faqat admin menyuni o‘zgartira oladi.');
      const res = await authFetch(`/api/menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      await ensureOk(res, "Menyu elementi yangilanmadi.");
      setMenuItems(prev => prev.map(i => (i.id === item.id ? item : i)));
    },
    [authFetch, isAdmin]
  );

  const deleteMenuItem = useCallback(
    async (id: string) => {
      if (!isAdmin) throw new Error('Faqat admin menyuni o‘zgartira oladi.');
      const res = await authFetch(`/api/menu/${id}`, { method: 'DELETE' });
      await ensureOk(res, "Menyu elementi o'chirilmadi.");
      setMenuItems(prev => prev.filter(i => i.id !== id));
    },
    [authFetch, isAdmin]
  );

  const updateKnowledgeBase = useCallback(
    async (text: string) => {
      if (!isAdmin) throw new Error('Faqat admin knowledge bazani o‘zgartira oladi.');
      const res = await authFetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      await ensureOk(res, 'Knowledge bazani saqlab bo‘lmadi.');
      setKnowledgeBase(text);
    },
    [authFetch, isAdmin]
  );

  const addPromotion = useCallback(
    async (promo: Promotion) => {
      if (!isAdmin) throw new Error('Faqat admin aksiyalarni o‘zgartira oladi.');
      const res = await authFetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promo),
      });
      await ensureOk(res, "Aksiya qo'shilmadi.");
      setPromotions(prev => [...prev, promo]);
    },
    [authFetch, isAdmin]
  );

  const updatePromotion = useCallback(
    async (promo: Promotion) => {
      if (!isAdmin) throw new Error('Faqat admin aksiyalarni o‘zgartira oladi.');
      const res = await authFetch(`/api/promotions/${promo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promo),
      });
      await ensureOk(res, "Aksiya yangilanmadi.");
      setPromotions(prev => prev.map(p => (p.id === promo.id ? promo : p)));
    },
    [authFetch, isAdmin]
  );

  const deletePromotion = useCallback(
    async (id: string) => {
      if (!isAdmin) throw new Error('Faqat admin aksiyalarni o‘zgartira oladi.');
      const res = await authFetch(`/api/promotions/${id}`, { method: 'DELETE' });
      await ensureOk(res, "Aksiya o'chirilmadi.");
      setPromotions(prev => prev.filter(p => p.id !== id));
    },
    [authFetch, isAdmin]
  );

  const addCategory = useCallback(
    async (cat: Category) => {
      if (!isAdmin) throw new Error('Faqat admin kategoriyalarni o‘zgartira oladi.');
      const res = await authFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat),
      });
      await ensureOk(res, "Kategoriya qo'shilmadi.");
      setCategories(prev => [...prev, cat]);
    },
    [authFetch, isAdmin]
  );

  const updateCategory = useCallback(
    async (cat: Category) => {
      if (!isAdmin) throw new Error('Faqat admin kategoriyalarni o‘zgartira oladi.');
      const res = await authFetch(`/api/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat),
      });
      await ensureOk(res, 'Kategoriya yangilanmadi.');
      setCategories(prev => prev.map(c => (c.id === cat.id ? cat : c)));
    },
    [authFetch, isAdmin]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!isAdmin) throw new Error('Faqat admin kategoriyalarni o‘zgartira oladi.');
      const res = await authFetch(`/api/categories/${id}`, { method: 'DELETE' });
      await ensureOk(res, "Kategoriya o'chirilmadi.");
      setCategories(prev => prev.filter(c => c.id !== id));
    },
    [authFetch, isAdmin]
  );

  const findProductByName = (name: string): Product | undefined => {
    if (!name || typeof name !== 'string') return undefined;

    const clean = (str: string) => str.replace(/[^a-z0-9\u0400-\u04FF\s]/gi, '').toLowerCase().trim();
    let cleanSearch = clean(name);

    const synonyms: Record<string, string> = {
      cola: 'pepsi',
      koka: 'pepsi',
      coke: 'pepsi',
      fanta: 'pepsi',
      sprite: 'pepsi',
      suv: 'pepsi',
      ichimlik: 'pepsi',
      fries: 'fri',
      kartoshka: 'fri',
      free: 'fri',
      tovuq: 'basket',
      chicken: 'basket',
      kanat: 'basket',
      qanot: 'basket',
      krilishki: 'basket',
      krilishka: 'basket',
      strips: 'strips',
      stripes: 'strips',
      burger: 'shefburger',
      cheeseburger: 'shefburger',
      lavash: 'tvister',
      roll: 'tvister',
      shirinlik: 'ponchik',
      desert: 'ponchik',
      donut: 'ponchik',
      longer: 'longer',
      boxmaster: 'boxmaster',
      boks: 'boxmaster',
    };

    Object.keys(synonyms).forEach(key => {
      if (cleanSearch.includes(key)) cleanSearch = cleanSearch.replace(key, synonyms[key]);
    });

    let bestMatch: Product | undefined;
    let maxScore = 0;
    const searchTokens = cleanSearch.split(/\s+/).filter(t => t.length > 2);

    menuItems.forEach(item => {
      const pName = clean(item.name);
      const pCategory = clean(item.category);
      let score = 0;

      if (pName === cleanSearch) score += 100;
      if (pName.startsWith(cleanSearch)) score += 50;
      if (pName.includes(cleanSearch)) score += 30;

      searchTokens.forEach(token => {
        if (pName.includes(token)) score += 10;
        if (pCategory.includes(token)) score += 5;
      });

      if (score > maxScore) {
        maxScore = score;
        bestMatch = item;
      }
    });

    return maxScore > 0 ? bestMatch : undefined;
  };

  return (
    <AdminContext.Provider
      value={{
        menuItems,
        orders,
        knowledgeBase,
        promotions,
        categories,
        addOrder,
        updateOrderStatus,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        findProductByName,
        updateKnowledgeBase,
        addPromotion,
        updatePromotion,
        deletePromotion,
        addCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within an AdminProvider');
  return context;
};
