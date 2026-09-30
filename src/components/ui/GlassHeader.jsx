import React, { useState } from 'react';
import { Shield, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';

export function GlassHeader({
  settings,
  onOpenAdmin,
  npcCount,
}) {
  const [copied, setCopied] = useState(false);

  const rawMint = settings?.mintAddress?.trim() || '';
  const isRealCA = Boolean(rawMint && rawMint.length >= 32 && !rawMint.toLowerCase().includes('updating'));

  const handleCopyCA = () => {
    if (isRealCA) {
      navigator.clipboard.writeText(rawMint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortCA = isRealCA
    ? `${rawMint.slice(0, 4)}...${rawMint.slice(-4)}`
    : 'Updating CA';

  return (
    <header className="glass-header">
      <div className="header-left">
        <div className="brand-logo">
          <span className="logo-emoji">🍆</span>
          <div className="brand-text">
            <h1 className="brand-title">
              {settings?.tokenSymbol || '$DICK'}{' '}
              <span className="live-dot-pulse">● LIVE</span>
            </h1>
            <p className="brand-subtitle">Pump.fun Real-Time 3D Crown Arena</p>
          </div>
        </div>

        {/* Copy Contract Address Pill */}
        <button
          className={`ca-pill ${!isRealCA ? 'ca-pending' : ''}`}
          onClick={handleCopyCA}
          title={isRealCA ? 'Click to copy CA' : 'CA updating soon'}
          style={!isRealCA ? { cursor: 'default' } : {}}
        >
          <span className="ca-label">CA:</span>
          <span className="ca-value">{shortCA}</span>
          {isRealCA && (
            copied ? <Check size={14} className="text-green" /> : <Copy size={14} />
          )}
        </button>
      </div>

      <div className="header-right">
        {/* Pump.fun Direct Link */}
        {isRealCA && (
          <a
            href={`https://pump.fun/${rawMint}`}
            target="_blank"
            rel="noreferrer"
            className="btn-pumpfun"
          >
            <span>Buy on Pump.fun</span>
            <ExternalLink size={14} />
          </a>
        )}

        {/* Admin Gate Button */}
        <button className="btn-admin" onClick={onOpenAdmin}>
          <Shield size={16} />
          <span>Admin</span>
        </button>
      </div>
    </header>
  );
}
