import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { pathToFileURL } from "node:url";

const ROOT_DIR = process.cwd();
const PORT = Number(process.env.E2E_PORT ?? 3211);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DB_PATH = path.join(os.tmpdir(), `kfc-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bootServer(): Promise<Server> {
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = "production";
  process.env.DB_PATH = DB_PATH;
  process.env.SESSION_SECRET = "e2e-session-secret";
  process.env.TELEGRAM_BOT_TOKEN = "";
  process.env.TELEGRAM_WEBHOOK_URL = "";
  process.env.TELEGRAM_WEBHOOK_SECRET = "";
  process.env.TELEGRAM_MINI_APP_URL = "";
  process.env.GEMINI_API_KEY = "";
  process.env.PAYNET_CALLBACK_SECRET = "";
  process.env.DEBUG = "";

  const serverModuleUrl = pathToFileURL(path.join(ROOT_DIR, "server.ts")).href;
  const module = (await import(serverModuleUrl)) as { startServer: () => Promise<Server> };
  return module.startServer();
}

async function waitForHealth(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(4_000) });
      if (response.ok) return;
    } catch {
      // retry until timeout
    }
    await sleep(350);
  }
  throw new Error("Server /api/health kutish muddati tugadi.");
}

type JsonResponse<T> = { status: number; body: T };

async function requestJson<T>(route: string, init: RequestInit = {}, token?: string): Promise<JsonResponse<T>> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${BASE_URL}${route}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(12_000),
  });

  const text = await response.text();
  let body: T;
  try {
    body = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error(`JSON parse xatoligi: ${route} -> ${text.slice(0, 140)}`);
  }

  return { status: response.status, body };
}

async function run(): Promise<void> {
  let server: Server | null = null;
  try {
    server = await bootServer();
    await waitForHealth(20_000);

    const login = await requestJson<{ user: { phone: string }; token: string; error?: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ name: "E2E User", phone: "998901234567" }),
    });
    assert.equal(login.status, 200, `Login xatosi: ${login.body.error ?? "unknown"}`);
    assert.ok(login.body.token, "Token qaytmadi");

    const token = login.body.token;
    const sessionPhone = login.body.user.phone;

    const menu = await requestJson<Array<{ id: string; price: number }>>("/api/menu");
    assert.equal(menu.status, 200, "Menyu olinmadi");
    assert.ok(menu.body.length > 0, "Menyu bo'sh");

    const firstItem = menu.body[0];

    const addCart = await requestJson<{ items: Array<{ id: string; quantity: number }> }>(
      "/api/cart/items",
      {
        method: "POST",
        body: JSON.stringify({ productId: firstItem.id, quantity: 2 }),
      },
      token
    );
    assert.equal(addCart.status, 201, "Savatga qo'shish muvaffaqiyatsiz");
    assert.ok(addCart.body.items.some((item) => item.id === firstItem.id && item.quantity === 2), "Savat miqdori noto'g'ri");

    const decCart = await requestJson<{ items: Array<{ id: string; quantity: number }> }>(
      `/api/cart/items/${encodeURIComponent(firstItem.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ delta: -1 }),
      },
      token
    );
    assert.equal(decCart.status, 200, "Savatdan kamaytirish ishlamadi");
    assert.ok(decCart.body.items.some((item) => item.id === firstItem.id && item.quantity === 1), "Savat kamaytirish natijasi xato");

    const address = {
      lat: 41.3111,
      lng: 69.2797,
      addressName: "Toshkent, Chilonzor 12",
      entrance: "2",
      floor: "4",
      apartment: "45",
      comment: "Qo'ng'iroq qiling",
    };

    const updateAddress = await requestJson<{ success: boolean; error?: string }>(
      "/api/auth/address",
      {
        method: "PUT",
        body: JSON.stringify({ address }),
      },
      token
    );
    assert.equal(updateAddress.status, 200, `Manzil saqlash xato: ${updateAddress.body.error ?? "unknown"}`);

    const cartBeforeOrder = await requestJson<{ items: Array<{ id: string; price: number; quantity: number }> }>("/api/cart", {}, token);
    assert.equal(cartBeforeOrder.status, 200, "Savat olinmadi");
    assert.ok(cartBeforeOrder.body.items.length > 0, "Orderdan oldin savat bo'sh");

    const itemsTotal = cartBeforeOrder.body.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const createOrder = await requestJson<{ order: { id: string; paymentStatus: string }; error?: string }>(
      "/api/orders",
      {
        method: "POST",
        body: JSON.stringify({
          customer: { phone: sessionPhone, location: address },
          items: [],
          total: itemsTotal + 12000,
          paymentMethod: "card",
        }),
      },
      token
    );
    assert.equal(createOrder.status, 201, `Order yaratilmadi: ${createOrder.body.error ?? "unknown"}`);
    assert.equal(createOrder.body.order.paymentStatus, "pending", "Order default paymentStatus noto'g'ri");

    const cartAfterOrder = await requestJson<{ items: Array<unknown> }>("/api/cart", {}, token);
    assert.equal(cartAfterOrder.status, 200, "Orderdan keyin savat olinmadi");
    assert.equal(cartAfterOrder.body.items.length, 0, "Orderdan keyin savat tozalanmadi");

    const callback = await requestJson<{ success: boolean; paymentStatus: string; error?: string }>(
      "/api/payment/paynet/callback",
      {
        method: "POST",
        body: JSON.stringify({
          order_id: createOrder.body.order.id,
          status: "paid",
          txn_id: "txn-e2e-001",
        }),
      }
    );
    assert.equal(callback.status, 200, `Payment callback xato: ${callback.body.error ?? "unknown"}`);
    assert.equal(callback.body.paymentStatus, "paid", "Callback paymentStatus noto'g'ri");

    const myOrders = await requestJson<Array<{ id: string; paymentStatus?: string; providerTxnId?: string }>>("/api/orders/my", {}, token);
    assert.equal(myOrders.status, 200, "Mening buyurtmalarim olinmadi");
    const created = myOrders.body.find((order) => order.id === createOrder.body.order.id);
    assert.ok(created, "Yaratilgan order topilmadi");
    assert.equal(created?.paymentStatus, "paid", "Order paymentStatus yangilanmadi");
    assert.equal(created?.providerTxnId, "txn-e2e-001", "Order providerTxnId saqlanmadi");

    const health = await requestJson<{ status: string; services?: { db?: string } }>("/api/health");
    assert.equal(health.status, 200, "/api/health ishlamadi");
    assert.equal(health.body.status, "ok", "Health status ok emas");
    assert.equal(health.body.services?.db, "ok", "Health db status noto'g'ri");

    console.log("[e2e] Barcha tekshiruvlar muvaffaqiyatli o'tdi.");
  } finally {
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });
    }

    for (const suffix of ["", "-shm", "-wal"]) {
      const filePath = `${DB_PATH}${suffix}`;
      if (!fs.existsSync(filePath)) continue;
      try {
        fs.unlinkSync(filePath);
      } catch {
        // SQLite handle may still hold lock briefly on Windows.
      }
    }
  }
}

run().catch((error) => {
  console.error("[e2e] Xatolik:", error);
  process.exitCode = 1;
});
