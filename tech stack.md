# PUMPTOWER.LOL - Isometric Voxel Skyscraper Token Tracker

## 1. Core Expansion & Holder Retention Gamification Mechanics

To incentivize long-term holding and make it fun & viral on Pump.fun / Solana:

### 🌟 A. "Floor Ascension" & Penthouse Status
* **Every +$10k Market Cap**: A new voxel building module/floor drops in with physical impact particles and screen-shake.
* **Holder Elevators & Penthouse Hierarchy**:
  * **Top Diamond Hands (Held > X days / High weight)**: Spawn on the open-air Rooftop Penthouse / VIP Helipad with crowns, golden glow particle effects, and dancing animations.
  * **Mid-tier Holders**: Hang out on the observation balconies and intermediate floors.
  * **Paper Hands / Sells**: Trigger a funny visual event (e.g. falling cartoon parachute off the building or getting catapulted to the street road).

### ⏳ B. "Proof of Diamond Hands" (Holding Duration Multipliers)
* **Hold Streak XP & Stature**:
  * The longer a wallet holds without selling, their voxel NPC character grows visual accessories (Bronze Hat -> Silver Armor -> Gold Crown -> Diamond Jetpack -> Laser Eyes).
  * **Holding Yield Points**: Wallets earn continuous on-chain or off-chain "Voxel Energy / Rent Yield" proportional to `Amount * Time_Held`.
* **Rooftop Airdrop Rain**:
  * Automatic periodic community reward pools (from dev tax / creator fee or tip jar) distributed exclusively to NPCs currently on higher tiers (weighted by time held).

### 💬 C. Interactive Voxel Social Feed
* Click on any NPC wandering the building to see their wallet address, holding balance, diamond-hand badge, and custom shoutout speech bubble.
* Live simulated/real-time Pump.fun trade feed showing buyers parachuting into the roof!

---

## 2. Tech Stack Specification
* **Frontend Framework**: React 19 / Vite
* **3D Engine**: Three.js + `@react-three/fiber` + `@react-three/drei` (Optimized isometric camera, ambient voxel lighting, shadow mapping)
* **Models**: Custom Low-poly GLB assets (`/public/models/building.glb`, `character.glb`, `road.glb`, `intersection.glb`)
* **Styling & UI**: Clean Dark Glassmorphism, Tailwind / Modern Vanilla CSS, Inspired by ReactBits / Hyper-minimalist web3 dashboard.
* **State Management**: Reactive Zustand / React Hooks for real-time market cap simulations and wallet tracker.
