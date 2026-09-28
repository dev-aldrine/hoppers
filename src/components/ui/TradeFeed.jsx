import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { calculateTotalInches, formatInches, formatMm } from '../../solana/growthMechanics';
import GooeyInput from './GooeyInput';

export function TradeFeed({
  npcs = [],
  selectedNpcId = null,
  onSelectNpc,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  });

  // Automatically adapt to mobile screen resizing / orientation changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Live ticker to update millimeter and inch values in real time every 500ms
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000000);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Sort active hoppers dynamically by total current length
  const sortedHoppers = useMemo(() => {
    return [...npcs]
      .map((npc) => {
        const totalInches = calculateTotalInches(
          npc.solAmount,
          npc.spawnTimestamp,
          undefined,
          npc.bonusMinutes || 0
        );
        return {
          ...npc,
          totalInches,
        };
      })
      .sort((a, b) => b.totalInches - a.totalInches);
  }, [npcs, Date.now()]);

  // Filter hoppers based on search input
  const filteredHoppers = useMemo(() => {
    if (!searchQuery.trim()) return sortedHoppers;
    const q = searchQuery.trim().toLowerCase();
    return sortedHoppers.filter((h) => {
      const shortW = (h.wallet || '').toLowerCase();
      const fullW = (h.fullWallet || '').toLowerCase();
      const id = (h.id || '').toLowerCase();
      return shortW.includes(q) || fullW.includes(q) || id.includes(q);
    });
  }, [sortedHoppers, searchQuery]);

  // Collapsed Mobile floating toggle pill
  if (isCollapsed) {
    return (
      <div
        className="mobile-leaderboard-pill glass-panel"
        onClick={() => setIsCollapsed(false)}
        title="Tap to open Leaderboard"
      >
        <span className="mobile-pill-icon">🍆</span>
        <span className="mobile-pill-title">Leaderboard</span>
        <span className="mobile-pill-count">({sortedHoppers.length})</span>
        <ChevronDown size={16} className="mobile-pill-arrow" />
      </div>
    );
  }

  return (
    <div className="trade-feed-card glass-panel">
      <div className="card-header leaderboard-card-header">
        <div className="leaderboard-logo-row">
          <img
            src="/dickhoppers_logo.png"
            alt="DickHoppers"
            className="leaderboard-logo-img"
          />
        </div>
        <div className="leaderboard-title-row">
          <h3>Leaderboard</h3>
          <button
            className="leaderboard-collapse-btn"
            onClick={() => setIsCollapsed(true)}
            title="Collapse leaderboard"
          >
            <ChevronUp size={18} />
          </button>
        </div>

        {/* 🔍 Gooey Spring Search Input */}
        <GooeyInput
          placeholder="Search your dick"
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
      </div>

      <div className="trade-list custom-scrollbar">
        {filteredHoppers.length === 0 ? (
          <div className="empty-trades" style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {searchQuery ? 'No dicks match your search' : 'Waiting for hoppers to join the arena...'}
          </div>
        ) : (
          filteredHoppers.slice(0, 20).map((hopper, idx) => {
            const sol = Number(hopper.solAmount) || 0.01;
            const isWhale = sol >= 2.0;
            const isMega = sol >= 5.0;
            const isSelected =
              Boolean(selectedNpcId) &&
              (selectedNpcId === hopper.id ||
                selectedNpcId === hopper.wallet ||
                selectedNpcId === hopper.fullWallet);
            const inchesStr = formatInches(hopper.totalInches);
            const mmStr = formatMm(hopper.totalInches);

            return (
              <div
                key={hopper.id || idx}
                className={`trade-row ${isSelected ? 'selected-hopper-row' : ''} ${
                  isMega ? 'mega-whale-trade' : isWhale ? 'whale-trade' : ''
                }`}
                onClick={() => {
                  if (onSelectNpc) {
                    onSelectNpc(isSelected ? null : hopper);
                  }
                }}
                title={isSelected ? "Click to unfocus camera" : "Click to focus camera on this hopper's head"}
              >
                <div className="holder-rank-badge">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </div>

                <div className="trade-info">
                  <div className="trade-wallet-row">
                    <span className="trade-wallet font-mono font-bold">{hopper.wallet}</span>
                    {hopper.percentage ? (
                      <span className="holder-badge-tier">{hopper.percentage.toFixed(1)}%</span>
                    ) : null}
                  </div>
                  <div className="trade-sub-row">
                    <span className="trade-buy font-mono text-neon-cyan">+{sol.toFixed(2)} SOL</span>
                    {isMega ? (
                      <span className="trade-usd font-bold text-gold">👑 WHALE</span>
                    ) : isWhale ? (
                      <span className="trade-usd font-bold text-neon-cyan">🌟 CHAD</span>
                    ) : null}
                  </div>
                </div>

                <div className="trade-amount">
                  <span
                    className="size-badge font-mono font-bold"
                    style={{
                      color: '#39ff14',
                      textShadow: '0 0 10px rgba(57, 255, 20, 0.45)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    🍆 {inchesStr} <span className="cm-sub" style={{ color: '#39ff14', opacity: 0.9 }}>({mmStr})</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default TradeFeed;
