# Wallet APIs (EagleGames)

This document matches the **EagleGames** backend: player/admin routes under `/api/v1/wallet`, and **game-partner** callbacks under `/api/v1/partner/wallet`.

---

## A) Player wallet (logged-in user)

### Get own balance

| | |
|---|---|
| **Method** | `GET` or `POST` |
| **URL** | `/api/v1/wallet/balance` |
| **Auth** | `Authorization: Bearer <user JWT>` |
| **Body** | none |

**Success (actual shape from backend)**

```json
{
  "success": true,
  "data": {
    "balance": 1250
  }
}
```

**Notes**

- `userId` is **not** returned in the body; it comes from the JWT (`req.userId`).
- There is no `message` field on success for this handler.

**Errors**

- `401` — `success: false`, `message` such as `Authentication required. Please log in.`, optional `code: "AUTH_REQUIRED"` or `TOKEN_EXPIRED`.

**cURL**

```bash
curl -s -X GET "http://localhost:3010/api/v1/wallet/balance" \
  -H "Authorization: Bearer <user_jwt>"
```

---

## B) Admin wallet adjust (staff)

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/wallet/adjust` |
| **Auth** | `Authorization: Bearer <admin JWT>` **or** `Authorization: Basic <base64(username:password)>` |

### Request body

```json
{
  "userId": "USER_ID",
  "amount": 200,
  "type": "debit"
}
```

`type` must be `"credit"` or `"debit"`. `amount` must be a positive number.

### Success (actual shape)

Returns the **wallet document** (not a custom `newBalance`-only object):

```json
{
  "success": true,
  "data": {
    "_id": "WALLET_DOC_ID",
    "userId": "USER_ID",
    "balance": 1050,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Errors (examples)

```json
{
  "success": false,
  "message": "Insufficient balance for debit"
}
```

```json
{
  "success": false,
  "message": "Invalid admin credentials"
}
```

**cURL — debit**

```bash
curl -s -X POST "http://localhost:3010/api/v1/wallet/adjust" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_jwt>" \
  -d "{\"userId\":\"USER_ID\",\"amount\":200,\"type\":\"debit\"}"
```

**cURL — credit**

```bash
curl -s -X POST "http://localhost:3010/api/v1/wallet/adjust" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_jwt>" \
  -d "{\"userId\":\"USER_ID\",\"amount\":500,\"type\":\"credit\"}"
```

### Related admin endpoints (same `/api/v1/wallet` prefix, `verifyAdmin`)

| Method | Path | Purpose |
|--------|------|--------|
| `POST` | `/credit` | Body: `{ "userId", "amount", "description?" }` |
| `POST` | `/debit` | Body: `{ "userId", "amount", "description?" }` |
| `GET` | `/player/:userId` | Full wallet for a player |
| `GET` | `/player/:userId/amount` | Quick amount lookup |

---

## C) Partner / generic wallet (game provider server-to-server)

**Base path:** `/api/v1/partner/wallet`  
**Auth:** `Authorization: Bearer <PARTNER_TOKEN>` (same env var used with your game launch integration; not the user JWT).

These are **not** browser-friendly (no auth header in the address bar). Call from Postman, your partner’s servers, or cURL.

### C1) Get balance by player id

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/v1/partner/wallet/:playerId/balance` |
| **Auth** | `Bearer <PARTNER_TOKEN>` |

**Success**

```json
{
  "success": true,
  "data": {
    "playerId": "USER_OR_EXTERNAL_ID",
    "balance": 1250,
    "currency": "INR"
  }
}
```

**Errors**

```json
{ "success": false, "error": "Unauthorized" }
```

```json
{ "success": false, "error": "playerId is required" }
```

### C2) Debit

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/partner/wallet/debit` |
| **Auth** | `Bearer <PARTNER_TOKEN>` |

**Body**

```json
{
  "playerId": "USER_ID_OR_USERNAME",
  "amount": 100,
  "transactionId": "UNIQUE_TXN_ID",
  "roundId": "optional",
  "game": "optional",
  "betNumber": "optional"
}
```

### C3) Credit

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/v1/partner/wallet/credit` |
| **Auth** | `Bearer <PARTNER_TOKEN>` |

**Body**

```json
{
  "playerId": "USER_ID_OR_USERNAME",
  "amount": 100,
  "transactionId": "UNIQUE_TXN_ID",
  "roundId": "optional"
}
```

**cURL — partner balance**

```bash
curl -s "http://localhost:3010/api/v1/partner/wallet/USER_ID/balance" \
  -H "Authorization: Bearer <PARTNER_TOKEN>"
```

**POST balance (same handler, JSON body)**

```bash
curl -s -X POST "http://localhost:3010/api/v1/partner/wallet/balance" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PARTNER_TOKEN>" \
  -d "{\"playerId\":\"player-123\"}"
```

---

## D) Mock wallet paths (POST + JSON, same auth as partner)

Same handlers and response shapes as section C, aligned with a **mock wallet** contract (e.g. Aviator control plane). Mounted at **`/wallet`** on the **same server** as the API (default port `3010`, or whatever `PORT` is — not a separate `:4300` process unless you run a second server on that port).

| Method | URL | Body |
|--------|-----|------|
| `POST` | `/wallet/balance` | `{ "playerId" }` |
| `POST` | `/wallet/debit` | `{ "playerId", "amount", "transactionId", "roundId?", "game?", "betNumber?" }` |
| `POST` | `/wallet/credit` | `{ "playerId", "amount", "transactionId", "roundId?" }` |

Headers: `Content-Type: application/json`, `Authorization: Bearer <PARTNER_TOKEN>` (default token literal `partner-token` if `PARTNER_TOKEN` is unset).

`data.playerId` in responses echoes the **`playerId` sent in the request** (e.g. `player-123` or a Mongo user id string).

---

## Quick reference

| Who | Base | Auth |
|-----|------|------|
| Player | `/api/v1/wallet` | User JWT |
| Admin | `/api/v1/wallet` | Admin JWT or Basic |
| Game partner | `/api/v1/partner/wallet` | `PARTNER_TOKEN` Bearer |
| Mock / partner POST | `/wallet` | `PARTNER_TOKEN` Bearer |
