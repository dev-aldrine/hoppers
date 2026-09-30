import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Scene3D } from './components/3d/Scene3D';
import Counter from './components/ui/Counter';
import { TradeFeed } from './components/ui/TradeFeed';
import { BottomDock } from './components/ui/BottomDock';
import { AdminModal } from './components/ui/AdminModal';
import { InfoModal } from './components/ui/InfoModal';
import { LaunchBuildingModal } from './components/ui/LaunchBuildingModal';
import { CameraHint } from './components/ui/CameraHint';
import growersLogo from './assets/growers_wordmark.png';
import { createSolanaConnection } from './solana/heliusConnection';
import {
  subscribeBondingCurve,
  subscribeRealtimeTrades,
  fetchTopHolders,
  fetchLiveSolPrice,
  fetchLiveMarketCapSnapshot,
  fetchLastQualifiedBuyer,
  fetchRecentTrades,
} from './solana/pumpTracker';
import { isValidPublicKey } from './solana/bondingCurve';
import { getProjectSettings, fetchSharedSettings, saveProjectSettings, usePhantomAuth } from './solana/phantomAuth';
import {
  calculateTotalInches,
  calculatePrizePayout,
  formatInches,
  inchesToCm,
  formatHodlDuration,
} from './solana/growthMechanics';
import { soundManager } from './audio/soundEffects';

import { ChallengeKingModal } from './components/ui/ChallengeKingModal';

// Clean initial states
const INITIAL_DEMO_NPCS = [];
const INITIAL_TRADES = [];
const INITIAL_HOLDERS = [];

export default function App() {
  const [settings, setSettings] = useState(getProjectSettings());
  const [npcs, setNpcs] = useState([]);
  const [trades, setTrades] = useState([]);
  const [holders, setHolders] = useState([]);

  // Permanent Configs
  const overallScale = 0.77;
  const groundOffset = 0.2;

  // Locked Tag Offsets
  const tagOffsetY = 0.0;
  const tagScale = 0.85;

  const [marketCapData, setMarketCapData] = useState({
    mcapUsd: 0,
    mcapSol: 0,
    priceInSol: 0,
    migrationProgress: 0,
    solUsdPrice: settings.solUsdPrice || 155,
  });

  const [selectedNpc, setSelectedNpc] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);

  // 👑 CROWNED: King of the Mountain State
  const [crownedKing, setCrownedKing] = useState(() => {
    try {
      const saved = localStorage.getItem('crowned_king_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      id: 'init-king',
      wallet: '3Pxv5rZVxFoBBFf57yE6opeyqqNbDWBGnB4TzvFBQwDN',
      buyAmountSol: 0.25,
      crownedAt: Date.now(),
    };
  });

  const [timerSeconds, setTimerSeconds] = useState(60.0);
  const [timerDuration] = useState(60.0);
  const [accumulatedFeesSol, setAccumulatedFeesSol] = useState(() => {
    try {
      const saved = localStorage.getItem('crowned_accumulated_fees');
      if (saved) return Number(saved);
    } catch (e) {}
    return 0.45;
  });
  const [fallenKings, setFallenKings] = useState([]);
  const [winnerHistory, setWinnerHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('crowned_winners_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const {
    walletAddress,
    isConnecting: isWalletConnecting,
    connectWallet,
    disconnectWallet,
  } = usePhantomAuth();

  // ⏱️ 60-Second Countdown Timer Loop
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 0.15) {
          // 👑 60s Victory Achieved! Fees redirected to current King!
          handleKingWin();
          return 60.0;
        }
        return Math.max(0, Number((prev - 0.1).toFixed(1)));
      });
    }, 100);

    return () => clearInterval(timerInterval);
  }, [crownedKing, accumulatedFeesSol]);

  const handleKingWin = () => {
    if (!crownedKing) return;

    const winRecord = {
      id: `win-${Date.now()}`,
      wallet: crownedKing.wallet,
      solWon: accumulatedFeesSol,
      wonAt: Date.now(),
    };

    setWinnerHistory((prev) => {
      const updated = [winRecord, ...prev.slice(0, 19)];
      try {
        localStorage.setItem('crowned_winners_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 🎆 Victory Celebrations
    confetti({
      particleCount: 160,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#ffd166', '#ffb703', '#00f5d4', '#f72585'],
    });
    soundManager?.playPrizePoolClaim?.();

    // Reset fee accumulation to seed
    setAccumulatedFeesSol(0.05);
    try {
      localStorage.setItem('crowned_accumulated_fees', '0.05');
    } catch (e) {}
  };

  // 💥 Dethrone the current King and crown the new buyer (minimum 0.25 SOL)
  const dethroneKing = (buyerWallet, solAmount, signature = null, timestamp = null) => {
    const amount = Number(solAmount) || 0.25;
    if (amount < 0.25 || !buyerWallet) return;

    // 1. Add current king to falling queue for knockoff physics if new king is different
    setCrownedKing((prevKing) => {
      if (prevKing && prevKing.wallet && prevKing.wallet !== buyerWallet) {
        setFallenKings((prev) => [
          ...prev,
          {
            id: `fallen-${Date.now()}-${Math.random()}`,
            wallet: prevKing.wallet,
            timestamp: Date.now(),
          },
        ]);
      }

      const newKing = {
        id: `king-${buyerWallet}-${signature || Date.now()}`,
        wallet: buyerWallet,
        buyAmountSol: Number(amount.toFixed(3)),
        crownedAt: timestamp || Date.now(),
        signature: signature || null,
      };

      try {
        localStorage.setItem('crowned_king_data', JSON.stringify(newKing));
      } catch (e) {}

      return newKing;
    });

    // 2. Reset 60s Timer
    setTimerSeconds(60.0);

    // 3. Add 0.30% Creator Fee to prize pot
    const feeAdded = amount * 0.0030;
    setAccumulatedFeesSol((prev) => {
      const updated = Number((prev + feeAdded).toFixed(4));
      try {
        localStorage.setItem('crowned_accumulated_fees', String(updated));
      } catch (e) {}
      return updated;
    });

    // 4. Sound & Dethrone Effects
    soundManager?.playBuyChime?.();
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.55 },
      colors: ['#ffd166', '#00f5d4', '#ff0055', '#7209b7'],
    });
  };

  const handleRemoveFallenKing = (id) => {
    setFallenKings((prev) => prev.filter((k) => k.id !== id));
  };

  // 🧭 Slug Routing & Admin Modal State
  const [currentSlug, setCurrentSlug] = useState(() => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return (path === '/pukinginamo' || window.location.hash === '#/pukinginamo') ? '/pukinginamo' : '/';
  });
  const [isAdminOpen, setIsAdminOpen] = useState(() => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return path === '/pukinginamo' || window.location.hash === '#/pukinginamo';
  });
  const [isSecretUnlocked, setIsSecretUnlocked] = useState(() => {
    return localStorage.getItem('secret_admin_unlocked') === 'true';
  });


  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.replace(/\/+$/, '') || '/';
      if (path === '/pukinginamo' || window.location.hash === '#/pukinginamo') {
        setCurrentSlug('/pukinginamo');
        setIsAdminOpen(true);
      } else {
        setCurrentSlug('/');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // 🔑 Secret console method: pukinginamo("fuckyou")
  useEffect(() => {
    window.pukinginamo = (passphrase) => {
      if (passphrase === 'fuckyou') {
        localStorage.setItem('secret_admin_unlocked', 'true');
        setIsSecretUnlocked(true);
        setIsAdminOpen(true);
        console.log(
          '%c[🔓 SECRET ADMIN UNLOCKED] Press "y" at any time to open/toggle the Admin Control Panel!',
          'background: #111; color: #ffd700; font-size: 14px; font-weight: bold; padding: 8px 14px; border-radius: 8px; border: 1.5px solid #ffd700;'
        );
        return '🔓 Secret Admin unlocked! Press "y" anytime to toggle the panel.';
      } else {
        console.warn('❌ Invalid passphrase.');
        return '❌ Access denied: Invalid passphrase.';
      }
    };
  }, []);

  // ⌨️ 'y' Hotkey listener to open Admin Panel once unlocked
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if currently typing in an input, textarea, or contentEditable element
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.key === 'y' || e.key === 'Y') {
        if (isSecretUnlocked || localStorage.getItem('secret_admin_unlocked') === 'true') {
          e.preventDefault();
          setIsAdminOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSecretUnlocked]);

  const navigateTo = (slug) => {
    window.history.pushState({}, '', slug);
    setCurrentSlug(slug);
    if (slug === '/pukinginamo') {
      setIsAdminOpen(true);
    }
  };

  // Spawn dynamic 3D Hopper NPC on live buy event
  const spawnNpc = useCallback((solAmount, walletStr = null, spawnTime = Date.now()) => {
    const randomHex = Math.random().toString(36).substring(2, 6);
    const fullWallet = walletStr || `${randomHex}Sol${Math.random().toString(36).substring(2, 12)}pump`;
    const shortWallet = `${fullWallet.slice(0, 4)}...${fullWallet.slice(-4)}`;

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 14 + 2;
    const posX = Math.cos(angle) * radius;
    const posZ = Math.sin(angle) * radius;

    const skinIndex = solAmount >= 5.0 ? 5 : solAmount >= 2.0 ? 6 : Math.floor(Math.random() * 11);

    const newNpc = {
      id: `npc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      wallet: shortWallet,
      fullWallet,
      solAmount: Number(solAmount),
      skinIndex,
      initialPosition: [posX, 0, posZ],
      spawnTimestamp: spawnTime,
      bonusMinutes: 0,
    };

    setNpcs((prev) => {
      const list = [...prev, newNpc];
      if (list.length > 30) return list.slice(list.length - 30);
      return list;
    });
  }, []);

  // Stable ref for live SOL/USD price so price ticks never teardown WebSocket listeners
  const solUsdPriceRef = useRef(settings.solUsdPrice || 119.1);
  useEffect(() => {
    if (settings.solUsdPrice && settings.solUsdPrice > 0) {
      solUsdPriceRef.current = settings.solUsdPrice;
    }
  }, [settings.solUsdPrice]);

  // Solana Connection setup with Helius fallback
  const connection = useMemo(() => {
    return createSolanaConnection(settings.heliusApiKey);
  }, [settings.heliusApiKey]);

  // Real-time trade handler
  const handleLiveTrade = useCallback((tradeEvent) => {
    const solAmount = Number(tradeEvent.solAmount) || 0.1;
    const traderWallet = tradeEvent.traderPublicKey;
    const txType = tradeEvent.txType || 'buy';
    const solPrice = solUsdPriceRef.current || 119.1;

    const shortWallet = traderWallet ? `${traderWallet.slice(0, 4)}...${traderWallet.slice(-4)}` : 'Anon';

    const newTrade = {
      id: `t-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      wallet: shortWallet,
      fullWallet: traderWallet,
      solAmount,
      usdValue: (solAmount * solPrice).toLocaleString(undefined, { maximumFractionDigits: 0 }),
      txType,
      timeAgo: 'Just now',
    };

    setTrades((prev) => [newTrade, ...prev.slice(0, 19)]);

    // Add 0.30% Creator Reward Fee from this live trade to the prize pot
    const tradeCreatorFee = solAmount * 0.0030;
    setAccumulatedFeesSol((prev) => {
      const updated = Number((prev + tradeCreatorFee).toFixed(4));
      try {
        localStorage.setItem('crowned_accumulated_fees', String(updated));
      } catch (e) {}
      return updated;
    });

    if ((txType === 'buy' || txType === 'BUY') && solAmount >= 0.25) {
      // 👑 Automatic King Dethroning on >= 0.25 SOL Buy!
      dethroneKing(traderWallet || shortWallet, solAmount, tradeEvent.signature, tradeEvent.timestamp);
    }

    if (txType === 'buy' && solAmount >= (settings.minSpawnSol || 0.01)) {
      setNpcs((prev) => {
        const existingIdx = prev.findIndex(
          (n) => n.fullWallet === traderWallet || (traderWallet && n.wallet === shortWallet)
        );
        if (existingIdx !== -1) {
          const updated = [...prev];
          const curr = updated[existingIdx];
          updated[existingIdx] = {
            ...curr,
            solAmount: Number((curr.solAmount + solAmount).toFixed(2)),
          };
          return updated;
        }

        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 60 + 45;
        const posX = Math.cos(angle) * radius;
        const posZ = Math.sin(angle) * radius;
        const skinIndex = solAmount >= 5.0 ? 5 : solAmount >= 2.0 ? 6 : Math.floor(Math.random() * 11);

        const newNpc = {
          id: `npc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          wallet: shortWallet,
          fullWallet: traderWallet || `${shortWallet}pump`,
          solAmount: Number(solAmount),
          skinIndex,
          initialPosition: [posX, 0, posZ],
          spawnTimestamp: tradeEvent.timestamp || Date.now(),
          bonusMinutes: 0,
          growthRatePerMin: 1.5,
          targetInches: 69.0,
        };
        const list = [newNpc, ...prev];
        return list.length > 30 ? list.slice(0, 30) : list;
      });

      if (solAmount >= 5.0) {
        soundManager.playWhaleFanfare();
      } else {
        soundManager.playBuyChime();
      }
    }
  }, [settings.minSpawnSol, crownedKing]);

  // Subscribe to live Pump bonding curve updates, trades & holders (Restarts on CA change)
  useEffect(() => {
    const rawMint = settings.mintAddress ? settings.mintAddress.trim() : '';
    if (!rawMint || !isValidPublicKey(rawMint)) {
      setNpcs([]);
      setTrades([]);
      setHolders([]);
      setMarketCapData({
        mcapUsd: 0,
        mcapSol: 0,
        priceInSol: 0,
        migrationProgress: 0,
        solUsdPrice: solUsdPriceRef.current || 155,
      });
      return;
    }

    // Clear previous trades, holders & hoppers on CA switch
    setTrades([]);
    setHolders([]);
    setNpcs([]);

    // Instant snapshot for immediate UI feedback (< 50ms) on CA switch
    fetchLiveMarketCapSnapshot(rawMint, solUsdPriceRef.current).then((snap) => {
      if (snap) {
        setMarketCapData((prev) => ({ ...prev, ...snap }));
        if (snap.creatorFeesSol && snap.creatorFeesSol > 0) {
          setAccumulatedFeesSol(snap.creatorFeesSol);
          try {
            localStorage.setItem('crowned_accumulated_fees', String(snap.creatorFeesSol));
          } catch (e) {}
        }
      }
    });

    // Seed recent on-chain transactions for Transaction Leaderboard
    fetchRecentTrades(connection, rawMint, settings.heliusApiKey, solUsdPriceRef.current).then((recentTxs) => {
      if (recentTxs && recentTxs.length > 0) {
        setTrades(recentTxs);
      }
    });

    const hasDedicatedWs = Boolean(settings.heliusApiKey && settings.heliusApiKey.trim());

    // 1. Subscribe to bonding curve account changes (< 200ms latency)
    const unsubscribeCurve = subscribeBondingCurve(
      connection,
      settings.mintAddress,
      (decoded) => {
        setMarketCapData((prev) => ({
          ...prev,
          ...decoded,
        }));
      },
      () => solUsdPriceRef.current,
      hasDedicatedWs
    );

    // 2. Subscribe to real-time trades stream via WebSocket (< 100ms latency)
    const unsubscribeTrades = subscribeRealtimeTrades(
      connection,
      settings.mintAddress,
      handleLiveTrade,
      () => solUsdPriceRef.current
    );

    // 3. Fetch real on-chain holders and repopulate 3D Hopper NPCs
    const updateHolders = () => {
      fetchTopHolders(connection, settings.mintAddress, 0.001, marketCapData.mcapSol || 30).then((res) => {
        if (res) {
          const validHolders = res.filter(
            (h) => (h.percentage || 0) > 0 && (h.holdingAmount || 0) > 0
          );
          setHolders(validHolders);

          // Synchronize 3D hoppers based strictly on positive-balance holders
          setNpcs((prevNpcs) => {
            if (validHolders.length === 0) return [];
            return validHolders.slice(0, 20).map((h, i) => {
              const angle = (i / Math.min(validHolders.length, 20)) * Math.PI * 2 + (i % 2) * 0.3;
              const dist = 3.5 + (i % 4) * 3.8;
              const skinIndex =
                i === 0 ? 5 // 24K Gold for Whale #1
                : i === 1 ? 6 // Diamond Hands for #2
                : i === 2 ? 10 // Royal Purple for #3
                : (i * 2 + 1) % 11;

              const existing = prevNpcs.find(
                (p) => p.fullWallet === h.fullAddress || p.wallet === h.address
              );

              return {
                id: `npc-${h.fullAddress || h.address}`,
                wallet: h.address,
                fullWallet: h.fullAddress,
                solAmount: Number(Math.max(0.01, h.solValue || (h.percentage / 100) * 30).toFixed(3)),
                holdingAmount: h.holdingAmount,
                percentage: h.percentage,
                skinIndex: existing ? existing.skinIndex : skinIndex,
                initialPosition: existing
                  ? existing.initialPosition
                  : [Math.cos(angle) * dist, 0, Math.sin(angle) * dist],
                spawnTimestamp: existing
                  ? existing.spawnTimestamp
                  : Date.now(),
                bonusMinutes: existing ? existing.bonusMinutes : 0,
                growthRatePerMin: 1.5,
                targetInches: 69.0,
              };
            });
          });
        }
      });
    };

    // 4. Legitimately fetch the last qualified >= 0.25 SOL on-chain buyer for this token
    const updateQualifiedKing = () => {
      fetchLastQualifiedBuyer(connection, settings.mintAddress, 0.25, settings.heliusApiKey).then((qualifiedBuyer) => {
        if (qualifiedBuyer && qualifiedBuyer.wallet) {
          setCrownedKing((current) => {
            const isDifferent =
              !current ||
              current.wallet !== qualifiedBuyer.wallet ||
              (qualifiedBuyer.signature && current.signature !== qualifiedBuyer.signature);

            if (isDifferent) {
              // Trigger dethroning animation & push old king to fallen kings queue
              if (current && current.wallet && current.wallet !== qualifiedBuyer.wallet) {
                setFallenKings((prev) => [
                  ...prev,
                  {
                    id: `fallen-${Date.now()}-${Math.random()}`,
                    wallet: current.wallet,
                    timestamp: Date.now(),
                  },
                ]);
              }

              // Reset timer to 60s
              setTimerSeconds(60.0);
              soundManager?.playBuyChime?.();

              const newKingData = {
                id: `king-${qualifiedBuyer.wallet}-${qualifiedBuyer.signature || Date.now()}`,
                wallet: qualifiedBuyer.wallet,
                buyAmountSol: qualifiedBuyer.buyAmountSol || 0.25,
                crownedAt: qualifiedBuyer.timestamp || Date.now(),
                signature: qualifiedBuyer.signature || null,
              };

              try {
                localStorage.setItem('crowned_king_data', JSON.stringify(newKingData));
              } catch (e) {}

              return newKingData;
            }
            return current;
          });
        }
      });
    };

    updateHolders();
    updateQualifiedKing();
    const holderInterval = setInterval(updateHolders, 25000);
    const kingSyncInterval = setInterval(updateQualifiedKing, 3000);
    const feeSyncInterval = setInterval(refreshVolumeAndFees, 3000);

    return () => {
      if (unsubscribeCurve) unsubscribeCurve();
      if (unsubscribeTrades) unsubscribeTrades();
      clearInterval(holderInterval);
      clearInterval(kingSyncInterval);
      clearInterval(feeSyncInterval);
    };
  }, [connection, settings.mintAddress, settings.heliusApiKey, handleLiveTrade]);

  // Expose showFull() command for browser console debugging
  useEffect(() => {
    window.showFull = () => {
      console.table(holders.map((h) => ({ Address: h.fullAddress, Pct: `${h.percentage}%`, Sol: `${h.solValue} SOL`, Tier: h.tier })));
      return `Displaying ${holders.length} real wallet holders.`;
    };
  }, [holders]);

  // 🔄 Sync shared global settings & live SOL/USD price across all clients and devices
  useEffect(() => {
    let isMounted = true;
    
    // Fetch live SOL/USD price periodically
    const updateSolPrice = async () => {
      const price = await fetchLiveSolPrice();
      if (isMounted && price > 0) {
        setSettings((prev) => (prev.solUsdPrice === price ? prev : { ...prev, solUsdPrice: price }));
        setMarketCapData((prev) => ({
          ...prev,
          solUsdPrice: price,
          mcapUsd: prev.mcapSol ? prev.mcapSol * price : prev.mcapUsd,
        }));
      }
    };

    updateSolPrice();
    const solInterval = setInterval(updateSolPrice, 10000);

    const syncSettings = async () => {
      const latest = await fetchSharedSettings();
      if (isMounted && latest) {
        setSettings((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(latest)) {
            return latest;
          }
          return prev;
        });
      }
    };

    syncSettings();
    const interval = setInterval(syncSettings, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      clearInterval(solInterval);
    };
  }, []);

  // Listen to cross-tab Broadcast updates
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('dickcoin_broadcast_channel');
    channel.onmessage = (event) => {
      if (event.data?.type === 'SETTINGS_UPDATE' && event.data.payload) {
        setSettings(event.data.payload);
      }
    };
    return () => channel.close();
  }, []);

  // 🏆 Prize Pool & Race Parameters
  const winners = settings.prizePoolWinners || [];
  const targetInches = Number(settings.prizePoolTargetInches) || 69.0;
  const growthRate = Number(settings.growthRateInchesPerMin) || 1.5;
  const prizePoolSol = Number(settings.prizePoolSol) || 5.0;
  const isPrizePoolEnabled = settings.prizePoolEnabled !== false;

  // 🏁 Winner Detection Loop
  useEffect(() => {
    if (!isPrizePoolEnabled) return;
    if (winners.length >= 5) return;

    let hasNewWinner = false;
    let updatedWinners = [...winners];

    npcs.forEach((npc) => {
      if (updatedWinners.length >= 5) return;
      const alreadyWon = updatedWinners.some((w) => w.wallet === npc.wallet || w.id === npc.id);
      if (alreadyWon) return;

      const totalInches = calculateTotalInches(
        npc.solAmount,
        npc.spawnTimestamp,
        growthRate,
        npc.bonusMinutes || 0
      );

      if (totalInches >= targetInches) {
        const rank = updatedWinners.length + 1;
        const payout = calculatePrizePayout(prizePoolSol, rank, settings.prizePoolDistribution);
        const newWinner = {
          id: npc.id,
          wallet: npc.wallet,
          fullWallet: npc.fullWallet,
          rank,
          prizeSol: payout.solAmount,
          percentage: payout.percentage,
          inches: totalInches,
          wonAt: Date.now(),
        };

        updatedWinners.push(newWinner);
        hasNewWinner = true;

        // Victory celebration!
        confetti({
          particleCount: 160,
          spread: 120,
          origin: { y: 0.5 },
          colors: ['#ffd700', '#ff007f', '#00e5ff', '#ffffff'],
        });
        soundManager.playWinnerFanfare();
      }
    });

    if (hasNewWinner) {
      const newSettings = { ...settings, prizePoolWinners: updatedWinners };
      setSettings(newSettings);
      saveProjectSettings(newSettings);
    }
  }, [npcs, winners, targetInches, growthRate, prizePoolSol, isPrizePoolEnabled, settings]);

  // ⏱️ 30-Minute Prize Pool Countdown Timer (Restarts when CA is updated)
  const THIRTY_MINUTES_MS = 30 * 60 * 1000;
  const [caTimerLeftMs, setCaTimerLeftMs] = useState(THIRTY_MINUTES_MS);

  useEffect(() => {
    const mintKey = settings.mintAddress ? settings.mintAddress.trim() : 'default_mint';
    const storageKey = `dick_ca_timer_${mintKey}`;

    let startTime = Number(localStorage.getItem(storageKey));
    if (!startTime || isNaN(startTime)) {
      startTime = Date.now();
      localStorage.setItem(storageKey, String(startTime));
    }

    const updateTimer = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, THIRTY_MINUTES_MS - elapsed);
      setCaTimerLeftMs(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [settings.mintAddress]);

  const timerMinutes = Math.floor(caTimerLeftMs / 60000);
  const caSeconds = Math.floor((caTimerLeftMs % 60000) / 1000);
  const formattedTimer = `${timerMinutes.toString().padStart(2, '0')}:${caSeconds.toString().padStart(2, '0')}`;

  // Enriched NPCs with winner details and race params
  const enrichedNpcs = useMemo(() => {
    return npcs.map((npc) => {
      const winner = winners.find((w) => w.id === npc.id || w.wallet === npc.wallet);
      return {
        ...npc,
        growthRatePerMin: growthRate,
        targetInches: targetInches,
        winnerInfo: winner || null,
      };
    });
  }, [npcs, winners, growthRate, targetInches]);

  // Fast forward holding time (+5 minutes) for all active NPCs
  const handleBoostHodlTime = () => {
    setNpcs((prev) =>
      prev.map((npc) => ({
        ...npc,
        bonusMinutes: (npc.bonusMinutes || 0) + 5,
      }))
    );
    soundManager.playBuyChime();
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#ffd700', '#ff007f'],
    });
  };

  const handleClearNpcs = () => {
    setNpcs([]);
  };

  return (
    <div className="app-container">
      {/* 3D WebGL Scene with Crown Mountain & Walking Contender NPCs */}
      <Scene3D
        npcs={enrichedNpcs}
        selectedNpcId={selectedNpc?.id || null}
        onSelectNpc={(npc) => setSelectedNpc(npc)}
        arenaRadius={140}
        overallScale={overallScale}
        groundOffset={groundOffset}
        tagOffsetY={tagOffsetY}
        tagScale={tagScale}
        crownedKing={crownedKing}
        timerSeconds={timerSeconds}
        timerDuration={timerDuration}
        accumulatedFeesSol={accumulatedFeesSol}
        fallenKings={fallenKings}
        onRemoveFallenKing={handleRemoveFallenKing}
      />

      {/* 👑 Top Center CROWNED HUD */}
      <div className="top-crowned-hud">
        <div className="crowned-hud-card">
          {/* 1. Crown & Active King Section */}
          <div className="crowned-hud-main">
            <div className="crowned-hud-crown">👑</div>
            <div className="crowned-hud-info">
              <div className="crowned-hud-title-row">
                <span className="crowned-hud-title">CROWNED</span>
                <span className="crowned-hud-badge">60s REIGN</span>
              </div>
              <div className="crowned-hud-details">
                <span className="crowned-king-wallet" title={crownedKing?.wallet}>
                  {crownedKing?.wallet ? `${crownedKing.wallet.slice(0, 4)}...${crownedKing.wallet.slice(-4)}` : 'Waiting for King...'}
                </span>
                <span className="crowned-hud-dot">•</span>
                <span className="crowned-buy-tag">🔥 {crownedKing?.buyAmountSol || 0.25} SOL</span>
              </div>
            </div>
          </div>

          <div className="crowned-hud-divider" />

          {/* 2. 60-Second Countdown Timer Box */}
          <div className="crowned-hud-timer-box">
            <span className="crowned-timer-num">{timerSeconds.toFixed(1)}s</span>
            <div className="crowned-timer-track">
              <div
                className={`crowned-timer-fill ${timerSeconds <= 15 ? 'urgent' : ''}`}
                style={{ width: `${Math.max(0, Math.min(100, (timerSeconds / timerDuration) * 100))}%` }}
              />
            </div>
          </div>

          <div className="crowned-hud-divider" />

          {/* 3. Bounty Fee Pool (0.30% Creator Fees) */}
          <div className="crowned-hud-bounty">
            <span className="crowned-bounty-label">0.30% Creator Rewards:</span>
            <div className="crowned-bounty-vals-row">
              <span className="crowned-bounty-val">◎ {accumulatedFeesSol.toFixed(3)} SOL</span>
              <span className="crowned-bounty-usd">≈ ${(accumulatedFeesSol * (marketCapData.solUsdPrice || 119.5)).toFixed(2)}</span>
            </div>
          </div>

          {/* 4. Dethrone Action CTA Button */}
          <button
            type="button"
            className="btn-dethrone-cta"
            onClick={() => setIsChallengeModalOpen(true)}
            title="Buy 0.25+ SOL to Dethrone and Get Crowned"
          >
            <span>⚡</span>
            <span>Dethrone & Crown (0.25+ SOL)</span>
          </button>
        </div>
      </div>

      {/* 🎥 Floating Camera Focus Indicator with Unfocus action */}
      {selectedNpc && (
        <div
          className="camera-focus-banner"
          onClick={() => setSelectedNpc(null)}
          title="Click to unfocus camera"
        >
          <span className="camera-focus-icon">🎥</span>
          <span className="camera-focus-text">
            Following <span className="camera-focus-wallet">{selectedNpc.wallet}</span>
          </span>
          <button className="btn-unfocus-pill">✕ Unfocus</button>
        </div>
      )}

      {/* 🧭 Interactive 3D Camera Controls Hint */}
      <CameraHint />

      {/* 🚀 Floating Bottom Center Dock (CA + Copy, Pump.fun, About) */}
      <BottomDock
        settings={settings}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      {/* ℹ️ How It Works / About Modal */}
      {isAboutOpen && (
        <InfoModal onClose={() => setIsAboutOpen(false)} />
      )}

      {/* 👑 Challenge / Dethrone King Modal */}
      <ChallengeKingModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        walletAddress={walletAddress}
        isConnecting={isWalletConnecting}
        onConnectWallet={connectWallet}
        onDethroneKing={dethroneKing}
        crownedKing={crownedKing}
        timerSeconds={timerSeconds}
        accumulatedFeesSol={accumulatedFeesSol}
        settings={settings}
      />

      {/* 🔐 Admin Control Modal (Phantom Gated on /pukinginamo slug or 'y' shortcut) */}
      {(currentSlug === '/pukinginamo' || isAdminOpen) && (
        <AdminModal
          settings={settings}
          onSaveSettings={(newSettings) => setSettings(newSettings)}
          onClose={() => {
            setIsAdminOpen(false);
            if (currentSlug === '/pukinginamo') navigateTo('/');
          }}
        />
      )}
    </div>
  );
}
