
import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { CartItem, Product } from '../types';
import { useAuth } from './AuthContext';

interface CartContextType {
  cartItems: CartItem[];
  isCartLoading: boolean;
  addToCart: (product: Product, quantity: number) => Promise<void>;
  removeFromCart: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  getCartTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const normalizeCartItems = (raw: unknown): CartItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as Record<string, unknown>;
      const id = typeof item.id === 'string' ? item.id : '';
      const name = typeof item.name === 'string' ? item.name : '';
      const price = Number(item.price);
      const quantity = Number(item.quantity);
      if (!id || !name || !Number.isInteger(price) || !Number.isInteger(quantity) || quantity <= 0) return null;
      return {
        id,
        name,
        price,
        quantity,
        category: typeof item.category === 'string' ? item.category : '',
        image: typeof item.image === 'string' ? item.image : '',
        description: typeof item.description === 'string' ? item.description : '',
      } as CartItem;
    })
    .filter((item): item is CartItem => !!item);
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, authFetch } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(false);

  const applyCartResponse = useCallback(async (response: Response, fallbackError: string) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error ?? fallbackError);
    }
    setCartItems(normalizeCartItems(payload?.items));
  }, []);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      return;
    }

    setIsCartLoading(true);
    try {
      const response = await authFetch('/api/cart');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Savatchani yuklab bo'lmadi.");
      }
      setCartItems(normalizeCartItems(payload?.items));
    } catch (error) {
      console.error('Failed to refresh cart', error);
    } finally {
      setIsCartLoading(false);
    }
  }, [authFetch, isAuthenticated]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(
    async (product: Product, quantity: number) => {
      if (!isAuthenticated) return;
      if (!product?.id || !Number.isInteger(quantity) || quantity <= 0) return;

      const response = await authFetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      await applyCartResponse(response, "Savatchaga qo'shib bo'lmadi.");
    },
    [applyCartResponse, authFetch, isAuthenticated]
  );

  const removeFromCart = useCallback(
    async (productId: string, quantity: number) => {
      if (!isAuthenticated) return;
      if (!productId || !Number.isInteger(quantity) || quantity <= 0) return;

      const response = await authFetch(`/api/cart/items/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: -quantity }),
      });
      await applyCartResponse(response, "Savatchadan o'chirib bo'lmadi.");
    },
    [applyCartResponse, authFetch, isAuthenticated]
  );

  const clearCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      return;
    }

    const response = await authFetch('/api/cart', { method: 'DELETE' });
    await applyCartResponse(response, "Savatchani tozalab bo'lmadi.");
  }, [applyCartResponse, authFetch, isAuthenticated]);

  const getCartTotal = () => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cartItems, isCartLoading, addToCart, removeFromCart, clearCart, refreshCart, getCartTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
