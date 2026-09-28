import React from 'react';
import { TrendingUp, Flame, DollarSign, Activity } from 'lucide-react';

export function LiveMarketCap({ marketCapData, tokenSymbol = '$DICK' }) {
  const mcapUsd = marketCapData?.mcapUsd ?? marketCapData?.mcapInUsd ?? 0;
  const mcapSol = marketCapData?.mcapSol ?? marketCapData?.mcapInSol ?? 0;
  const migrationProgress = marketCapData?.migrationProgress ?? 0;
  const priceInSol = marketCapData?.priceInSol ?? 0;

  return (
    <div className="live-mcap-card glass-panel">
      <div className="mcap-top">
        <div className="mcap-badge">
          <Activity size={14} className="pulse-icon text-neon-pink" />
          <span>BONDING CURVE</span>
        </div>
        <div className="sol-price-tag">
          SOL = ${marketCapData?.solUsdPrice || 155}
        </div>
      </div>

      <div className="mcap-main-val">
        <span className="dollar-sign">$</span>
        <span className="val-text">
          {mcapUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        <span className="currency-tag">USD</span>
      </div>

      <div className="mcap-sub-row">
        <div className="sub-item">
          <span className="label">MCAP SOL:</span>
          <span className="val">{mcapSol.toFixed(1)} SOL</span>
        </div>
        <div className="sub-item">
          <span className="label">Price:</span>
          <span className="val">{priceInSol < 0.00001 ? priceInSol.toExponential(3) : priceInSol.toFixed(6)} SOL</span>
        </div>
      </div>

      {/* Raydium Migration Progress Bar */}
      <div className="progress-section">
        <div className="progress-header">
          <span className="prog-title">
            <Flame size={13} className="text-neon-yellow" /> Raydium Migration Progress
          </span>
          <span className="prog-pct">{migrationProgress.toFixed(1)}%</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, Math.max(2, migrationProgress))}%` }}
          />
        </div>
        <div className="progress-footer">
          <span>Graduation target: ~85 SOL</span>
          <span>1.0B Total Supply</span>
        </div>
      </div>
    </div>
  );
}
