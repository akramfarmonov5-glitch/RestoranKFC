import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH?.trim() ? path.resolve(process.env.DB_PATH) : path.join(__dirname, 'database.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    phone TEXT PRIMARY KEY,
    name TEXT,
    role TEXT DEFAULT 'user',
    currentAddress TEXT
  );

  CREATE TABLE IF NOT EXISTS menu (
    id TEXT PRIMARY KEY,
    name TEXT,
    price INTEGER,
    category TEXT,
    image TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customerPhone TEXT,
    customerLocation TEXT,
    items TEXT,
    total INTEGER,
    status TEXT,
    paymentMethod TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    content TEXT
  );

  CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    image TEXT,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT,
    icon TEXT
  );
`);

const defaultKnowledgeBase = `
KFC Ovozli Yordamchi uchun Bilimlar Bazasi
Ish vaqti: Har kuni 09:00 dan 23:00 gacha.
Buyurtma qabul qilish: 22:45 gacha.
Yetkazib berish xizmati: 09:30 dan 23:00 gacha.
Yetkazib berish narxi: 12 000 so'm.
Minimal buyurtma summasi: talab qilinmaydi.
O'rtacha yetkazib berish vaqti: 30-50 daqiqa.
To'lov usullari: karta, naqd, Click, Payme.
Wi-Fi paroli: kfc_guest_2024.
Halol sifati: asosiy tovuq mahsulotlari halol standartiga mos.
Buyurtma holatlari: new, cooking, delivering, completed, cancelled.
Buyurtmani bekor qilish: new holatida odatda bekor qilish mumkin.
Bilimlar bazasida ma'lumot topilmasa, taxminiy javob bermang.
`.trim();

const checkKnowledge = db.prepare('SELECT count(*) as count FROM knowledge').get() as { count: number };
if (checkKnowledge.count === 0) {
  db
    .prepare('INSERT INTO knowledge (id, content) VALUES (1, ?)')
    .run(defaultKnowledgeBase);
}

const checkMenu = db.prepare('SELECT count(*) as count FROM menu').get() as { count: number };
if (checkMenu.count === 0) {
  const defaultMenu = [
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
      name: "Fri Kartoshkasi (O'rta)",
      price: 16000,
      category: 'Sneklar',
      image: 'https://images.ctfassets.net/wtodlh47qqxe/3s4t5u6v7w8x9y0z/abcdef1234567890abcdef1234567890/Fries_Medium_772x574.png?w=600&h=446&q=90&fm=webp',
      description: 'Oltin rangli, qarsildoq va issiq kartoshka frisi.',
    },
  ];

  const insertMenu = db.prepare('INSERT INTO menu (id, name, price, category, image, description) VALUES (?, ?, ?, ?, ?, ?)');
  defaultMenu.forEach(item => insertMenu.run(item.id, item.name, item.price, item.category, item.image, item.description));
}

const checkPromotions = db.prepare('SELECT count(*) as count FROM promotions').get() as { count: number };
if (checkPromotions.count === 0) {
  const defaultPromos = [
    {
      id: 'p1',
      title: 'Hafta taklifi: 2x Basket',
      description: "Ikki barobar ko'proq lazzat, 30% chegirma bilan!",
      image: 'https://images.unsplash.com/photo-1513639776629-7b611594e29b?w=800&q=80&auto=format&fit=crop',
      color: 'bg-red-600',
    },
    {
      id: 'p2',
      title: 'Yangi Shefburger',
      description: 'Yumshoq va sersuv tovuq filesi.',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80&auto=format&fit=crop',
      color: 'bg-orange-500',
    },
    {
      id: 'p3',
      title: 'Tezkor yetkazish',
      description: 'Issiq holda 30 daqiqada yetkazamiz.',
      image: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=800&q=80&auto=format&fit=crop',
      color: 'bg-blue-600',
    },
  ];

  const insertPromo = db.prepare('INSERT INTO promotions (id, title, description, image, color) VALUES (?, ?, ?, ?, ?)');
  defaultPromos.forEach(p => insertPromo.run(p.id, p.title, p.description, p.image, p.color));
}

const checkCategories = db.prepare('SELECT count(*) as count FROM categories').get() as { count: number };
if (checkCategories.count === 0) {
  const defaultCats = [
    { id: 'c1', name: 'Basketlar', icon: '\uD83C\uDF57' },
    { id: 'c2', name: 'Burgerlar', icon: '\uD83C\uDF54' },
    { id: 'c3', name: 'Tvisterlar', icon: '\uD83C\uDF2F' },
    { id: 'c4', name: 'Sneklar', icon: '\uD83C\uDF5F' },
  ];

  const insertCat = db.prepare('INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)');
  defaultCats.forEach(c => insertCat.run(c.id, c.name, c.icon));
}

export default db;
