import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Scene3D } from './components/3d/Scene3D';
import Counter from './components/ui/Counter';
import { TradeFeed } from './components/ui/TradeFeed';
import { BottomDock } from './components/ui/BottomDock';
import { AdminModal } from './components/ui/AdminModal';
import { InfoModal } from './components/ui/InfoModal';
import { createSolanaConnection } from './solana/heliusConnection';
import { subscribeBondingCurve, subscribeRealtimeTrades, fetchTopHolders, fetchLiveSolPrice, fetchLiveMarketCapSnapshot } from './solana/pumpTracker';
import { isValidPublicKey } from './solana/bondingCurve';
import { getProjectSettings, fetchSharedSettings, saveProjectSettings } from './solana/phantomAuth';
import {
  calculateTotalInches,
  calculatePrizePayout,
  formatInches,
  inchesToCm,
  formatHodlDuration,
} from './solana/growthMechanics';
import { soundManager } from './audio/soundEffects';

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
  const overallScale = 7.5;
  const groundOffset = 0.2;
  const sunPosition = [-2.0, 26.0, 32.0];
  const sunRotation = [0, 0, 0];
  const sunScale = 1.0;
  const rainbowPosition = [-29.5, -1.5, -47.5];
  const rainbowRotation = [1.57, 0.17, -0.7];
  const rainbowRadius = 33.0;

  // Locked Tag & Crown Offsets
  const tagOffsetY = -0.26;
  const tagScale = 1.60;
  const crownOffsetY = -0.18;
  const crownScale = 0.0090;

  const [marketCapData, setMarketCapData] = useState({
    mcapUsd: 0,
    mcapSol: 0,
    priceInSol: 0,
    migrationProgress: 0,
    solUsdPrice: settings.solUsdPrice || 155,
  });

  const [selectedNpc, setSelectedNpc] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

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
  const [isPrizeCollapsed, setIsPrizeCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  });
  // ℹ️ Open Info / About modal by default on initial site launch
  const [isInfoOpen, setIsInfoOpen] = useState(true);

  // 🎵 Background Audio Auto-play on user gesture / mount
  useEffect(() => {
    soundManager.playBgm();

    const handleFirstGesture = () => {
      soundManager.playBgm();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('touchstart', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  const handleToggleMute = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsPrizeCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        const radius = Math.random() * 14 + 2;
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
  }, [settings.minSpawnSol]);

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

    updateHolders();
    const holderInterval = setInterval(updateHolders, 25000);

    return () => {
      if (unsubscribeCurve) unsubscribeCurve();
      if (unsubscribeTrades) unsubscribeTrades();
      clearInterval(holderInterval);
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
  const timerSeconds = Math.floor((caTimerLeftMs % 60000) / 1000);
  const formattedTimer = `${timerMinutes.toString().padStart(2, '0')}:${timerSeconds.toString().padStart(2, '0')}`;

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
      {/* 3D WebGL Scene with Hopping Dick NPCs */}
      <Scene3D
        npcs={enrichedNpcs}
        selectedNpcId={selectedNpc?.id || null}
        onSelectNpc={(npc) => setSelectedNpc(npc)}
        arenaRadius={28}
        overallScale={overallScale}
        groundOffset={groundOffset}
        tagOffsetY={tagOffsetY}
        tagScale={tagScale}
        crownOffsetY={crownOffsetY}
        crownScale={crownScale}
        sunPosition={sunPosition}
        sunRotation={sunRotation}
        sunScale={sunScale}
        rainbowPosition={rainbowPosition}
        rainbowRotation={rainbowRotation}
        rainbowRadius={rainbowRadius}
      />

      {/* 💰 Top Center Floating Pure Text Market Cap with Smooth Counter */}
      <div className="top-center-mcap-display">
        <div className="mcap-hero-val">
          <span className="mcap-hero-dollar">$</span>
          <Counter
            value={Math.round(marketCapData?.mcapUsd ?? 0)}
            fontSize={56}
            padding={0}
            gap={1}
            textColor="#ffffff"
            fontWeight={900}
            counterStyle={{
              fontFamily: "'Fredoka', 'Titan One', 'Outfit', sans-serif",
              letterSpacing: '-0.02em',
            }}
          />
        </div>
        <div className="mcap-hero-subtitle">
          MC
        </div>
      </div>

      {/* 🏆 Top Right Pulsing Prize Pool Widget (Admin Configurable & Mobile Collapsible) */}
      {settings.prizePoolEnabled !== false && (
        <div
          className={`top-right-prize-badge ${isPrizeCollapsed ? 'mobile-collapsed' : ''}`}
          onClick={() => setIsPrizeCollapsed((prev) => !prev)}
          title="Tap to toggle Prize Pool details"
        >
          <div className="prize-amount-row">
            <span className="prize-trophy">🏆</span>
            <span className="prize-amount-text">
              {settings.prizePoolSol ?? 5.0} SOL {isPrizeCollapsed ? '' : 'PRIZE POOL'}
            </span>
            {isPrizeCollapsed && (
              <span className="prize-timer-val font-mono compact">{formattedTimer}</span>
            )}
          </div>
          {!isPrizeCollapsed && (
            <>
              <div className="prize-headline-text">
                {settings.prizePoolHeadline || 'Top 10 biggest dicks wins!'}
              </div>
              <div className="prize-timer-row">
                <span className="prize-timer-icon">⏱️</span>
                <span className="prize-timer-label">Ends in</span>
                <span className="prize-timer-val font-mono">{formattedTimer}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* UI Widgets Overlay */}
      <div className="ui-overlay">
        {/* Left HUD: Dedicated Leaderboard */}
        <div className="ui-left">
          <TradeFeed
            npcs={enrichedNpcs}
            selectedNpcId={selectedNpc?.id || null}
            onSelectNpc={(npc) => setSelectedNpc(npc)}
          />
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

      {/* 🚀 Floating Bottom Center Dock (CA + Copy, X, Telegram, Pump.fun, Mute, Info, Admin) */}
      <BottomDock
        settings={settings}
        onOpenInfo={() => setIsInfoOpen(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* ℹ️ How It Works & Token Mechanics Modal */}
      {isInfoOpen && (
        <InfoModal onClose={() => setIsInfoOpen(false)} />
      )}

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
