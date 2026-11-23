# Gift Card Balance Checker (Simulation)

A fully simulated gift card verification demo built with Next.js (App Router, TypeScript).
No real gift cards are checked and no real card data is stored. Nothing leaves your machine.

## Run locally

    npm install
    npm run dev        # http://localhost:3000

## How it is wired

- `lib/giftcards.ts`  shared rules: brands, strict validation, fake issuer (`simulate`)
- `app/api/giftcard/check/route.ts`  server route: re-validates raw input, then simulates a lookup
- `components/GiftCardChecker.tsx`  client UI: live input filtering, lockout, history, result page

## Simulation test cards (last 4 characters of the card number)

- 0000 not found (3 in a row = 30s lockout)
- 1111 blocked
- 2222 expired
- 9999 active with $0.00
- anything else: active with a deterministic fake balance
