# Drift Payment

Crypto payment platform for businesses — accept USDT (TRC20, ERC20, Solana), manage wallets, payment links, and transactions.

**Live:** https://drift-production-9c09.up.railway.app

## Features

- Merchant dashboards with live transaction data
- Custodial wallet generation + connected wallets
- Payment links with QR checkout
- Automatic on-chain payment detection (60s poller)
- 1.5% platform fee with admin fee wallets
- Telegram admin alerts
- API keys + webhooks

## Local development

```bash
npm install
cp .env.local.example .env.local
# Fill DATABASE_URL, NEXTAUTH_SECRET, etc.
npm run dev
```

Open http://localhost:3000

## Production deploy (Railway)

1. Connect repo to Railway
2. Set variables from `.env.local.example` (minimum: `DATABASE_URL`, `NEXTAUTH_SECRET`, `ADMIN_EMAIL`)
3. Add blockchain keys: `TRONGRID_API_KEY`, `ETHERSCAN_API_KEY` for payment detection
4. Railway runs migrations + admin seed on deploy (`railway.toml`)
5. Sign up with the `ADMIN_EMAIL` address, then visit `/admin`

`NEXTAUTH_URL` is auto-set from `RAILWAY_PUBLIC_DOMAIN` on start.

## Public launch checklist

- [ ] `DATABASE_URL`, `NEXTAUTH_SECRET`, `ADMIN_EMAIL` set
- [ ] `TRONGRID_API_KEY` + `ETHERSCAN_API_KEY` for USDT detection
- [ ] `MASTER_WALLET_MNEMONIC` — unique production mnemonic (never use the example phrase)
- [ ] `WALLET_ENCRYPTION_KEY` — random 32+ chars
- [ ] Admin platform fee wallets configured at `/admin/wallets`
- [ ] Telegram vars for admin alerts (optional)
- [ ] Run `npm run smoke:test` after deploy

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run smoke:test` | HTTP smoke test against live URL |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run db:seed-admin` | Promote `ADMIN_EMAIL` user to admin |

## Docs

- API reference: `/developers`
- Terms: `/terms`
- Privacy: `/privacy`
- Demo checkout preview: `/demo`
