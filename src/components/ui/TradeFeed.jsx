import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { calculateTotalInches } from '../../solana/growthMechanics';

export function TradeFeed({
  npcs = [],
  selectedNpcId = null,
  onSelectNpc,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sortedCitizens = useMemo(() => {
    return [...npcs]
      .map((npc) => {
        const totalInches = calculateTotalInches(npc.solAmount);
        return {
          ...npc,
          totalInches,
        };
      })
      .sort((a, b) => b.solAmount - a.solAmount);
  }, [npcs]);

  const filteredCitizens = useMemo(() => {
    if (!searchQuery.trim()) return sortedCitizens;
    const q = searchQuery.trim().toLowerCase();
    return sortedCitizens.filter((h) => {
      const shortW = (h.wallet || '').toLowerCase();
      const fullW = (h.fullWallet || '').toLowerCase();
      const id = (h.id || '').toLowerCase();
      return shortW.includes(q) || fullW.includes(q) || id.includes(q);
    });
  }, [sortedCitizens, searchQuery]);

  if (isCollapsed) {
    return (
      <div
        className="neo-mobile-pill"
        onClick={() => setIsCollapsed(false)}
        title="Tap to open Citizens' List"
      >
        <span className="neo-pill-badge">TOWN</span>
        <span className="neo-pill-title">CITIZENS</span>
        <span className="neo-pill-count">{sortedCitizens.length}</span>
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
            <h3 className="neo-header-title">🏘️ CITIZENS</h3>
            <span className="neo-live-tag">PUMPTOWN</span>
          </div>
          <div className="neo-actions-group">
            <span className="neo-count-badge">{sortedCitizens.length}</span>
            <button
              className="neo-collapse-btn"
              onClick={() => setIsCollapsed(true)}
              title="Collapse Citizens' List"
            >
              <ChevronUp size={18} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* 🔍 Search Box */}
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

      {/* 📋 Scrollable Citizens List */}
      <div className="neo-growers-list custom-scrollbar">
        {filteredCitizens.length === 0 ? (
          <div className="neo-empty-state">
            <div className="neo-empty-icon">🏗️</div>
            <span className="neo-empty-title">
              {searchQuery ? 'NO MATCHES FOUND' : 'WAITING FOR CITIZENS...'}
            </span>
            <span className="neo-empty-sub">
              BUY ON PUMP.FUN TO BUILD IN PUMPTOWN!
            </span>
          </div>
        ) : (
          filteredCitizens.slice(0, 30).map((citizen, idx) => {
            const isSelected =
              Boolean(selectedNpcId) &&
              (selectedNpcId === citizen.id ||
                selectedNpcId === citizen.wallet ||
                selectedNpcId === citizen.fullWallet);

            const rankNum = idx + 1;
            const rankClass =
              rankNum === 1 ? 'neo-rank-1' : rankNum === 2 ? 'neo-rank-2' : rankNum === 3 ? 'neo-rank-3' : 'neo-rank-std';

            return (
              <div
                key={citizen.id || idx}
                className={`neo-row ${rankClass} ${isSelected ? 'neo-selected-row' : ''}`}
                onClick={() => {
                  if (onSelectNpc) {
                    onSelectNpc(isSelected ? null : citizen);
                  }
                }}
                title={isSelected ? 'Click to unfocus camera' : 'Click to focus camera on this citizen'}
              >
                {/* 1. Rank Box */}
                <div className="neo-rank-badge">
                  #{rankNum}
                </div>

                {/* 2. Wallet Address */}
                <div className="neo-row-main">
                  <div className="neo-wallet-row">
                    <span className="neo-wallet-text">{citizen.wallet}</span>
                  </div>
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
