import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { calculateTotalInches, formatInches, formatMm } from '../../solana/growthMechanics';

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

  // Sort active hoppers dynamically by length
  const sortedHoppers = useMemo(() => {
    return [...npcs]
      .map((npc) => {
        const totalInches = calculateTotalInches(npc.solAmount);
        return {
          ...npc,
          totalInches,
        };
      })
      .sort((a, b) => b.totalInches - a.totalInches);
  }, [npcs]);

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

  // Collapsed Mobile floating toggle pill (Neo-brutalist)
  if (isCollapsed) {
    return (
      <div
        className="neo-mobile-pill"
        onClick={() => setIsCollapsed(false)}
        title="Tap to open Growers' List"
      >
        <span className="neo-pill-badge">LIST</span>
        <span className="neo-pill-title">GROWERS' LIST</span>
        <span className="neo-pill-count">{sortedHoppers.length}</span>
        <ChevronDown size={18} strokeWidth={3} className="neo-pill-arrow" />
      </div>
    );
  }

  return (
    <div className="neo-growers-container">
      {/* 🏷️ Neo-brutalist Header Bar */}
      <div className="neo-growers-header">
        <div className="neo-header-top">
          <div className="neo-title-group">
            <h3 className="neo-header-title">GROWERS' LIST</h3>
            <span className="neo-live-tag">LIVE</span>
          </div>
          <div className="neo-actions-group">
            <span className="neo-count-badge">{sortedHoppers.length}</span>
            <button
              className="neo-collapse-btn"
              onClick={() => setIsCollapsed(true)}
              title="Collapse Growers' List"
            >
              <ChevronUp size={18} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* 🔍 Neo-brutalist Search Box */}
        <div className="neo-search-wrap">
          <Search size={16} strokeWidth={3} className="neo-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH WALLET..."
            className="neo-search-input"
            autoComplete="off"
            spellCheck={false}
          />
          {searchQuery && (
            <button
              type="button"
              className="neo-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={15} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* 📋 Scrollable Growers List */}
      <div className="neo-growers-list custom-scrollbar">
        {filteredHoppers.length === 0 ? (
          <div className="neo-empty-state">
            <div className="neo-empty-icon">⏳</div>
            <span className="neo-empty-title">
              {searchQuery ? 'NO MATCHES FOUND' : 'WAITING FOR BUYERS...'}
            </span>
            <span className="neo-empty-sub">
              BUY ON PUMP.FUN TO SPAWN IN ARENA!
            </span>
          </div>
        ) : (
          filteredHoppers.slice(0, 30).map((hopper, idx) => {
            const sol = Number(hopper.solAmount) || 0.01;
            const isSelected =
              Boolean(selectedNpcId) &&
              (selectedNpcId === hopper.id ||
                selectedNpcId === hopper.wallet ||
                selectedNpcId === hopper.fullWallet);
            const inchesStr = formatInches(hopper.totalInches);
            const mmStr = formatMm(hopper.totalInches);

            // Neo-brutalist Rank Tiers
            const rankNum = idx + 1;
            const rankClass =
              rankNum === 1 ? 'neo-rank-1' : rankNum === 2 ? 'neo-rank-2' : rankNum === 3 ? 'neo-rank-3' : 'neo-rank-std';

            return (
              <div
                key={hopper.id || idx}
                className={`neo-row ${rankClass} ${isSelected ? 'neo-selected-row' : ''}`}
                onClick={() => {
                  if (onSelectNpc) {
                    onSelectNpc(isSelected ? null : hopper);
                  }
                }}
                title={isSelected ? 'Click to unfocus camera' : 'Click to focus camera on this hopper'}
              >
                {/* 1. Rank Box */}
                <div className="neo-rank-badge">
                  #{rankNum}
                </div>

                {/* 2. Wallet & Volume */}
                <div className="neo-row-main">
                  <div className="neo-wallet-row">
                    <span className="neo-wallet-text">{hopper.wallet}</span>
                    {hopper.percentage ? (
                      <span className="neo-tier-badge">{hopper.percentage.toFixed(1)}%</span>
                    ) : null}
                  </div>
                  <div className="neo-buy-row">
                    <span className="neo-sol-badge">+{sol.toFixed(2)} SOL</span>
                  </div>
                </div>

                {/* 3. Measurement (Inches & MM) */}
                <div className="neo-size-box">
                  <span className="neo-inches-text">{inchesStr}</span>
                  <span className="neo-mm-text">{mmStr}</span>
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
