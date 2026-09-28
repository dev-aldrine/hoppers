import React, { useState } from 'react';
import { Tag, Crown, Maximize2, Minimize2, Copy, Check, RotateCcw } from 'lucide-react';

export function TagCrownTuner({
  tagOffsetY,
  onChangeTagOffsetY,
  tagScale,
  onChangeTagScale,
  crownOffsetY,
  onChangeCrownOffsetY,
  crownScale,
  onChangeCrownScale,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyConfig = () => {
    const configStr = `tagOffsetY: ${tagOffsetY.toFixed(2)}, tagScale: ${tagScale.toFixed(2)}, crownOffsetY: ${crownOffsetY.toFixed(2)}, crownScale: ${crownScale.toFixed(4)}`;
    navigator.clipboard.writeText(configStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    onChangeTagOffsetY(0.0);
    onChangeTagScale(1.2);
    onChangeCrownOffsetY(0.0);
    onChangeCrownScale(0.018);
  };

  return (
    <div className={`scale-debugger glass-panel sun-tuner-panel ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="debugger-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="title-box">
          <Tag size={16} className="text-neon-cyan" />
          <span>Tag & Crown Tuner</span>
        </div>
        <button className="toggle-btn" title="Minimize / Expand">
          {isOpen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {isOpen && (
        <div className="debugger-body">
          {/* 🏷️ TAG TUNING SECTION */}
          <div className="tuner-section">
            <span className="section-badge flex items-center gap-1">
              <Tag size={12} className="text-neon-cyan" /> Overhead Tag Settings
            </span>

            <div className="slider-row compact">
              <div className="slider-label-row">
                <span className="label-text">Tag Height (Y-Offset):</span>
                <span className="label-value font-mono text-neon-cyan">
                  {tagOffsetY >= 0 ? `+${tagOffsetY.toFixed(2)}` : tagOffsetY.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-1.50"
                max="1.50"
                step="0.02"
                value={tagOffsetY}
                onChange={(e) => onChangeTagOffsetY(parseFloat(e.target.value))}
                className="range-slider"
              />
            </div>

            <div className="slider-row compact">
              <div className="slider-label-row">
                <span className="label-text">Tag Size (Scale):</span>
                <span className="label-value font-mono text-neon-pink">{tagScale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="2.5"
                step="0.05"
                value={tagScale}
                onChange={(e) => onChangeTagScale(parseFloat(e.target.value))}
                className="range-slider"
              />
            </div>
          </div>

          {/* 👑 CROWN TUNING SECTION */}
          <div className="tuner-section">
            <span className="section-badge flex items-center gap-1">
              <Crown size={12} className="text-gold" /> Whale Crown Settings
            </span>

            <div className="slider-row compact">
              <div className="slider-label-row">
                <span className="label-text">Crown Height (Y-Offset):</span>
                <span className="label-value font-mono text-gold">
                  {crownOffsetY >= 0 ? `+${crownOffsetY.toFixed(2)}` : crownOffsetY.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-1.00"
                max="1.00"
                step="0.01"
                value={crownOffsetY}
                onChange={(e) => onChangeCrownOffsetY(parseFloat(e.target.value))}
                className="range-slider"
              />
            </div>

            <div className="slider-row compact">
              <div className="slider-label-row">
                <span className="label-text">Crown Size (Scale):</span>
                <span className="label-value font-mono text-gold">{crownScale.toFixed(4)}</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.050"
                step="0.001"
                value={crownScale}
                onChange={(e) => onChangeCrownScale(parseFloat(e.target.value))}
                className="range-slider"
              />
            </div>
          </div>

          {/* Copy Config Button */}
          <div className="btn-actions-row">
            <button className="btn-copy-config" onClick={handleCopyConfig}>
              {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Tag & Crown Config'}</span>
            </button>
            <button className="btn-reset-sun" onClick={handleReset} title="Reset to Defaults">
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
