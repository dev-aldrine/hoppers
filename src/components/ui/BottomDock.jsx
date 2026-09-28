import React, { useState } from 'react';
import { Copy, Check, Send, Info, Volume2, VolumeX } from 'lucide-react';

export function BottomDock({ settings, onOpenInfo, isMuted = false, onToggleMute }) {
  const [copied, setCopied] = useState(false);

  const mintAddress = settings?.mintAddress || '';

  const handleCopyCA = () => {
    if (mintAddress) {
      navigator.clipboard.writeText(mintAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const telegramUrl = settings?.telegramUrl || 'https://t.me/dickcoin_pump';
  const twitterUrl = settings?.twitterUrl || 'https://x.com/dickcoin_sol';
  const pumpfunUrl = mintAddress ? `https://pump.fun/${mintAddress}` : 'https://pump.fun';

  return (
    <div className="bottom-dock-container no-container">
      {/* 📋 Full Contract Address Copy Pill (Untruncated) */}
      {mintAddress && (
        <button
          className="dock-ca-pill untruncated"
          onClick={handleCopyCA}
          title="Click to copy full CA"
        >
          <span className="dock-ca-tag">CA:</span>
          <span className="dock-ca-val font-mono">{mintAddress}</span>
          <span className="dock-ca-icon">
            {copied ? (
               <Check size={14} className="text-green animate-bounce" />
            ) : (
               <Copy size={14} />
            )}
          </span>
          {copied && <span className="dock-copied-tooltip">Copied!</span>}
        </button>
      )}

      {/* 🌐 Social, Trading, Info & Audio Buttons */}
      <div className="dock-social-group standalone">
        {/* X (Twitter) */}
        <a
          href={twitterUrl}
          target="_blank"
          rel="noreferrer"
          className="dock-icon-btn dock-x"
          title="X (Twitter)"
        >
          <span className="dock-x-icon">𝕏</span>
        </a>

        {/* Telegram */}
        <a
          href={telegramUrl}
          target="_blank"
          rel="noreferrer"
          className="dock-icon-btn dock-tg"
          title="Telegram Community"
        >
          <Send size={16} />
        </a>

        {/* Pump.fun Direct Circular Button */}
        <a
          href={pumpfunUrl}
          target="_blank"
          rel="noreferrer"
          className="dock-icon-btn dock-pumpfun"
          title="Trade on Pump.fun"
        >
          <img
            src="/pumpfun_pill.png"
            alt="Pump.fun"
            className="dock-pumpfun-img"
          />
        </a>

        {/* 🔊 Audio / Music Mute Toggle Button */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`dock-icon-btn dock-audio ${isMuted ? 'muted' : 'active'}`}
          title={isMuted ? 'Unmute BGM Music' : 'Mute BGM Music'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* ℹ️ How It Works & Game Mechanics */}
        <button
          type="button"
          onClick={onOpenInfo}
          className="dock-icon-btn dock-info"
          title="How It Works & Game Mechanics"
        >
          <Info size={16} />
        </button>
      </div>
    </div>
  );
}

export default BottomDock;
