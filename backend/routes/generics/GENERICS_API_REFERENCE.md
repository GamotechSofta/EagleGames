# Generic wallet API (`/api/v1/generics`)

Same routing as **offlineGame2** `routes/generics/genericRouter.js`. Auth: `Authorization: Bearer <PARTNER_TOKEN>` (see backend `.env`).

## Base URL (local)

```text
http://localhost:3010/api/v1/generics
```

## Routes

| Method | Path |
|--------|------|
| POST | `/wallet/balance` |
| POST | `/wallet/balance/:playerId` |
| POST | `/wallet/debit` |
| POST | `/wallet/debit/:playerId` |
| POST | `/wallet/credit` |
| POST | `/wallet/credit/:playerId` |

`playerId` may be in the URL **or** in the JSON body (params take precedence over body, same as offlineGame2).

## Example: balance with `playerId` in path

```bash
curl -X POST "http://localhost:3010/api/v1/generics/wallet/balance/YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PARTNER_TOKEN"
```

## Example: debit (path `playerId`, body has amount / transactionId)

```bash
curl -X POST "http://localhost:3010/api/v1/generics/wallet/debit/YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PARTNER_TOKEN" \
  -d "{\"amount\":50,\"transactionId\":\"txn-001\",\"roundId\":\"round-001\",\"game\":\"aviator\"}"
```

## Also mounted (same handlers)

- `POST http://localhost:3010/wallet/balance` — mock-style root `/wallet`
- `GET|POST http://localhost:3010/api/v1/partner/wallet/...` — legacy partner paths
