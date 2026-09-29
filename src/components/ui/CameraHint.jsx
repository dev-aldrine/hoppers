import React, { useState, useEffect } from 'react';
import { Compass, ZoomIn, MousePointerClick, X } from 'lucide-react';

export function CameraHint() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Auto fade after 8 seconds
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), 800);
    }, 8000);

    // Dismiss if user interacts with the canvas / mouse drags
    const handleDismissOnInteract = () => {
      setFading(true);
      setTimeout(() => setVisible(false), 600);
      window.removeEventListener('pointerdown', handleDismissOnInteract);
      window.removeEventListener('wheel', handleDismissOnInteract);
    };

    const canvasTimer = setTimeout(() => {
      window.addEventListener('pointerdown', handleDismissOnInteract, { once: true });
      window.addEventListener('wheel', handleDismissOnInteract, { once: true });
    }, 1200);

    return () => {
      clearTimeout(timer);
      clearTimeout(canvasTimer);
      window.removeEventListener('pointerdown', handleDismissOnInteract);
      window.removeEventListener('wheel', handleDismissOnInteract);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`camera-hint-wrapper ${fading ? 'fade-out' : 'fade-in'}`}>
      <div className="camera-hint-pill">
        <div className="camera-hint-glow" />
        
        <div className="camera-hint-item">
          <div className="hint-icon-badge rotate-pulse">
            <Compass size={15} />
          </div>
          <span className="hint-text">
            <b>Drag</b> to rotate 360°
          </span>
        </div>

        <div className="hint-separator" />

        <div className="camera-hint-item">
          <div className="hint-icon-badge">
            <ZoomIn size={15} />
          </div>
          <span className="hint-text">
            <b>Scroll / Pinch</b> to zoom
          </span>
        </div>

        <div className="hint-separator" />

        <div className="camera-hint-item">
          <div className="hint-icon-badge">
            <MousePointerClick size={15} />
          </div>
          <span className="hint-text">
            <b>Click</b> hopper to inspect
          </span>
        </div>

        <button
          className="btn-hint-close"
          onClick={() => {
            setFading(true);
            setTimeout(() => setVisible(false), 500);
          }}
          title="Dismiss hint"
          aria-label="Close camera hint"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
