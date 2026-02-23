# Stellarship (Frontend)

Next.js frontend (based on the Hidden Warrior UI) for the Stellar ZK Gaming hackathon prototype.

## Dev

This environment currently blocks binding to local ports, so `next dev` may fail with `EPERM`.
You can still run a production build:

```bash
cd /Users/aomine/Desktop/stellar
npm install
npm --workspace apps/web run build
```

## What Works Today
- Hidden Warrior UI shell: menu, help, lobby screens
- Stellar Wallets Kit wiring (client-only init)
- SGS-style multi-sig `start_game` flow (generate invite auth entry -> join -> submit tx), including auth-entry parsing with the 3-arg shape: `(session_id, mode_id, points)`

## What’s Next
- Build match UI (boards + turns) + relay integration
- Add ZK verifier + `end_game` settlement flow
