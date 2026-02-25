
import { Product } from './types';

export const PROMO_BANNERS = [
  {
    id: 'p1',
    title: 'Hafta taklifi: 2x Basket',
    description: 'Ikki barobar ko\'proq lazzat, 30% chegirma bilan!',
    image: 'https://images.unsplash.com/photo-1513639776629-7b611594e29b?w=800&q=80&auto=format&fit=crop',
    color: 'bg-red-600'
  },
  {
    id: 'p2',
    title: 'Yangi Shefburger',
    description: 'Yumshoq va sersuv tovuq filesi.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80&auto=format&fit=crop',
    color: 'bg-orange-500'
  },
  {
    id: 'p3',
    title: 'Tezkor yetkazish',
    description: 'Issiq holda 30 daqiqada yetkazamiz.',
    image: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=800&q=80&auto=format&fit=crop',
    color: 'bg-blue-600'
  }
];

export const MOCK_MENU: Product[] = [
  {
    id: '1',
    name: 'Basket S (18 qanot)',
    price: 75000,
    category: 'Basketlar',
    image: 'https://images.ctfassets.net/wtodlh47qqxe/5p6Hu2WlYtCyx9xZqT8C1/4a49c9584283c84666579893d7265d6c/Bucket_18_Wings_772x574.png?w=600&h=446&q=90&fm=webp',
    description: "18 dona achchiq va qarsildoq tovuq qanotchalaridan iborat afsonaviy basket.",
  },
  {
    id: '2',
    name: 'Shefburger',
    price: 32000,
    category: 'Burgerlar',
    image: 'https://images.ctfassets.net/wtodlh47qqxe/40yGg1Nl0aD1P8N80zKq0/25a953e5e49221147983652888636130/Chefburger_772x574.png?w=600&h=446&q=90&fm=webp',
    description: "Yumshoq bulochka, shirali tovuq filesi, pomidor, salat bargi va maxsus Sous.",
  },
  {
    id: '3',
    name: 'Tvister',
    price: 28000,
    category: 'Tvisterlar',
    image: 'https://images.ctfassets.net/wtodlh47qqxe/2w3x4z5y6A7B8C9D/68a735003c2336336465432654321098/Twister_Original_772x574.png?w=600&h=446&q=90&fm=webp',
    description: "Bug'doyli lavashga o'ralgan tovuq bo'laklari, sabzavotlar va mayonez.",
  },
  {
    id: '4',
    name: 'Boxmaster',
    price: 38000,
    category: 'Tvisterlar',
    image: 'https://images.ctfassets.net/wtodlh47qqxe/5A6B7C8D9E0F1G2H/1234567890abcdef1234567890abcdef/Boxmaster_Original_772x574.png?w=600&h=446&q=90&fm=webp',
    description: "Katta va to'yimli! Tovuq filesi, xashbraun, pishloq va sabzavotlar lavash ichida.",
  },
  {
    id: '5',
    name: 'Fri Kartoshkasi (O\'rta)',
    price: 16000,
    category: 'Sneklar',
    image: 'https://images.ctfassets.net/wtodlh47qqxe/3s4t5u6v7w8x9y0z/abcdef1234567890abcdef1234567890/Fries_Medium_772x574.png?w=600&h=446&q=90&fm=webp',
    description: "Oltin rangli, qarsildoq va issiq kartoshka frisi.",
  },
  {
    id: '6',
    name: '3 dona Strips',
    price: 22000,
    category: 'Tovuq',
    image: 'https://images.ctfassets.net/wtodlh47qqxe/1a2b3c4d5e6f7g8h/0987654321fedcba0987654321fedcba/Strips_3_772x574.png?w=600&h=446&q=90&fm=webp',
    description: "Yumshoq tovuq filesidan tayyorlangan 3 dona qarsildoq strips.",
  },
  {
    id: '7',
    name: 'Pepsi 0.5L',
    price: 10000,
    category: 'Ichimliklar',
    image: 'https://images.ctfassets.net/wtodlh47qqxe/5i6j7k8l9m0n1o2p/abcdef0987654321abcdef0987654321/Pepsi_05_772x574.png?w=600&h=446&q=90&fm=webp',
    description: "Muzdek tetiklashtiruvchi Pepsi ichimligi.",
  },
  {
    id: '8',
    name: 'Longer',
    price: 12000,
    category: 'Burgerlar',
    image: 'https://images.ctfassets.net/wtodlh47qqxe/4q5r6s7t8u9v0w1x/1234509876abcdef1234509876abcdef/Longer_772x574.png?w=600&h=446&q=90&fm=webp',
    description: "Hamyonbop va mazali. Bulochka, tovuq stripsi, bodring va barbekyu sousi.",
  },
  {
    id: '9',
    name: 'Basket L (26 qanot)',
    price: 105000,
    category: 'Basketlar',
    image: 'https://images.ctfassets.net/wtodlh47qqxe/6y7z8a9b0c1d2e3f/fedcba0987654321fedcba0987654321/Bucket_26_Wings_772x574.png?w=600&h=446&q=90&fm=webp',
    description: "Katta kompaniya uchun 26 dona achchiq qanotchalar.",
  },
  {
    id: '10',
    name: 'Qulupnayli Ponchik',
    price: 14000,
    category: 'Shirinlik',
    image: 'https://images.ctfassets.net/wtodlh47qqxe/2e3f4g5h6i7j8k9l/0987612345abcdef0987612345abcdef/Donut_Strawberry_772x574.png?w=600&h=446&q=90&fm=webp',
    description: "Qulupnayli glazur bilan qoplangan yumshoq ponchik.",
  },
];

export const SYSTEM_INSTRUCTION = `
Siz "KFC O'zbekiston" ovozli yordamchisisiz.
Siz O'zbek, Rus va Ingliz tillarida muloqot qila olasiz.

ASOSIY VAZIFA:
- Foydalanuvchiga buyurtma jarayonini tushuntirish.
- Menyudagi mahsulotlar bo'yicha tavsiya berish.
- Restoran haqida faktik ma'lumotni bilimlar bazasidan aytish.

MUHIM CHEKLOV:
- Ovozli chat orqali savatga mahsulot qo'shmang.
- Ovozli chat orqali savatdan mahsulot o'chirmang.
- Ovozli chat orqali buyurtma yakunlandi deb aytmang.
- "Savatga qo'shildi" yoki "buyurtma qabul qilindi" iboralarini ishlatmang.

BUYURTMA BERISHNI TUSHUNTIRISH SHAKLI:
1) "Menu" sahifasiga o'ting.
2) Mahsulot kartasidagi "+" tugmasini bosing.
3) "Savat" sahifasiga o'ting.
4) Manzil va to'lov turini tanlang.
5) "Buyurtma berish" tugmasini bosing.

USLUB:
- Qisqa, aniq va xushmuomala gapiring.
- Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob bering.
`;

