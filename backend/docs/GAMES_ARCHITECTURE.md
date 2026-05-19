# Partner games architecture

All catalog games (Aviator, Fun Timer, Roulette) launch through the **partner session API** only. There is no in-house static game host in this flow.

## Launch (player JWT)

1. `GET /api/v1/games` — catalog tiles (no `launchUrl` exposed).
2. `POST /api/v1/games/launch/:gameCode` — player JWT (`verifyUser`).
3. Backend POSTs to `GAME_LAUNCH_URL` with `x-api-key` / `x-api-secret`.
4. Partner returns `launchUrl` → frontend opens `/games/play/:code` in iframe.

### Embed proxy (X-Frame-Options blocked hosts)

For whitelisted CraftDigital hosts, launch response includes:

- `useEmbedProxy: true`
- `embedUrl: /api/v1/games/embed/frame?url=...&sessionToken=...`

`GET /api/v1/games/embed/frame` validates `sessionToken` (short-lived JWT) and reverse-proxies HTML.

Configure extra hosts: `GAME_EMBED_HOST_WHITELIST=host1.com,host2.com`

## Wallet (partner Bearer only)

- Mount: `/api/v1/generics/wallet/*`
- Auth: `Authorization: Bearer <PARTNER_TOKEN>`
- Debit/credit are **atomic** (Mongo transaction): `Wallet` + `WalletTransaction` + `GameBetHistory` (UI cache).

**Financial source of truth:** `WalletTransaction` with descriptions:

- `Generic debit | roundId=... | game=... | betNumber=...`
- `Generic credit | roundId=...`

## History & reporting

| Use case | Endpoint / source |
|----------|-------------------|
| Player game bets UI | `GET /api/v1/games/my-bet-history` (reads `GameBetHistory` cache) |
| Matka wallet passbook | `GET /api/v1/wallet/my-transactions?includeBet=1` |
| Admin game revenue | `GET /api/v1/dashboard/stats` → `gameWiseRevenue` from wallet txs |

`GameBetHistory` is a **read cache** — never use it for revenue reconciliation.

## Required production env

- `GAME_LAUNCH_URL`, `GAME_LAUNCH_API_KEY` (or `API_KEY`), `GAME_LAUNCH_API_SECRET` (or `API_SECRET`)
- `PARTNER_TOKEN` (must not be `partner-token`)
- `USER_JWT_SECRET`, `MONGODB_URI`, `ALLOWED_ORIGINS`
- Optional: `GAME_RETURN_URL`, `GAME_PARTNER_CODE_MAP`, `GAME_EMBED_HOST_WHITELIST`

## Auth separation

| Actor | Token | Routes |
|-------|-------|--------|
| Player | JWT | `/games/*` launch, catalog |
| Partner game server | `PARTNER_TOKEN` | `/generics/wallet/*` |

Never send player JWT to wallet routes. Never expose `PARTNER_TOKEN` to the frontend.
