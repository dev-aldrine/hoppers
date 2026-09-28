import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Crown, Flame, ChevronDown, ChevronUp, Sparkles, Clock, Target, CheckCircle2 } from 'lucide-react';
import {
  calculateTotalInches,
  formatInches,
  formatHodlDuration,
  calculatePrizePayout,
  DEFAULT_PRIZE_DISTRIBUTION,
} from '../../solana/growthMechanics';

export function PrizePoolWidget({
  settings,
  npcs = [],
  winners = [],
  onSelectNpc,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('race'); // 'race' | 'podium'
  const [, setTick] = useState(0);

  // Re-calculate live inches and sort every 1 second
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const prizePoolSol = Number(settings.prizePoolSol) || 5.0;
  const targetInches = Number(settings.prizePoolTargetInches) || 69.0;
  const growthRate = Number(settings.growthRateInchesPerMin) || 1.5;
  const solPrice = Number(settings.solUsdPrice) || 155;
  const isEnabled = settings.prizePoolEnabled !== false;
  const distribution = settings.prizePoolDistribution || DEFAULT_PRIZE_DISTRIBUTION;

  // Rank active NPCs by current inches
  const rankedNpcs = useMemo(() => {
    return npcs
      .map((npc) => {
        const inches = calculateTotalInches(
          npc.solAmount,
          npc.spawnTimestamp,
          growthRate,
          npc.bonusMinutes || 0
        );
        const progressPct = Math.min(100, (inches / targetInches) * 100);
        const hodlTime = formatHodlDuration(npc.spawnTimestamp, npc.bonusMinutes || 0);
        const isWinner = winners.some((w) => w.id === npc.id || w.wallet === npc.wallet);
        return {
          ...npc,
          currentInches: inches,
          progressPct,
          hodlTime,
          isWinner,
        };
      })
      .sort((a, b) => b.currentInches - a.currentInches);
  }, [npcs, growthRate, targetInches, winners]);

  if (!isEnabled) return null;

  return (
    <div className={`prize-pool-card glass-panel ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="prize-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="prize-title-wrap">
          <div className="trophy-pulse-box">
            <Trophy size={18} className="text-gold animate-bounce-subtle" />
          </div>
          <div>
            <div className="prize-badge-row">
              <span className="prize-badge">🍆 PRIZE POOL RACE</span>
              <span className="winners-count-badge font-mono">
                {winners.length}/5 Won
              </span>
            </div>
            <div className="prize-amount-row">
              <span className="prize-sol font-display">{prizePoolSol.toFixed(1)} SOL</span>
              <span className="prize-usd font-mono">
                (${(prizePoolSol * solPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD)
              </span>
            </div>
          </div>
        </div>

        <button className="collapse-toggle-btn" aria-label="Toggle widget">
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="prize-content">
          {/* Target Goal Banner */}
          <div className="target-goal-banner">
            <div className="goal-info">
              <Target size={14} className="text-neon-pink" />
              <span>Goal: First 5 to reach <b className="text-neon-pink font-mono">{targetInches.toFixed(1)}"</b></span>
            </div>
            <div className="growth-rate-tag">
              <Flame size={12} className="text-gold" />
              <span>+{growthRate} in/min</span>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="prize-tabs">
            <button
              className={`prize-tab ${activeTab === 'race' ? 'active' : ''}`}
              onClick={() => setActiveTab('race')}
            >
              <Sparkles size={13} />
              <span>Live Race ({rankedNpcs.length})</span>
            </button>
            <button
              className={`prize-tab ${activeTab === 'podium' ? 'active' : ''}`}
              onClick={() => setActiveTab('podium')}
            >
              <Crown size={13} />
              <span>Top 5 Podium ({winners.length})</span>
            </button>
          </div>

          {/* TAB 1: Live Race Leaders */}
          {activeTab === 'race' && (
            <div className="race-list custom-scrollbar">
              {rankedNpcs.length === 0 ? (
                <div className="empty-race">
                  <span>No active contenders hopping yet. Spawn or buy tokens to enter the race!</span>
                </div>
              ) : (
                rankedNpcs.slice(0, 6).map((npc, idx) => {
                  const rankNum = idx + 1;
                  const isClose = npc.progressPct >= 80;
                  return (
                    <div
                      key={npc.id}
                      className={`race-row ${npc.isWinner ? 'winner-row' : ''} ${isClose ? 'close-contender' : ''}`}
                      onClick={() => onSelectNpc && onSelectNpc(npc)}
                      title="Click to inspect this hopper"
                    >
                      <div className="race-rank">
                        {npc.isWinner ? '🏆' : rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : `#${rankNum}`}
                      </div>

                      <div className="race-details">
                        <div className="race-info-top">
                          <span className="race-wallet font-mono">{npc.wallet}</span>
                          <span className="race-inches font-mono font-bold">
                            {formatInches(npc.currentInches)}
                          </span>
                        </div>

                        <div className="race-bar-bg">
                          <div
                            className={`race-bar-fill ${npc.isWinner ? 'gold-bar' : isClose ? 'pink-bar' : ''}`}
                            style={{ width: `${Math.max(4, Math.min(100, npc.progressPct))}%` }}
                          />
                        </div>

                        <div className="race-info-bottom">
                          <span className="race-time">
                            <Clock size={10} className="inline mr-1" />
                            {npc.hodlTime}
                          </span>
                          <span className="race-pct font-mono">
                            {npc.progressPct.toFixed(1)}% to goal
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Top 5 Podium / Winners */}
          {activeTab === 'podium' && (
            <div className="podium-list custom-scrollbar">
              {[1, 2, 3, 4, 5].map((place) => {
                const payout = calculatePrizePayout(prizePoolSol, place, distribution);
                const winner = winners.find((w) => w.rank === place);
                const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : `#${place}`;

                return (
                  <div key={place} className={`podium-row ${winner ? 'claimed' : 'unclaimed'}`}>
                    <div className="podium-place">
                      <span className="medal-emoji">{medal}</span>
                      <span className="place-text">{place}{place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}</span>
                    </div>

                    <div className="podium-info">
                      <div className="podium-top">
                        <span className="payout-share font-mono font-bold text-gold">
                          {payout.solAmount} SOL ({payout.percentage}%)
                        </span>
                        {winner ? (
                          <span className="claimed-badge">
                            <CheckCircle2 size={11} className="inline mr-1 text-green" />
                            CLAIMED
                          </span>
                        ) : (
                          <span className="open-badge">OPEN ⚡</span>
                        )}
                      </div>
                      <div className="podium-wallet font-mono">
                        {winner ? (
                          <span className="winner-address">{winner.wallet} ({formatInches(winner.inches || targetInches)})</span>
                        ) : (
                          <span className="text-muted">Awaiting first to reach {targetInches}"...</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer note */}
          <div className="prize-footer-note">
            <span>💡 Necks grow from buy size + holding duration.</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PrizePoolWidget;
