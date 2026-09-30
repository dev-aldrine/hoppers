import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, X, ExternalLink, Flame, Crown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Just now';
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}

export function TradeFeed({
  trades = [],
  npcs = [],
  crownedKing = null,
  selectedNpcId = null,
  onSelectNpc,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'crowned' | 'buys'
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  });
  const [, setTicker] = useState(0);

  // Periodic ticker to update "time ago" tags smoothly
  useEffect(() => {
    const interval = setInterval(() => setTicker((t) => t + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter & classify transactions
  const processedTrades = useMemo(() => {
    return trades.map((trade, idx) => {
      const isBuy = trade.txType === 'buy' || trade.txType === 'BUY';
      const solAmount = Number(trade.solAmount) || 0;
      const isQualifying = isBuy && solAmount >= 0.25;

      // Check if this trade belongs to current crown holder
      const isCurrentKing = Boolean(
        crownedKing &&
        crownedKing.wallet &&
        (trade.fullWallet === crownedKing.wallet || trade.wallet === crownedKing.wallet) &&
        (!trade.signature || !crownedKing.signature || trade.signature === crownedKing.signature)
      );

      return {
        ...trade,
        isBuy,
        solAmount,
        isQualifying,
        isCurrentKing,
        timeAgoStr: formatTimeAgo(trade.timestamp),
      };
    });
  }, [trades, crownedKing]);

  const filteredTrades = useMemo(() => {
    let list = processedTrades;

    if (filterTab === 'crowned') {
      list = list.filter((t) => t.isQualifying || t.isCurrentKing);
    } else if (filterTab === 'buys') {
      list = list.filter((t) => t.isBuy);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter((t) => {
      const shortW = (t.wallet || '').toLowerCase();
      const fullW = (t.fullWallet || '').toLowerCase();
      const sig = (t.signature || '').toLowerCase();
      return shortW.includes(q) || fullW.includes(q) || sig.includes(q);
    });
  }, [processedTrades, filterTab, searchQuery]);

  const qualifiedCount = useMemo(() => {
    return processedTrades.filter((t) => t.isQualifying).length;
  }, [processedTrades]);

  if (isCollapsed) {
    return (
      <div
        className="neo-mobile-pill tx-mobile-pill"
        onClick={() => setIsCollapsed(false)}
        title="Tap to open Live Transactions Leaderboard"
      >
        <span className="neo-pill-badge crown-gold">👑 CROWNED</span>
        <span className="neo-pill-title">TRANSACTIONS</span>
        <span className="neo-pill-count">{processedTrades.length}</span>
        <ChevronDown size={18} strokeWidth={3} className="neo-pill-arrow" />
      </div>
    );
  }

  return (
    <div className="tx-leaderboard-container">
      {/* 🏷️ Header Bar */}
      <div className="tx-leaderboard-header">
        <div className="tx-header-top">
          <div className="tx-title-group">
            <h3 className="tx-header-title">⚔️ TRANSACTIONS</h3>
            <span className="tx-crown-pill">👑 0.25+ CROWNED</span>
          </div>
          <div className="tx-actions-group">
            <span className="tx-count-badge" title="Total Recent Transactions">
              {processedTrades.length}
            </span>
            <button
              className="tx-collapse-btn"
              onClick={() => setIsCollapsed(true)}
              title="Collapse Leaderboard"
            >
              <ChevronUp size={18} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* 🎛️ Filter Tabs */}
        <div className="tx-tabs-row">
          <button
            type="button"
            className={`tx-tab-btn ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            ALL ({processedTrades.length})
          </button>
          <button
            type="button"
            className={`tx-tab-btn crown-tab ${filterTab === 'crowned' ? 'active' : ''}`}
            onClick={() => setFilterTab('crowned')}
          >
            👑 0.25+ BUYS ({qualifiedCount})
          </button>
          <button
            type="button"
            className={`tx-tab-btn ${filterTab === 'buys' ? 'active' : ''}`}
            onClick={() => setFilterTab('buys')}
          >
            🟢 BUYS
          </button>
        </div>

        {/* 🔍 Search Box */}
        <div className="tx-search-wrap">
          <Search size={15} strokeWidth={3} className="tx-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH WALLET / SIGNATURE..."
            className="tx-search-input"
            autoComplete="off"
            spellCheck={false}
          />
          {searchQuery && (
            <button
              type="button"
              className="tx-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={14} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* 📋 Scrollable Transactions List */}
      <div className="tx-leaderboard-list custom-scrollbar">
        {filteredTrades.length === 0 ? (
          <div className="tx-empty-state">
            <div className="tx-empty-icon">👑</div>
            <span className="tx-empty-title">
              {searchQuery ? 'NO MATCHES FOUND' : 'WAITING FOR LIVE TRADES...'}
            </span>
            <span className="tx-empty-sub">
              BUY 0.25+ SOL ON PUMP.FUN TO GET CROWNED!
            </span>
          </div>
        ) : (
          filteredTrades.slice(0, 40).map((trade, idx) => {
            const isSelected =
              Boolean(selectedNpcId) &&
              (selectedNpcId === trade.id ||
                selectedNpcId === trade.wallet ||
                selectedNpcId === trade.fullWallet);

            // Row classification classes
            let rowClass = 'tx-row-std';
            if (trade.isCurrentKing) {
              rowClass = 'tx-row-king';
            } else if (trade.isQualifying) {
              rowClass = 'tx-row-qualifying';
            } else if (trade.isBuy) {
              rowClass = 'tx-row-buy';
            } else {
              rowClass = 'tx-row-sell';
            }

            return (
              <div
                key={trade.id || `tx-${idx}`}
                className={`tx-row ${rowClass} ${isSelected ? 'tx-selected-row' : ''}`}
                onClick={() => {
                  if (onSelectNpc) {
                    const matchedNpc = npcs.find(
                      (n) => n.fullWallet === trade.fullWallet || n.wallet === trade.wallet
                    );
                    onSelectNpc(isSelected ? null : (matchedNpc || { wallet: trade.wallet, fullWallet: trade.fullWallet }));
                  }
                }}
                title={
                  trade.isCurrentKing
                    ? '👑 CURRENT CROWN HOLDER! Click to focus in 3D'
                    : trade.isQualifying
                    ? '🔥 0.25+ SOL Crown Contender! Click to focus in 3D'
                    : 'Click to focus camera in 3D scene'
                }
              >
                {/* 1. Status / Crown Badge */}
                <div className="tx-badge-col">
                  {trade.isCurrentKing ? (
                    <div className="tx-crown-badge-king" title="CURRENT CROWN HOLDER">
                      <span className="crown-emoji">👑</span>
                      <span className="crown-king-label">KING</span>
                    </div>
                  ) : trade.isQualifying ? (
                    <div className="tx-crown-badge-qual" title="CROWN QUALIFIED (>= 0.25 SOL)">
                      <Flame size={13} className="flame-icon" />
                      <span className="qual-label">0.25+</span>
                    </div>
                  ) : trade.isBuy ? (
                    <div className="tx-type-badge buy">
                      <ArrowUpRight size={13} />
                      <span>BUY</span>
                    </div>
                  ) : (
                    <div className="tx-type-badge sell">
                      <ArrowDownRight size={13} />
                      <span>SELL</span>
                    </div>
                  )}
                </div>

                {/* 2. Wallet & Timestamp */}
                <div className="tx-wallet-col">
                  <div className="tx-wallet-row">
                    <span className="tx-wallet-addr">{trade.wallet}</span>
                    {trade.signature && (
                      <a
                        href={`https://solscan.io/tx/${trade.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-solscan-link"
                        onClick={(e) => e.stopPropagation()}
                        title="View transaction on Solscan"
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <span className="tx-time-ago">{trade.timeAgoStr || 'Just now'}</span>
                </div>

                {/* 3. SOL Value & USD Output */}
                <div className="tx-amount-col">
                  <span className={`tx-sol-val ${trade.isBuy ? 'buy' : 'sell'}`}>
                    {trade.isBuy ? '+' : '-'}{trade.solAmount.toFixed(3)} SOL
                  </span>
                  {trade.usdValue && (
                    <span className="tx-usd-val">≈ ${trade.usdValue}</span>
                  )}
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
