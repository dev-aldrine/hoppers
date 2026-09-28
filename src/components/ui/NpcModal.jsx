import React from 'react';
import { X, ExternalLink, Ruler, Coins, Palette, Clock, Target, Trophy, Flame } from 'lucide-react';

export function NpcModal({ npc, onClose }) {
  if (!npc) return null;

  const fullWallet = npc.fullWallet || npc.wallet;
  const isWinner = Boolean(npc.winnerInfo);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <span className="modal-avatar">{isWinner ? '🏆' : '🍆'}</span>
          <div>
            <h3 className="modal-title">{npc.tier || 'Chad Hopper'}</h3>
            <p className="modal-subtitle">
              {isWinner ? `Prize Pool Winner (+${npc.winnerInfo?.prizeSol} SOL)` : 'Pump.fun Token Buyer & HODLer'}
            </p>
          </div>
        </div>

        {isWinner && (
          <div className="winner-highlight-banner">
            <Trophy size={18} className="text-gold" />
            <span>
              <b>Rank #{npc.winnerInfo.rank} Winner!</b> Won <b>{npc.winnerInfo.prizeSol} SOL</b> ({npc.winnerInfo.percentage}%)
            </span>
          </div>
        )}

        <div className="modal-stats-grid">
          {/* Purchase SOL */}
          <div className="stat-box">
            <div className="stat-label">
              <Coins size={14} className="text-neon-cyan" />
              <span>Initial Buy</span>
            </div>
            <div className="stat-value text-neon-cyan font-mono">
              +{Number(npc.solAmount || 0).toFixed(2)} SOL
            </div>
          </div>

          {/* Current Length (Inches & CM) */}
          <div className="stat-box">
            <div className="stat-label">
              <Ruler size={14} className="text-neon-pink" />
              <span>Total Length</span>
            </div>
            <div className="stat-value text-neon-pink font-mono">
              {npc.currentInches || npc.shaftHeight || '15.2"'}
              {npc.currentCm && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>({npc.currentCm})</span>}
            </div>
          </div>

          {/* HODL Duration */}
          <div className="stat-box">
            <div className="stat-label">
              <Clock size={14} className="text-gold" />
              <span>HODL Duration</span>
            </div>
            <div className="stat-value text-gold font-mono">
              {npc.hodlDuration || '1m 30s'}
            </div>
          </div>

          {/* HODL Bonus Growth (+0.0005 cm/s) */}
          <div className="stat-box">
            <div className="stat-label">
              <Flame size={14} className="text-neon-pink" />
              <span>HODL Growth (+0.0005cm/s)</span>
            </div>
            <div className="stat-value text-gold font-mono">
              {npc.hodlCm ? `${npc.hodlCm}` : npc.hodlInches || '+0.0 cm'}
              {npc.hodlInches && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>({npc.hodlInches})</span>}
            </div>
          </div>

          {/* Race Progress */}
          {npc.targetInches && (
            <div className="stat-box full-width">
              <div className="stat-label">
                <Target size={14} className="text-neon-cyan" />
                <span>Prize Pool Goal ({npc.targetInches})</span>
              </div>
              <div className="stat-value text-neon-cyan font-mono">
                {npc.progressToTarget || '100%'}
              </div>
            </div>
          )}

          {/* Skin Texture */}
          <div className="stat-box full-width">
            <div className="stat-label">
              <Palette size={14} className="text-gold" />
              <span>Skin Texture</span>
            </div>
            <div className="stat-value text-gold">
              {npc.skinName || 'Standard Tone'}
            </div>
          </div>
        </div>

        <div className="wallet-card">
          <span className="wallet-label">Solana Wallet Address</span>
          <div className="wallet-row">
            <code className="wallet-code">{fullWallet}</code>
            <a
              href={`https://solscan.io/account/${fullWallet}`}
              target="_blank"
              rel="noreferrer"
              className="solscan-link"
              title="View on Solscan"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        </div>

        <button className="btn-done" onClick={onClose}>
          Close Inspection
        </button>
      </div>
    </div>
  );
}

export default NpcModal;
