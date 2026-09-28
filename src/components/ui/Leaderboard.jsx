import React from 'react';
import { Trophy, Users } from 'lucide-react';

export function Leaderboard({ holders = [], onSelectHolder }) {
  return (
    <div className="leaderboard-card glass-panel">
      <div className="card-header">
        <div className="title-row">
          <Trophy size={16} className="text-gold" />
          <h3>Top Chad Holders</h3>
        </div>
        <div className="holder-count-badge">
          <Users size={12} />
          <span>{holders.length} Chads</span>
        </div>
      </div>

      <div className="holder-list">
        {holders.length === 0 ? (
          <div className="empty-trades">Fetching top wallets...</div>
        ) : (
          holders.slice(0, 7).map((holder, idx) => (
            <div
              key={holder.id || idx}
              className={`holder-row rank-${idx + 1}`}
              onClick={() => onSelectHolder && onSelectHolder(holder)}
            >
              <div className="rank-badge">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
              </div>

              <div className="holder-details">
                <div className="holder-wallet-row">
                  <span className="holder-address">{holder.address}</span>
                  <span className="holder-tier">{holder.tier}</span>
                </div>
                <div className="holder-pct-bar-bg">
                  <div
                    className="holder-pct-bar-fill"
                    style={{ width: `${Math.min(100, (holder.percentage || 1) * 10)}%` }}
                  />
                </div>
              </div>

              <div className="holder-stats">
                <span className="holder-pct">{(holder.percentage || 0).toFixed(2)}%</span>
                <span className="holder-sol">{holder.solValue ? `${holder.solValue} SOL` : ''}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
