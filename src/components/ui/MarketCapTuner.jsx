import React, { useState } from 'react';
import { Orbit, Compass, MoveVertical, Maximize2, Minimize2, Copy, Check, RefreshCw, RotateCw, RotateCcw } from 'lucide-react';

export function MarketCapTuner({
  distance = 7.8,
  onChangeDistance,
  orbitAngle = -0.26, // radians around dick
  onChangeOrbitAngle,
  heightOffset = 1.4,
  onChangeHeightOffset,
  facingAngle = 1.26, // text yaw angle
  onChangeFacingAngle,
  scale = 0.95,
  onChangeScale,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const angleDeg = (orbitAngle * (180 / Math.PI)).toFixed(1);
  const facingDeg = (facingAngle * (180 / Math.PI)).toFixed(1);

  const handleCopy = () => {
    const config = `distance: ${distance.toFixed(1)}, orbitAngle: ${orbitAngle.toFixed(2)} (${angleDeg}°), heightOffset: ${heightOffset.toFixed(1)}, facingAngle: ${facingAngle.toFixed(2)} (${facingDeg}°), scale: ${scale.toFixed(2)}`;
    navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRotateFacingBy = (deltaRad) => {
    let newFacing = (facingAngle + deltaRad) % (Math.PI * 2);
    onChangeFacingAngle(parseFloat(newFacing.toFixed(2)));
  };

  const handleRotateOrbitBy = (deltaRad) => {
    let newOrbit = (orbitAngle + deltaRad) % (Math.PI * 2);
    onChangeOrbitAngle(parseFloat(newOrbit.toFixed(2)));
  };

  const handleReset = () => {
    onChangeDistance(7.8);
    onChangeOrbitAngle(-0.26);
    onChangeHeightOffset(1.4);
    onChangeFacingAngle(1.26);
    onChangeScale(0.95);
  };

  return (
    <div
      className={`scale-debugger glass-panel sun-tuner-panel ${isOpen ? 'open' : 'collapsed'}`}
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 9999,
        width: '330px',
        background: 'rgba(8, 14, 24, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(57, 255, 20, 0.4)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(57, 255, 20, 0.25)',
      }}
    >
      <div className="debugger-header" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="title-box flex items-center gap-2">
          <Orbit size={18} className="text-green" style={{ color: '#39ff14' }} />
          <span style={{ fontWeight: 900, color: '#39ff14', fontSize: '0.9rem' }}>Market Cap Pivot Tuner</span>
        </div>
        <button className="toggle-btn" title="Minimize / Expand">
          {isOpen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {isOpen && (
        <div className="debugger-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px' }}>
          {/* 🎯 ORBIT & DISTANCE AROUND DICK */}
          <div className="tuner-section">
            <span className="section-badge flex items-center gap-1" style={{ color: '#39ff14' }}>
              <Orbit size={13} /> 1. Orbit Around Center Dick (Pivot: 0,0,0)
            </span>

            {/* Orbit Angle Slider */}
            <div className="slider-row compact">
              <div className="slider-label-row flex justify-between">
                <span>Orbit Angle Around Dick:</span>
                <span className="font-mono" style={{ color: '#39ff14', fontWeight: 800 }}>{angleDeg}°</span>
              </div>
              <input
                type="range"
                min={-Math.PI}
                max={Math.PI}
                step="0.04"
                value={orbitAngle}
                onChange={(e) => onChangeOrbitAngle(parseFloat(e.target.value))}
                className="range-slider"
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleRotateOrbitBy(-Math.PI / 2)}
                  style={{ padding: '3px 4px', fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', color: '#fff' }}
                >
                  -90° Orbit
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateOrbitBy(Math.PI / 2)}
                  style={{ padding: '3px 4px', fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', color: '#fff' }}
                >
                  +90° Orbit
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateOrbitBy(-Math.PI / 4)}
                  style={{ padding: '3px 4px', fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', color: '#fff' }}
                >
                  -45°
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateOrbitBy(Math.PI / 4)}
                  style={{ padding: '3px 4px', fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', color: '#fff' }}
                >
                  +45°
                </button>
              </div>
            </div>

            {/* Distance to Dick */}
            <div className="slider-row compact" style={{ marginTop: '8px' }}>
              <div className="slider-label-row flex justify-between">
                <span>Distance from Dick:</span>
                <span className="font-mono" style={{ color: '#00e5ff', fontWeight: 800 }}>{distance.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="22.0"
                step="0.2"
                value={distance}
                onChange={(e) => onChangeDistance(parseFloat(e.target.value))}
                className="range-slider"
              />
            </div>
          </div>

          {/* ↕️ HEIGHT OFFSET */}
          <div className="tuner-section">
            <span className="section-badge flex items-center gap-1" style={{ color: '#ff007f' }}>
              <MoveVertical size={13} /> 2. Vertical Height Offset (on shaft)
            </span>
            <div className="slider-row compact">
              <div className="slider-label-row flex justify-between">
                <span>Height Offset:</span>
                <span className="font-mono" style={{ color: '#ff007f', fontWeight: 800 }}>
                  {heightOffset >= 0 ? `+${heightOffset.toFixed(1)}` : heightOffset.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="-10.0"
                max="10.0"
                step="0.2"
                value={heightOffset}
                onChange={(e) => onChangeHeightOffset(parseFloat(e.target.value))}
                className="range-slider"
              />
            </div>
          </div>

          {/* 🧭 TEXT FACING ANGLE */}
          <div className="tuner-section">
            <span className="section-badge flex items-center gap-1" style={{ color: '#ffd700' }}>
              <Compass size={13} /> 3. Text Facing Angle (Yaw)
            </span>

            <div className="slider-row compact">
              <div className="slider-label-row flex justify-between">
                <span>Facing Angle:</span>
                <span className="font-mono" style={{ color: '#ffd700', fontWeight: 800 }}>{facingDeg}°</span>
              </div>
              <input
                type="range"
                min={-Math.PI}
                max={Math.PI}
                step="0.04"
                value={facingAngle}
                onChange={(e) => onChangeFacingAngle(parseFloat(e.target.value))}
                className="range-slider"
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleRotateFacingBy(-Math.PI / 2)}
                  style={{ padding: '3px 4px', fontSize: '0.65rem', background: 'rgba(255,215,0,0.15)', border: '1px solid #ffd700', borderRadius: '4px', color: '#ffd700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}
                >
                  <RotateCcw size={10} /> -90°
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateFacingBy(Math.PI / 2)}
                  style={{ padding: '3px 4px', fontSize: '0.65rem', background: 'rgba(255,215,0,0.15)', border: '1px solid #ffd700', borderRadius: '4px', color: '#ffd700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}
                >
                  <RotateCw size={10} /> +90°
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateFacingBy(Math.PI)}
                  style={{ padding: '3px 4px', fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', color: '#fff' }}
                >
                  180° Flip
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFacingAngle(0)}
                  style={{ padding: '3px 4px', fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', color: '#fff' }}
                >
                  0° Front
                </button>
              </div>
            </div>
          </div>

          {/* 🔍 SCALE */}
          <div className="tuner-section">
            <span className="section-badge" style={{ color: '#00e5ff' }}>4. Text Size</span>
            <div className="slider-row compact">
              <div className="slider-label-row flex justify-between">
                <span>Scale:</span>
                <span className="font-mono text-neon-cyan" style={{ color: '#00e5ff' }}>{scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.05"
                value={scale}
                onChange={(e) => onChangeScale(parseFloat(e.target.value))}
                className="range-slider"
              />
            </div>
          </div>

          {/* 📋 ACTION BUTTONS */}
          <div className="btn-actions-row" style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <button
              className="btn-copy-config"
              onClick={handleCopy}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'linear-gradient(135deg, #39ff14 0%, #00e5ff 100%)',
                color: '#000',
                fontWeight: 900,
                fontSize: '0.78rem',
                borderRadius: '8px',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied Config!' : 'Copy Distance & Angles'}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reset to Default"
              style={{
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketCapTuner;
