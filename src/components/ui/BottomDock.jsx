import React, { useState } from 'react';
import { Copy, Check, HelpCircle } from 'lucide-react';
import { isValidPublicKey } from '../../solana/bondingCurve';

export function BottomDock({ settings, isMuted = false, onToggleMute, onOpenAbout }) {
  const [copied, setCopied] = useState(false);

  const rawMint = settings?.mintAddress?.trim() || '';
  const isRealCA = isValidPublicKey(rawMint);
  const displayCA = rawMint || 'Updating CA...';

  const handleCopyCA = () => {
    if (isRealCA) {
      navigator.clipboard.writeText(rawMint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const pumpfunUrl = isRealCA ? `https://pump.fun/${rawMint}` : 'https://pump.fun';

  return (
    <div className="bottom-dock-container no-container">
      {/* 📋 Contract Address Copy Pill */}
      {rawMint && (
        <button
          className={`dock-ca-pill untruncated ${!isRealCA ? 'ca-pending' : ''}`}
          onClick={handleCopyCA}
          title={isRealCA ? 'Click to copy full CA' : 'CA updating soon'}
          style={!isRealCA ? { cursor: 'default' } : {}}
        >
          <span className="dock-ca-tag">CA:</span>
          <span className="dock-ca-val font-mono">{displayCA}</span>
          {isRealCA && (
            <span className="dock-ca-icon">
              {copied ? (
                <Check size={14} className="text-green animate-bounce" />
              ) : (
                <Copy size={14} />
              )}
            </span>
          )}
          {copied && <span className="dock-copied-tooltip">Copied!</span>}
        </button>
      )}

      {/* 🌐 Trading, Info & Audio Buttons */}
      <div className="dock-social-group standalone">
        {/* Pump.fun Direct Circular Button */}
        <a
          href={pumpfunUrl}
          target="_blank"
          rel="noreferrer"
          className="dock-icon-btn dock-pumpfun"
          title={isRealCA ? 'Trade on Pump.fun' : 'Pump.fun'}
        >
          <img
            src="/pumpfun_pill.png"
            alt="Pump.fun"
            className="dock-pumpfun-img"
          />
        </a>

        {/* ℹ️ About / How it works Button */}
        {onOpenAbout && (
          <button
            type="button"
            onClick={onOpenAbout}
            className="dock-icon-btn dock-about"
            title="About $GROWERS"
          >
            <HelpCircle size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default BottomDock;
