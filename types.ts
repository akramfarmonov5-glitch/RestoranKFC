
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description?: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  image: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export type OrderStatus = 'new' | 'cooking' | 'delivering' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'click' | 'payme';

export interface Address {
  lat: number;
  lng: number;
  addressName: string; // e.g., "Nurafshon ko'chasi, 12"
  entrance?: string; // Podyezd
  floor?: string;    // Qavat
  apartment?: string; // Kvartira/Ofis
  comment?: string;
}

export type UserRole = 'user' | 'admin';

export interface User {
  name: string;
  phone: string;
  role: UserRole;
  currentAddress?: Address;
}

export interface Order {
  id: string;
  customer: {
    phone: string;
    location: Address;
  };
  items: CartItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  timestamp: Date;
}

// Minimal type definition for Telegram Web App
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          showProgress: (leaveActive: boolean) => void;
          hideProgress: () => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        initData?: string;
        initDataUnsafe?: any;
        openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
      };
    };
  }
}
