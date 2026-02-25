import "./serverEnv";

import crypto from "crypto";
import path from "path";
import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import db from "./db";

type UserRole = "user" | "admin";
type OrderStatus = "new" | "cooking" | "delivering" | "completed" | "cancelled";
type PaymentMethod = "cash" | "card" | "click" | "payme";
type RateLimitBucket = { count: number; resetAt: number };
type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message: string;
  keyBy?: (req: express.Request) => string;
};

type SessionPayload = {
  phone: string;
  role: UserRole;
  exp: number;
};

type Address = {
  lat: number;
  lng: number;
  addressName: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
  comment?: string;
};

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  image?: string;
  description?: string;
};

type AuthenticatedRequest = express.Request & { auth?: SessionPayload };
type TelegramChatId = number | string;

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

type TelegramMessage = {
  message_id: number;
  date: number;
  text?: string;
  from?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: TelegramChatId;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  web_app_data?: {
    button_text?: string;
    data?: string;
  };
};

type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_PORT = 3000;
const SESSION_SECRET = process.env.SESSION_SECRET ?? "change-this-session-secret";
const ADMIN_CODE = cleanString(process.env.ADMIN_CODE, 64);
const ADMIN_PHONE = normalizePhone(process.env.ADMIN_PHONE);
const GEMINI_API_KEY = cleanString(process.env.GEMINI_API_KEY, 256);
const GEMINI_LIVE_MODEL = cleanString(process.env.GEMINI_LIVE_MODEL, 120) ?? "gemini-2.5-flash-native-audio-preview-09-2025";
const RATE_LIMIT_STORE = new Map<string, RateLimitBucket>();
const TELEGRAM_BOT_TOKEN = cleanString(process.env.TELEGRAM_BOT_TOKEN, 300);
const TELEGRAM_WEBHOOK_URL = cleanString(process.env.TELEGRAM_WEBHOOK_URL, 700);
const TELEGRAM_WEBHOOK_SECRET = cleanString(process.env.TELEGRAM_WEBHOOK_SECRET, 120);
const TELEGRAM_MINI_APP_URL = cleanString(process.env.TELEGRAM_MINI_APP_URL, 700) ?? inferMiniAppUrl(TELEGRAM_WEBHOOK_URL);
const TELEGRAM_ADMIN_CHAT_ID = cleanString(process.env.TELEGRAM_ADMIN_CHAT_ID, 80);
const TELEGRAM_INIT_DATA_MAX_AGE_SECONDS = Math.max(60, Number(process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS ?? 86_400));
const TELEGRAM_BOT_WELCOME =
  "Assalomu alaykum! KFC Ovozli Buyurtma botiga xush kelibsiz.\nPastdagi tugma orqali Mini App'ni ochib buyurtma bering.";

if (!process.env.SESSION_SECRET) {
  console.warn("[security] SESSION_SECRET is not set. Set SESSION_SECRET in .env.local for secure sessions.");
}

const liveAiClient = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: { apiVersion: "v1alpha" },
    })
  : null;

function cleanString(value: unknown, maxLen = 120): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.length > maxLen ? normalized.slice(0, maxLen) : normalized;
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 9) return `+998 ${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) return `+998 ${digits.slice(3)}`;
  return null;
}

function normalizeName(value: unknown): string {
  const parsed = cleanString(value, 60);
  return parsed ?? "Foydalanuvchi";
}

function normalizeTelegramDisplayName(user: TelegramWebAppUser): string {
  const firstName = cleanString(user.first_name, 60);
  const lastName = cleanString(user.last_name, 60);
  const username = cleanString(user.username, 60);

  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (username) return `@${username}`;
  return `Telegram ${user.id}`;
}

function normalizeTelegramIdentityPhone(userId: number): string {
  return `tg:${userId}`;
}

function inferMiniAppUrl(rawWebhookUrl: string | null): string | null {
  if (!rawWebhookUrl) return null;
  try {
    const parsed = new URL(rawWebhookUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callTelegramApi(method: string, payload?: Record<string, unknown>) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN o'rnatilmagan.");
  }

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : "{}",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok) {
    throw new Error(data?.description ?? `Telegram API xatoligi: ${method}`);
  }

  return data.result;
}

async function sendTelegramMessage(chatId: TelegramChatId, text: string, extra?: Record<string, unknown>) {
  return callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    ...extra,
  });
}

function getMiniAppKeyboard() {
  if (!TELEGRAM_MINI_APP_URL) return null;
  return {
    inline_keyboard: [[{ text: "Mini App ochish", web_app: { url: TELEGRAM_MINI_APP_URL } }]],
  };
}

function parseTelegramWebAppData(raw: string | undefined) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      order_id?: string;
      total?: number;
      payment?: string;
      customer?: { phone?: string; location?: { addressName?: string } };
      items?: Array<{ name?: string; qty?: number; price?: number }>;
    };
  } catch {
    return null;
  }
}

function verifyTelegramInitData(rawInitData: string | null): { user: TelegramWebAppUser; authDate: number } | null {
  if (!TELEGRAM_BOT_TOKEN || !rawInitData) return null;

  const params = new URLSearchParams(rawInitData);
  const hash = params.get("hash");
  if (!hash) return null;

  const dataPairs: Array<[string, string]> = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    dataPairs.push([key, value]);
  }

  if (dataPairs.length === 0) return null;

  dataPairs.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = dataPairs.map(([key, value]) => `${key}=${value}`).join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(TELEGRAM_BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const actualHashBuffer = Buffer.from(hash, "hex");
  const expectedHashBuffer = Buffer.from(calculatedHash, "hex");
  if (!actualHashBuffer.length || actualHashBuffer.length !== expectedHashBuffer.length) return null;
  if (!crypto.timingSafeEqual(actualHashBuffer, expectedHashBuffer)) return null;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || authDate <= 0) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - authDate > TELEGRAM_INIT_DATA_MAX_AGE_SECONDS) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;

  try {
    const user = JSON.parse(userRaw) as TelegramWebAppUser;
    if (!user || !Number.isInteger(user.id) || user.id <= 0) return null;
    return { user, authDate };
  } catch {
    return null;
  }
}

function buildOrderNotificationText(order: {
  id?: string;
  total?: number;
  paymentMethod?: string;
  customerPhone?: string;
  addressName?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
}) {
  const lines = ["Yangi buyurtma!", `ID: ${order.id ?? "-"}`, `Telefon: ${order.customerPhone ?? "-"}`];

  if (typeof order.total === "number") {
    lines.push(`Jami: ${order.total.toLocaleString("ru-RU")} so'm`);
  }
  if (order.paymentMethod) {
    lines.push(`To'lov: ${order.paymentMethod}`);
  }
  if (order.addressName) {
    lines.push(`Manzil: ${order.addressName}`);
  }
  if (order.items?.length) {
    lines.push("Mahsulotlar:");
    for (const item of order.items.slice(0, 12)) {
      lines.push(`- ${item.quantity}x ${item.name} (${item.price.toLocaleString("ru-RU")} so'm)`);
    }
  }

  return lines.join("\n");
}

async function notifyTelegramAdminOrder(order: {
  id: string;
  total: number;
  paymentMethod: string;
  customerPhone: string;
  addressName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;
  try {
    const message = buildOrderNotificationText(order);
    await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, message);
  } catch (error) {
    console.error("[telegram] Buyurtma xabari yuborilmadi:", error);
  }
}

async function handleTelegramMessage(message: TelegramMessage) {
  const text = message.text?.trim().toLowerCase();
  const keyboard = getMiniAppKeyboard();

  if (message.web_app_data?.data) {
    const webAppPayload = parseTelegramWebAppData(message.web_app_data.data);
    const orderId = webAppPayload?.order_id ?? "-";
    await sendTelegramMessage(message.chat.id, `Buyurtma ma'lumoti qabul qilindi. ID: ${orderId}`);

    if (TELEGRAM_ADMIN_CHAT_ID && TELEGRAM_ADMIN_CHAT_ID !== String(message.chat.id)) {
      await sendTelegramMessage(
        TELEGRAM_ADMIN_CHAT_ID,
        buildOrderNotificationText({
          id: webAppPayload?.order_id,
          total: typeof webAppPayload?.total === "number" ? webAppPayload.total : undefined,
          paymentMethod: webAppPayload?.payment,
          customerPhone: webAppPayload?.customer?.phone,
          addressName: webAppPayload?.customer?.location?.addressName,
          items: (webAppPayload?.items ?? [])
            .filter((i): i is { name: string; qty: number; price: number } => !!i?.name && Number.isFinite(i?.qty) && Number.isFinite(i?.price))
            .map((i) => ({ name: i.name, quantity: i.qty, price: i.price })),
        })
      );
    }
    return;
  }

  if (text === "/start" || text === "/app" || text === "/menu") {
    await sendTelegramMessage(message.chat.id, TELEGRAM_BOT_WELCOME, keyboard ? { reply_markup: keyboard } : undefined);
    return;
  }

  await sendTelegramMessage(
    message.chat.id,
    "Mini App orqali buyurtma berish uchun quyidagi tugmani bosing.",
    keyboard ? { reply_markup: keyboard } : undefined
  );
}

async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.message) {
    await handleTelegramMessage(update.message);
  }
}

async function startTelegramWebhook() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_WEBHOOK_URL) return;
  try {
    await callTelegramApi("setWebhook", {
      url: TELEGRAM_WEBHOOK_URL,
      secret_token: TELEGRAM_WEBHOOK_SECRET ?? undefined,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    });
    console.log("[telegram] Webhook o'rnatildi.");
  } catch (error) {
    console.error("[telegram] Webhook o'rnatilmadi:", error);
  }
}

let telegramPollingStarted = false;
async function startTelegramPolling() {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_WEBHOOK_URL || telegramPollingStarted) return;
  telegramPollingStarted = true;

  let offset = 0;

  try {
    await callTelegramApi("deleteWebhook", { drop_pending_updates: false });
  } catch (error) {
    console.error("[telegram] deleteWebhook xatoligi:", error);
  }

  console.log("[telegram] Polling rejimi ishga tushdi.");
  while (telegramPollingStarted) {
    try {
      const updates = (await callTelegramApi("getUpdates", {
        timeout: 25,
        offset,
        allowed_updates: ["message"],
      })) as TelegramUpdate[];

      for (const update of updates) {
        offset = Math.max(offset, update.update_id + 1);
        try {
          await handleTelegramUpdate(update);
        } catch (error) {
          console.error("[telegram] Update qayta ishlashda xatolik:", error);
        }
      }
    } catch (error) {
      console.error("[telegram] Polling xatoligi:", error);
      await sleep(2000);
    }
  }
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(encodedPayload).digest("base64url");
}

function createSessionToken(phone: string, role: UserRole): string {
  const payload: SessionPayload = {
    phone,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload;
    if (!payload?.phone || !payload?.exp || !payload?.role) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.role !== "user" && payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

function parseAuthToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

function requireAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction): void {
  const token = parseAuthToken(req);
  if (!token) {
    res.status(401).json({ error: "Avtorizatsiya talab qilinadi." });
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: "Sessiya yaroqsiz yoki muddati tugagan." });
    return;
  }

  req.auth = payload;
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction): void {
  if (!req.auth || req.auth.role !== "admin") {
    res.status(403).json({ error: "Admin ruxsati talab qilinadi." });
    return;
  }
  next();
}

function createRateLimiter(options: RateLimitOptions): express.RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    if (RATE_LIMIT_STORE.size > 5000) {
      for (const [key, value] of RATE_LIMIT_STORE) {
        if (value.resetAt <= now) RATE_LIMIT_STORE.delete(key);
      }
    }

    let dynamicKey = req.ip ?? "unknown";
    if (options.keyBy) {
      try {
        dynamicKey = options.keyBy(req);
      } catch {
        dynamicKey = req.ip ?? "unknown";
      }
    }

    const key = `${options.keyPrefix}:${dynamicKey}`;
    const existing = RATE_LIMIT_STORE.get(key);

    if (!existing || existing.resetAt <= now) {
      RATE_LIMIT_STORE.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > options.max) {
      const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: options.message });
      return;
    }

    next();
  };
}

function parseAddress(raw: unknown): Address | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const addressName = cleanString(body.addressName, 220);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !addressName) return null;

  const entrance = cleanString(body.entrance, 30);
  const floor = cleanString(body.floor, 30);
  const apartment = cleanString(body.apartment, 30);
  const comment = cleanString(body.comment, 400);

  return {
    lat,
    lng,
    addressName,
    ...(entrance ? { entrance } : {}),
    ...(floor ? { floor } : {}),
    ...(apartment ? { apartment } : {}),
    ...(comment ? { comment } : {}),
  };
}

function parsePrice(raw: unknown): number | null {
  const price = Number(raw);
  if (!Number.isInteger(price) || price < 0 || price > 1_000_000_000) return null;
  return price;
}

function parseProductPayload(raw: unknown, fallbackId?: string): {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;

  const id = cleanString(body.id, 64) ?? fallbackId ?? crypto.randomUUID();
  const name = cleanString(body.name, 120);
  const category = cleanString(body.category, 60);
  const image = cleanString(body.image, 800);
  const description = cleanString(body.description, 800) ?? "";
  const price = parsePrice(body.price);

  if (!name || !category || !image || price === null) return null;

  return { id, name, price, category, image, description };
}

function parsePromotionPayload(raw: unknown, fallbackId?: string): {
  id: string;
  title: string;
  description: string;
  image: string;
  color: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;

  const id = cleanString(body.id, 64) ?? fallbackId ?? crypto.randomUUID();
  const title = cleanString(body.title, 120);
  const description = cleanString(body.description, 500);
  const image = cleanString(body.image, 800);
  const color = cleanString(body.color, 40);

  if (!title || !description || !image || !color) return null;
  return { id, title, description, image, color };
}

function parseCategoryPayload(raw: unknown, fallbackId?: string): {
  id: string;
  name: string;
  icon: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;

  const id = cleanString(body.id, 64) ?? fallbackId ?? crypto.randomUUID();
  const name = cleanString(body.name, 60);
  const icon = cleanString(body.icon, 16);

  if (!name || !icon) return null;
  return { id, name, icon };
}

function parseOrderItems(raw: unknown): OrderItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const parsed: OrderItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Record<string, unknown>;
    const id = cleanString(item.id, 64);
    const name = cleanString(item.name, 120);
    const price = parsePrice(item.price);
    const quantity = Number(item.quantity);

    if (!id || !name || price === null || !Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
      return null;
    }

    parsed.push({
      id,
      name,
      price,
      quantity,
      ...(cleanString(item.category, 60) ? { category: cleanString(item.category, 60)! } : {}),
      ...(cleanString(item.image, 800) ? { image: cleanString(item.image, 800)! } : {}),
      ...(cleanString(item.description, 800) ? { description: cleanString(item.description, 800)! } : {}),
    });
  }

  return parsed;
}

function parsePaymentMethod(raw: unknown): PaymentMethod | null {
  const value = cleanString(raw, 20);
  if (!value) return null;
  if (value === "cash" || value === "card" || value === "click" || value === "payme") return value;
  return null;
}

function parseOrderStatus(raw: unknown): OrderStatus | null {
  const value = cleanString(raw, 20);
  if (!value) return null;
  if (value === "new" || value === "cooking" || value === "delivering" || value === "completed" || value === "cancelled") return value;
  return null;
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatOrderRow(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ""),
    customer: {
      phone: String(row.customerPhone ?? ""),
      location: safeJsonParse(row.customerLocation, null),
    },
    items: safeJsonParse<OrderItem[]>(row.items, []),
    total: Number(row.total ?? 0),
    status: String(row.status ?? "new"),
    paymentMethod: String(row.paymentMethod ?? "card"),
    timestamp: row.timestamp,
  };
}

function resolveUserRole(existingRole: unknown, phone: string, providedAdminCode: string | null): UserRole {
  let role: UserRole = existingRole === "admin" ? "admin" : "user";
  if (ADMIN_PHONE && phone === ADMIN_PHONE) role = "admin";
  if (ADMIN_CODE && providedAdminCode && providedAdminCode === ADMIN_CODE) role = "admin";
  return role;
}

function buildAuthenticatedSession(phone: string, name: string, providedAdminCode: string | null) {
  const dbUser = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as any;
  const role = resolveUserRole(dbUser?.role, phone, providedAdminCode);

  if (!dbUser) {
    db.prepare("INSERT INTO users (phone, name, role) VALUES (?, ?, ?)").run(phone, name, role);
  } else if (dbUser.name !== name || dbUser.role !== role) {
    db.prepare("UPDATE users SET name = ?, role = ? WHERE phone = ?").run(name, role, phone);
  }

  const refreshedUser = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as any;
  const currentAddress = safeJsonParse<Address | null>(refreshedUser?.currentAddress, null);

  const user = {
    phone,
    name: refreshedUser?.name ?? name,
    role: (refreshedUser?.role === "admin" ? "admin" : "user") as UserRole,
    currentAddress,
  };

  return {
    user,
    token: createSessionToken(user.phone, user.role),
  };
}

async function startServer() {
  const app = express();
  const parsedPort = Number(process.env.PORT);
  const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_PORT;

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  const loginRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 15,
    keyPrefix: "login",
    message: "Juda ko'p kirish urinishlari. 15 daqiqadan keyin qayta urinib ko'ring.",
    keyBy: (req) => {
      const phone = normalizePhone(req.body?.phone);
      const ip = req.ip ?? "unknown";
      return phone ? `${phone}:${ip}` : ip;
    },
  });

  const liveTokenRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    keyPrefix: "live-token",
    message: "AI token so'rovlari juda ko'p. 1 daqiqadan keyin qayta urinib ko'ring.",
    keyBy: (req) => {
      const authReq = req as AuthenticatedRequest;
      return authReq.auth?.phone ?? req.ip ?? "unknown";
    },
  });

  app.post("/api/telegram/webhook", async (req, res) => {
    if (!TELEGRAM_BOT_TOKEN) {
      res.status(503).json({ error: "Telegram bot o'rnatilmagan (TELEGRAM_BOT_TOKEN)." });
      return;
    }

    if (TELEGRAM_WEBHOOK_SECRET) {
      const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
      const secret = Array.isArray(secretHeader) ? secretHeader[0] : secretHeader;
      if (!secret || secret !== TELEGRAM_WEBHOOK_SECRET) {
        res.status(401).json({ error: "Webhook secret noto'g'ri." });
        return;
      }
    }

    const update = req.body as TelegramUpdate;
    if (typeof update?.update_id !== "number") {
      res.json({ ok: true });
      return;
    }

    try {
      await handleTelegramUpdate(update);
    } catch (error) {
      console.error("[telegram] Webhook update xatoligi:", error);
    }

    res.json({ ok: true });
  });

  app.post("/api/auth/login", loginRateLimit, (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const name = normalizeName(req.body?.name);
    const providedAdminCode = cleanString(req.body?.adminCode, 64);

    if (!phone) {
      res.status(400).json({ error: "Telefon raqamini to'g'ri kiriting." });
      return;
    }

    const session = buildAuthenticatedSession(phone, name, providedAdminCode);
    res.json(session);
  });

  app.post("/api/auth/telegram", loginRateLimit, (req, res) => {
    if (!TELEGRAM_BOT_TOKEN) {
      res.status(503).json({ error: "Telegram bot sozlanmagan (TELEGRAM_BOT_TOKEN)." });
      return;
    }

    const rawInitData = cleanString(req.body?.initData, 10_000);
    const providedAdminCode = cleanString(req.body?.adminCode, 64);
    const verified = verifyTelegramInitData(rawInitData);

    if (!verified) {
      res.status(401).json({ error: "Telegram autentifikatsiyasi muvaffaqiyatsiz. Mini Appni qayta oching." });
      return;
    }

    const phone = normalizeTelegramIdentityPhone(verified.user.id);
    const name = normalizeTelegramDisplayName(verified.user);
    const session = buildAuthenticatedSession(phone, name, providedAdminCode);
    res.json(session);
  });

  app.put("/api/auth/address", requireAuth, (req: AuthenticatedRequest, res) => {
    const address = parseAddress(req.body?.address);
    if (!address) {
      res.status(400).json({ error: "Manzil formati noto'g'ri." });
      return;
    }

    db.prepare("UPDATE users SET currentAddress = ? WHERE phone = ?").run(JSON.stringify(address), req.auth!.phone);
    res.json({ success: true, address });
  });

  app.get("/api/menu", (_req, res) => {
    const items = db.prepare("SELECT * FROM menu ORDER BY name ASC").all();
    res.json(items);
  });

  app.post("/api/menu", requireAuth, requireAdmin, (req, res) => {
    const payload = parseProductPayload(req.body);
    if (!payload) {
      res.status(400).json({ error: "Mahsulot ma'lumotlari noto'g'ri." });
      return;
    }

    try {
      db.prepare("INSERT INTO menu (id, name, price, category, image, description) VALUES (?, ?, ?, ?, ?, ?)").run(
        payload.id,
        payload.name,
        payload.price,
        payload.category,
        payload.image,
        payload.description
      );
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(409).json({ error: "Mahsulot ID band yoki ma'lumot xato." });
    }
  });

  app.put("/api/menu/:id", requireAuth, requireAdmin, (req, res) => {
    const routeId = cleanString(req.params.id, 64);
    if (!routeId) {
      res.status(400).json({ error: "ID noto'g'ri." });
      return;
    }

    const payload = parseProductPayload(req.body, routeId);
    if (!payload) {
      res.status(400).json({ error: "Mahsulot ma'lumotlari noto'g'ri." });
      return;
    }

    const result = db
      .prepare("UPDATE menu SET name = ?, price = ?, category = ?, image = ?, description = ? WHERE id = ?")
      .run(payload.name, payload.price, payload.category, payload.image, payload.description, routeId);

    if (!result.changes) {
      res.status(404).json({ error: "Mahsulot topilmadi." });
      return;
    }

    res.json({ success: true });
  });

  app.delete("/api/menu/:id", requireAuth, requireAdmin, (req, res) => {
    const routeId = cleanString(req.params.id, 64);
    if (!routeId) {
      res.status(400).json({ error: "ID noto'g'ri." });
      return;
    }

    const result = db.prepare("DELETE FROM menu WHERE id = ?").run(routeId);
    if (!result.changes) {
      res.status(404).json({ error: "Mahsulot topilmadi." });
      return;
    }

    res.json({ success: true });
  });

  app.get("/api/orders", requireAuth, requireAdmin, (_req, res) => {
    const rows = db.prepare("SELECT * FROM orders ORDER BY timestamp DESC").all() as Record<string, unknown>[];
    res.json(rows.map(formatOrderRow));
  });

  app.get("/api/orders/my", requireAuth, (req: AuthenticatedRequest, res) => {
    const rows = db
      .prepare("SELECT * FROM orders WHERE customerPhone = ? ORDER BY timestamp DESC")
      .all(req.auth!.phone) as Record<string, unknown>[];
    res.json(rows.map(formatOrderRow));
  });

  app.post("/api/orders", requireAuth, (req: AuthenticatedRequest, res) => {
    const customer = req.body?.customer;
    const customerPhone = normalizePhone(customer?.phone);
    const customerLocation = parseAddress(customer?.location);
    const items = parseOrderItems(req.body?.items);
    const paymentMethod = parsePaymentMethod(req.body?.paymentMethod) ?? "card";

    if (!customerPhone || customerPhone !== req.auth!.phone) {
      res.status(403).json({ error: "Telefon raqami sessiya bilan mos emas." });
      return;
    }
    if (!customerLocation) {
      res.status(400).json({ error: "Yetkazib berish manzili noto'g'ri." });
      return;
    }
    if (!items) {
      res.status(400).json({ error: "Buyurtma mahsulotlari noto'g'ri." });
      return;
    }

    const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const requestedTotal = Number(req.body?.total);
    const total = Number.isInteger(requestedTotal) && requestedTotal >= itemsTotal ? requestedTotal : itemsTotal;
    const id = crypto.randomUUID();
    const status: OrderStatus = "new";

    db.prepare(
      "INSERT INTO orders (id, customerPhone, customerLocation, items, total, status, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, customerPhone, JSON.stringify(customerLocation), JSON.stringify(items), total, status, paymentMethod);

    const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown>;
    void notifyTelegramAdminOrder({
      id,
      total,
      paymentMethod,
      customerPhone,
      addressName: customerLocation.addressName,
      items: items.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price })),
    });

    res.status(201).json({ success: true, order: formatOrderRow(row) });
  });

  app.put("/api/orders/:id/status", requireAuth, requireAdmin, (req, res) => {
    const status = parseOrderStatus(req.body?.status);
    if (!status) {
      res.status(400).json({ error: "Status noto'g'ri." });
      return;
    }

    const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
    if (!result.changes) {
      res.status(404).json({ error: "Buyurtma topilmadi." });
      return;
    }
    res.json({ success: true });
  });

  app.get("/api/knowledge", requireAuth, (_req, res) => {
    const row = db.prepare("SELECT content FROM knowledge WHERE id = 1").get() as { content?: string } | undefined;
    res.json({ content: row?.content ?? "" });
  });

  app.put("/api/knowledge", requireAuth, requireAdmin, (req, res) => {
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : null;
    if (!content || content.length > 15_000) {
      res.status(400).json({ error: "Knowledge matni noto'g'ri yoki juda uzun." });
      return;
    }

    db.prepare("UPDATE knowledge SET content = ? WHERE id = 1").run(content);
    res.json({ success: true });
  });

  app.get("/api/promotions", (_req, res) => {
    const items = db.prepare("SELECT * FROM promotions ORDER BY id DESC").all();
    res.json(items);
  });

  app.post("/api/promotions", requireAuth, requireAdmin, (req, res) => {
    const payload = parsePromotionPayload(req.body);
    if (!payload) {
      res.status(400).json({ error: "Aksiya ma'lumoti noto'g'ri." });
      return;
    }

    try {
      db.prepare("INSERT INTO promotions (id, title, description, image, color) VALUES (?, ?, ?, ?, ?)")
        .run(payload.id, payload.title, payload.description, payload.image, payload.color);
      res.status(201).json({ success: true });
    } catch {
      res.status(409).json({ error: "Aksiya saqlanmadi: ID band bo'lishi mumkin." });
    }
  });

  app.put("/api/promotions/:id", requireAuth, requireAdmin, (req, res) => {
    const routeId = cleanString(req.params.id, 64);
    if (!routeId) {
      res.status(400).json({ error: "ID noto'g'ri." });
      return;
    }

    const payload = parsePromotionPayload(req.body, routeId);
    if (!payload) {
      res.status(400).json({ error: "Aksiya ma'lumoti noto'g'ri." });
      return;
    }

    const result = db
      .prepare("UPDATE promotions SET title = ?, description = ?, image = ?, color = ? WHERE id = ?")
      .run(payload.title, payload.description, payload.image, payload.color, routeId);

    if (!result.changes) {
      res.status(404).json({ error: "Aksiya topilmadi." });
      return;
    }

    res.json({ success: true });
  });

  app.delete("/api/promotions/:id", requireAuth, requireAdmin, (req, res) => {
    const routeId = cleanString(req.params.id, 64);
    if (!routeId) {
      res.status(400).json({ error: "ID noto'g'ri." });
      return;
    }

    const result = db.prepare("DELETE FROM promotions WHERE id = ?").run(routeId);
    if (!result.changes) {
      res.status(404).json({ error: "Aksiya topilmadi." });
      return;
    }

    res.json({ success: true });
  });

  app.get("/api/categories", (_req, res) => {
    const items = db.prepare("SELECT * FROM categories ORDER BY name ASC").all();
    res.json(items);
  });

  app.post("/api/categories", requireAuth, requireAdmin, (req, res) => {
    const payload = parseCategoryPayload(req.body);
    if (!payload) {
      res.status(400).json({ error: "Kategoriya ma'lumoti noto'g'ri." });
      return;
    }

    try {
      db.prepare("INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)").run(payload.id, payload.name, payload.icon);
      res.status(201).json({ success: true });
    } catch {
      res.status(409).json({ error: "Kategoriya saqlanmadi: ID band bo'lishi mumkin." });
    }
  });

  app.put("/api/categories/:id", requireAuth, requireAdmin, (req, res) => {
    const routeId = cleanString(req.params.id, 64);
    if (!routeId) {
      res.status(400).json({ error: "ID noto'g'ri." });
      return;
    }

    const payload = parseCategoryPayload(req.body, routeId);
    if (!payload) {
      res.status(400).json({ error: "Kategoriya ma'lumoti noto'g'ri." });
      return;
    }

    const result = db.prepare("UPDATE categories SET name = ?, icon = ? WHERE id = ?").run(payload.name, payload.icon, routeId);
    if (!result.changes) {
      res.status(404).json({ error: "Kategoriya topilmadi." });
      return;
    }

    res.json({ success: true });
  });

  app.delete("/api/categories/:id", requireAuth, requireAdmin, (req, res) => {
    const routeId = cleanString(req.params.id, 64);
    if (!routeId) {
      res.status(400).json({ error: "ID noto'g'ri." });
      return;
    }

    const result = db.prepare("DELETE FROM categories WHERE id = ?").run(routeId);
    if (!result.changes) {
      res.status(404).json({ error: "Kategoriya topilmadi." });
      return;
    }

    res.json({ success: true });
  });

  app.get("/api/ai/live-token", requireAuth, liveTokenRateLimit, async (_req, res) => {
    if (!liveAiClient) {
      res.status(503).json({ error: "Gemini kaliti sozlanmagan (GEMINI_API_KEY)." });
      return;
    }

    try {
      const now = Date.now();
      const liveToken = await liveAiClient.authTokens.create({
        config: {
          uses: 1,
          newSessionExpireTime: new Date(now + 60_000).toISOString(),
          expireTime: new Date(now + 10 * 60_000).toISOString(),
        },
      });

      if (!liveToken?.name) {
        res.status(500).json({ error: "Gemini token olinmadi." });
        return;
      }

      res.json({ token: liveToken.name, model: GEMINI_LIVE_MODEL });
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Gemini token yaratishda xatolik." });
    }
  });

  app.get("/api/test-route", (_req, res) => {
    res.json({ message: "Test route works!" });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route topilmadi." });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist", { index: false }));
    app.use((_req, res) => {
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  }

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Server Error:", err);
    res.status(500).json({ error: err?.message ?? "Kutilmagan server xatoligi." });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);

    if (!TELEGRAM_BOT_TOKEN) {
      console.log("[telegram] Bot o'chirilgan (TELEGRAM_BOT_TOKEN yo'q).");
      return;
    }

    if (!TELEGRAM_MINI_APP_URL) {
      console.warn("[telegram] TELEGRAM_MINI_APP_URL berilmagan. /start tugmasi ko'rinmasligi mumkin.");
    }

    if (TELEGRAM_WEBHOOK_URL) {
      void startTelegramWebhook();
    } else {
      void startTelegramPolling();
    }
  });
}

startServer();
