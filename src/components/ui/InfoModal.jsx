import React from 'react';
import { X, Trophy, Flame, Ruler, Coins, Sparkles, Clock, Target } from 'lucide-react';

export function InfoModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close">
          <X size={20} />
        </button>

        {/* Modal Header with Logo Image */}
        <div className="modal-header info-modal-header" style={{ justifyContent: 'center', textAlign: 'center', marginBottom: '14px' }}>
          <img
            src="/dickhoppers_logo.png"
            alt="DickHoppers"
            className="info-modal-logo-img"
            style={{
              maxHeight: '68px',
              maxWidth: '85%',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto',
            }}
          />
        </div>

        {/* Mechanics Grid */}
        <div className="info-mechanics-grid custom-scrollbar">
          {/* Rule 1: Buy to Spawn */}
          <div className="info-rule-card">
            <div className="info-rule-header">
              <div className="info-rule-icon-box pink">
                <Coins size={18} />
              </div>
              <h4 className="info-rule-title">1. Buy to Spawn</h4>
            </div>
            <p className="info-rule-desc">
              Every buy on Pump.fun instantly spawns your custom 3D Hopper into the live arena. Larger buys start with a bigger shaft and unlock rare skins like <strong>✨ 24K Pure Gold</strong>, <strong>💎 Diamond Hands</strong>, and <strong>👑 Royal Purple</strong>.
            </p>
          </div>

          {/* Rule 2: Hold to Grow */}
          <div className="info-rule-card">
            <div className="info-rule-header">
              <div className="info-rule-icon-box cyan">
                <Ruler size={18} />
              </div>
              <h4 className="info-rule-title">2. Hold to Grow</h4>
            </div>
            <p className="info-rule-desc">
              The longer you HODL your tokens without selling, the longer your shaft grows in real time. Your length increases by <strong>+1.5 inches per minute</strong>. Diamond hands grow giants; paperhands stay tiny.
            </p>
          </div>

          {/* Rule 3: 30-Minute Prize Pool Race */}
          <div className="info-rule-card highlight-card">
            <div className="info-rule-header">
              <div className="info-rule-icon-box gold">
                <Trophy size={18} />
              </div>
              <h4 className="info-rule-title" style={{ color: '#ffd700' }}>3. 30-Min SOL Prize Pool</h4>
            </div>
            <p className="info-rule-desc">
              Every 30 minutes, the <strong>Top 10 biggest dicks</strong> on the leaderboard split the SOL prize pool. Reach the <strong>69.0"</strong> target length to win the 1st place whale payout!
            </p>
          </div>

          {/* Rule 4: Interactive 3D Arena */}
          <div className="info-rule-card">
            <div className="info-rule-header">
              <div className="info-rule-icon-box green">
                <Target size={18} />
              </div>
              <h4 className="info-rule-title">4. Follow & Track Hoppers</h4>
            </div>
            <p className="info-rule-desc">
              Click any hopper in the 3D world or from the Leaderboard to lock the camera onto their head and follow their hops in third-person view. Click anywhere on the ground or sky to unfocus.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button className="btn-done" onClick={onClose} style={{ marginTop: '16px' }}>
          Got It • Start Growing
        </button>
      </div>
    </div>
  );
}

export default InfoModal;
