## Reuse Hidden Warrior Frontend (Next.js) for Our Stellar ZK Game (SGS Auth-Entry + Mode ID)

### Summary
We will keep the **Hidden Warrior Next.js UI/theme** (fonts, assets, components, scene-based navigation), but strip **Solana + backend coupling** and replace it with:
- **Stellar Wallets Kit** wallet connectivity + `signTransaction` + `signAuthEntry`
- **SGS-style multi-sig auth-entry flow** for `start_game` (Player1 exports signed auth entry; Player2 imports, injects, signs, and submits)
- **On-chain enforced game modes** via `mode_id` embedded in `require_auth_for_args`
- A small **socket.io relay** used only for real-time turn message passing (final outcome still settled by on-chain + ZK verification)

We’ll keep this as a **public hackathon repo** and (since you confirmed rights) reuse Hidden Warrior assets/code with a short attribution note.

---

### Repo Layout (target)
- `apps/web/` : Next.js app (ported from `hidden-warrior-game/hidden-warrior-web`)
- `apps/relay/` : socket.io relay server (match room + move relay)
- `contracts/` : Soroban contracts (game + verifier + hub interface client)
- `packages/` (optional) : shared TS helpers (auth entry utils, constants) if we want reuse across apps
- `docs/hackathon/` : move current `task.md`, `resources.md`, etc so they don’t conflict with app tooling

Notes:
- We will remove nested git repos inside the workspace (e.g., `hidden-warrior-game/.git`) during implementation to avoid “repo inside repo” problems.

---

### Frontend Port: Hidden Warrior -> Stellar

#### 1) Remove Solana + backend coupling
In `apps/web/`:
- Remove deps: `@solana/*`, `@coral-xyz/anchor`, `@arcium-hq/client`, and any code paths that import them.
- Delete or orphan (stop importing) these backend-driven layers:
  - `src/lib/apiClient.ts` and `src/app/api/**`
  - `src/contexts/AuthContext.tsx`, `NotificationContext.tsx`, `PvPContext.tsx`, `GuildToastContext.tsx`
  - Most of `ArenaScene.tsx` and any “guilds/leaderboard/notifications” screens that assume a backend

We keep and reuse:
- `tailwind.config.js`, `src/app/globals.css`, `public/fonts/**`, `public/assets/**`
- UI primitives: `src/components/ui/*` (e.g. `MedievalButton`, `MedievalPanel`, `MenuDecorations`)
- Scene switching pattern in `src/app/page.tsx` (but we’ll swap in our own scenes)

#### 2) Replace wallet provider with Stellar Wallets Kit
- Replace `src/components/WalletContextProvider.tsx` with `src/components/StellarWalletProvider.tsx` that:
  - Initializes `StellarWalletsKit` on the client
  - Exposes: `address`, `connected`, `connect()`, `disconnect()`, `signTransaction(xdr)`, `signAuthEntry(xdr)`
  - Wraps the exact signer shape SGS services expect:
    - `signTransaction(): Promise<{ signedTxXdr: string }>`
    - `signAuthEntry(): Promise<{ signedAuthEntry: string }>`
- Update `src/components/Providers.tsx` to only wrap:
  - `<StellarWalletProvider>{children}</StellarWalletProvider>`
  - (Optional) `<SoundProvider>` if we keep audio, but no backend providers

#### 3) Update connect UI
- Update `src/components/WalletStatusPanel.tsx`:
  - Replace `WalletMultiButton` with a `MedievalButton` that calls `connect()`
  - Show short address (e.g. `GABC...WXYZ`) when connected
  - Add `Disconnect` action (optional)

---

### Game UX (using Hidden Warrior look)

#### Scenes we will implement (keep same “scene router” style)
- `menu`: updated `GameMenu` (same cinematic look)
- `lobby`: create/join match (new)
- `match`: battleship board + turn relay (new)
- `result`: settlement status + winner (new)
- `help`: short explanation of ZK mechanic + how to play (new/minimal)

#### Lobby flow (Create / Join)
- **Create Match (Player 1)**
  - Choose `mode`: `Classic (0)` or `Salvo (1)`
  - Choose optional `player2` address (or “open invite”)
  - Click “Create Invite”
  - App calls `prepareStartGame(sessionId, modeId, ...)` and outputs:
    - `player1SignedAuthEntryXdr` (copy button)
    - Share link: `?invite=<base64url(authEntryXdr)>`
- **Join Match (Player 2)**
  - Paste invite XDR or open share link
  - App parses it to show: `sessionId`, `modeId`, `player1`, `player1Points`
  - Player2 inputs their points and clicks “Sign & Start”
  - App calls `importAndSignAuthEntry(...)` then `finalizeStartGame(...)`

We will reuse Hidden Warrior’s `BattleModeSelector` styling for `Classic/Salvo` mode selection.

---

### Contract + SGS Auth-Entry Changes (Mode ID enforced on-chain)

#### Public contract API changes (game contract)
- `start_game` signature changes to include `mode_id: u32`:
  ```rust
  pub fn start_game(
    env: Env,
    session_id: u32,
    mode_id: u32,
    player1: Address,
    player2: Address,
    player1_points: i128,
    player2_points: i128,
  )
  ```
- Auth binding changes (critical):
  ```rust
  player1.require_auth_for_args((&session_id, &mode_id, &player1_points).into_val(&env));
  player2.require_auth_for_args((&session_id, &mode_id, &player2_points).into_val(&env));
  ```
- Store `mode_id` in session state and make it immutable.

#### Frontend service API changes (SGS-style TS service)
We will implement a `ZkBattleshipService` in `apps/web/src/lib/game/zkBattleshipService.ts` based on SGS `numberGuessService.ts`, with these exact updates:

1) `prepareStartGame` signature:
```ts
prepareStartGame(
  sessionId: number,
  modeId: number,
  player1: string,
  player2: string,
  player1Points: bigint,
  player2Points: bigint,
  player1Signer: { signTransaction; signAuthEntry },
  authTtlMinutes?: number,
): Promise<string /* player1SignedAuthEntryXdr */>
```

2) `parseAuthEntry` expects 3 args and returns `modeId`:
- args:
  1. `session_id (u32)`
  2. `mode_id (u32)`
  3. `player_points (i128)`

3) `importAndSignAuthEntry` rebuild uses `modeId` from Player1 entry (not UI override):
```ts
buildClient.start_game({
  session_id: gameParams.sessionId,
  mode_id: gameParams.modeId,
  player1: gameParams.player1,
  player2: player2Address,
  player1_points: gameParams.player1Points,
  player2_points: player2Points,
})
```

4) `parseTransactionXDR` updates start_game arg count to 6:
1. session_id
2. mode_id
3. player1
4. player2
5. player1_points
6. player2_points

We will copy SGS utility `injectSignedAuthEntry` logic (unchanged) into `apps/web/src/lib/stellar/authEntryUtils.ts` (or a shared `packages/` module).

---

### Real-time Turn Relay (socket.io)
In `apps/relay/`:
- Minimal socket.io server:
  - `room:join { sessionId, address }`
  - `move:send { sessionId, from, turn, x, y }`
  - `move:result { sessionId, from, turn, hit }`
  - `match:ready` when both connected
- Server does not decide game truth; it only relays messages and enforces basic ordering (optional).

In `apps/web/`:
- Simple hook `useRelay(sessionId)` to send/receive move messages
- Store transcript locally; this transcript becomes private input to the prover at settlement time

---

### ZK + On-chain Settlement (high-level but implementable)
Contracts:
- `commit_board(session_id, board_commitment)` for each player (after `start_game`)
- `end_game(session_id, proof, public_inputs...)`:
  - verifies ZK proof (Noir/Groth16 path)
  - checks public inputs bind to:
    - `session_id`, `mode_id`
    - stored `board_commitment` values
    - winner address
    - transcript hash / digest
  - calls Game Hub `end_game()` on `CB4VZAT2U...` after successful verification

Proving:
- `apps/prover/` (HTTP service) takes:
  - both boards + salts
  - transcript (moves/results)
  - mode rules
- returns:
  - proof bytes
  - public inputs (commitments, winner, transcript digest)

We will use the official Soroban Examples as the starting point for verifier plumbing (e.g. `groth16_verifier`, `import_ark_bn254`) to avoid inventing primitives.

---

### Testing / Acceptance Criteria

#### Contract tests
- `start_game` rejects if auth entry signed for `(session_id, mode_id=X)` but submitted with `mode_id=Y`
- `mode_id` stored once and cannot be changed
- `commit_board` enforces per-player auth and single-commit
- `end_game` fails on:
  - wrong commitments
  - wrong session/mode binding
  - replay (same proof/public inputs) if we add a replay guard (recommended)

#### Frontend tests
- `parseAuthEntry` throws if args length != 3 or function != `start_game`
- “Create invite -> Join -> Start” works end-to-end on testnet

#### Demo checklist (what judges can do)
1. Open `apps/web`, connect wallet (any supported by kit)
2. Player1 creates match, chooses mode, copies invite
3. Player2 joins with invite, sees mode, signs + starts
4. Both commit boards, play a short match via relay
5. Winner generates proof and settles `end_game` on-chain; hub shows `start_game/end_game` called

---

### Assumptions / Defaults
- Network: Stellar **Testnet**
- Wallet: **Stellar Wallets Kit** is the only wallet integration layer
- Relay server is allowed (not authoritative), and ZK + on-chain settlement is the source of truth
- Hidden Warrior code/assets are permitted for reuse (per your confirmation); we will still add a short attribution note in the repo README

