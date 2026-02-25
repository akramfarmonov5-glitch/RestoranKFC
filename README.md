<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e3c0a154-99bb-4399-9038-f2b73beda54b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` and set:
   - `GEMINI_API_KEY=...`
   - `SESSION_SECRET=...` (random long secret)
   - Optional: `ADMIN_CODE=...` and `ADMIN_PHONE=+998901234567`
   - Optional: `PAYNET_CALLBACK_SECRET=...` (payment callback security)
   - Optional: `PORT=3000`
3. Run development server:
   `npm run dev`
4. Build and run production:
   - `npm run build`
   - `npm run start`

## Run with Docker

**Prerequisites:** Docker Desktop (Docker + Compose)

1. Create `.env` from `.env.example` and set at least:
   - `SESSION_SECRET=...`
   - `GEMINI_API_KEY=...` (optional if voice AI is not needed)
   - Optional: `PAYNET_CALLBACK_SECRET=...` (for `/api/payment/paynet/callback`)
   - Optional: `HOST_PORT=3000` (change if 3000 band bo'lsa, masalan `HOST_PORT=3010`)
2. Build and run container:
   - `docker compose up --build -d`
3. Open app:
   - `http://localhost:3000`
4. Useful commands:
   - Logs: `docker compose logs -f app`
   - Stop: `docker compose down`

SQLite data is persisted in `./data/database.sqlite` via Docker volume mapping.

If frontend is deployed separately (e.g. Vercel), set `VITE_API_BASE_URL=https://your-backend-domain` so `/api/*` calls go to your backend.

## Monitoring and tests

- Health check: `GET /api/health`
- Server-side cart API: `/api/cart`
- Payment callback API: `POST /api/payment/paynet/callback`
- E2E test: `npm run test:e2e`

## CI/CD (GitHub Actions)

`main` branch uchun `.github/workflows/ci-cd.yml` qo'shildi:
- Typecheck (`npx tsc --noEmit`)
- Build (`npm run build`)
- E2E (`npm run test:e2e`)
- Docker image build (GHCR ga push: faqat `main` pushda)
- Vercel deploy (faqat quyidagi secretlar bo'lsa):
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`

## Telegram Bot + Mini App

`server.ts` endi Telegram botni ham qo'llab-quvvatlaydi:
- `/start` yuborilganda Mini App tugmasini beradi
- Mini App dan kelgan `sendData` (`web_app_data`) ni qabul qiladi
- Yangi buyurtma bo'lsa admin chatga xabar yuborishi mumkin
- Mini App ichida foydalanuvchi `initData` orqali avtomatik login bo'ladi

Kerakli env lar:
- `TELEGRAM_BOT_TOKEN=...`
- `TELEGRAM_MINI_APP_URL=https://your-domain` (Mini App ochiladigan URL)
- `TELEGRAM_ADMIN_CHAT_ID=...` (ixtiyoriy, yangi buyurtma xabarlari uchun)
- `TELEGRAM_INIT_DATA_MAX_AGE_SECONDS=86400` (ixtiyoriy, Telegram `initData` amal qilish muddati)

Webhook rejimi (production):
- `TELEGRAM_WEBHOOK_URL=https://your-domain/api/telegram/webhook`
- `TELEGRAM_WEBHOOK_SECRET=...` (ixtiyoriy lekin tavsiya etiladi)

Local rejim:
- `TELEGRAM_WEBHOOK_URL` bo'sh qoldirilsa bot avtomatik long-polling rejimida ishlaydi.
