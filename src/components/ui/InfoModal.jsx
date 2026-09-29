import React from 'react';
import { X, Sparkles } from 'lucide-react';
import growersLogo from '../../assets/growers_wordmark.png';

export function InfoModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close">
          <X size={20} />
        </button>

        {/* Modal Header with GROWERS Logo */}
        <div className="modal-header info-modal-header" style={{ justifyContent: 'center', textAlign: 'center', marginBottom: '14px' }}>
          <img
            src={growersLogo}
            alt="GROWERS"
            className="info-modal-logo-img"
            style={{
              maxHeight: '76px',
              maxWidth: '85%',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto',
            }}
          />
        </div>

        {/* Core Narrative Box */}
        <div className="info-narrative-card">
          <div className="info-narrative-badge">
            <Sparkles size={14} />
            <span>HOW IT WORKS</span>
          </div>
          <p className="info-narrative-text">
            Higher market cap = bigger dick. That’s literally the entire narrative. We’re not showers, we’re <strong>$GROWERS</strong>.
          </p>
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
