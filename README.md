# 🍆 $DICK COIN - Real-Time Pump.fun 3D NPC Tracker & Playground

A real-time on-chain 3D gamified token tracker for Pump.fun on Solana. 

Every time someone buys `$DICK` on Pump.fun, a 3D NPC character spawns in the cyber-arena hopping around. The larger the SOL buy, the longer/taller the neck (shaft) grows!

---

## 🚀 Key Features

1. **Dynamic 3D Morphing & Hopping Physics**:
   - **Shaft / Neck Elongation**: Calculated via `Scale_Y = 1.0 + ln(1 + solAmount * 3.5) * 1.85`. Whale buys stretch into towering skyscraper necks with crown tags.
   - **Dynamic Skin Tones**: 11 unique colorways (Ivory Pale, Warm Tan, Deep Cocoa, 24K Pure Gold, Diamond Hands Blue, Neon Pink, Alien Green, etc.).
   - **Squash & Stretch Animation**: Procedural hopping loop with elastic impact compression and tip inertia wobble.

2. **On-Chain Solana & Pump.fun Live Stream (`solana-pumpfun-realtime-tracking`)**:
   - **Sub-second PDA Bonding Curve Decoding**: Direct binary parsing of `virtualSolReserves` and `virtualTokenReserves` without third-party delay.
   - **Raydium Migration Meter**: Live progress calculation towards bonding curve graduation (~85 SOL).
   - **Helius RPC / WebSocket Connection**: Avoids `429 Too Many Requests` rate limiting.

3. **Interactive Degen HUD**:
   - **Live Market Cap & Price Bar**: Real-time USD and SOL valuation.
   - **Live Buy Stream**: Shows recent transactions with estimated shaft length in centimeters.
   - **Chad Leaderboard**: Top holders ranked with whale badges (excluding AMM pools and dust wallets).
   - **Click-to-Inspect NPC**: Click any hopping character in the 3D world to inspect their wallet, transaction size, and Solscan link.
   - **Web Audio Synthesizer**: Procedural cartoon boings, fanfare trumpets, and buy chimes.

4. **Phantom Wallet-Gated Admin Control**:
   - Cryptographic public key verification.
   - Live settings update (Token CA, Helius Key, Social Links) with cross-tab `BroadcastChannel` synchronization.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Lucide Icons, Canvas Confetti
- **3D Engine**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **Solana Web3**: `@solana/web3.js`
- **Styling**: Vanilla Dark Glassmorphism CSS with Cyberpunk Neon accents
