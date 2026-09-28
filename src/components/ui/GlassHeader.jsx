import React, { useState } from 'react';
import { Volume2, VolumeX, Shield, Copy, Check, ExternalLink, Send, Sparkles } from 'lucide-react';
import { soundManager } from '../../audio/soundEffects';

export function GlassHeader({
  settings,
  onOpenAdmin,
  isMuted,
  onToggleMute,
  npcCount,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyCA = () => {
    if (settings?.mintAddress) {
      navigator.clipboard.writeText(settings.mintAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortCA = settings?.mintAddress
    ? `${settings.mintAddress.slice(0, 4)}...${settings.mintAddress.slice(-4)}`
    : 'None';

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
            <p className="brand-subtitle">Pump.fun Real-Time 3D NPC Tracker</p>
          </div>
        </div>

        {/* Copy Contract Address Pill */}
        <button className="ca-pill" onClick={handleCopyCA} title="Click to copy CA">
          <span className="ca-label">CA:</span>
          <span className="ca-value">{shortCA}</span>
          {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
        </button>
      </div>

      <div className="header-right">
        {/* Active Hoppers Count */}
        <div className="stats-pill">
          <Sparkles size={14} className="text-neon-cyan" />
          <span><b>{npcCount}</b> Active Hoppers</span>
        </div>

        {/* Sound Toggle */}
        <button
          className={`icon-btn ${isMuted ? 'muted' : 'active'}`}
          onClick={onToggleMute}
          title={isMuted ? 'Unmute Audio FX' : 'Mute Audio FX'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Social Links */}
        {settings?.telegramUrl && (
          <a
            href={settings.telegramUrl}
            target="_blank"
            rel="noreferrer"
            className="icon-btn social"
            title="Telegram Community"
          >
            <Send size={18} />
          </a>
        )}

        {settings?.twitterUrl && (
          <a
            href={settings.twitterUrl}
            target="_blank"
            rel="noreferrer"
            className="icon-btn social"
            title="X (Twitter)"
          >
            <span style={{ fontWeight: 800, fontSize: '15px' }}>𝕏</span>
          </a>
        )}

        {/* Pump.fun Direct Link */}
        {settings?.mintAddress && (
          <a
            href={`https://pump.fun/${settings.mintAddress}`}
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
