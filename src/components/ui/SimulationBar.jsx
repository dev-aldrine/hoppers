import React from 'react';
import { PlusCircle, Sparkles, Crown, Trash2, Zap, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../../audio/soundEffects';

export function SimulationBar({ onSpawnDemoNpc, onBoostHodlTime, onClearNpcs }) {
  const triggerConfetti = (isWhale = false) => {
    if (isWhale) {
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#ff007f', '#00e5ff', '#ffffff'],
      });
      soundManager.playWhaleFanfare();
    } else {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00e5ff', '#ff007f'],
      });
      soundManager.playBuyChime();
    }
  };

  const handleSpawn = (solAmount, tier) => {
    const isWhale = solAmount >= 5.0;
    triggerConfetti(isWhale);
    onSpawnDemoNpc(solAmount, tier);
  };

  return (
    <div className="simulation-bar glass-panel">
      <div className="sim-title">
        <Sparkles size={14} className="text-neon-pink" />
        <span>Degen Spawner:</span>
      </div>

      <div className="sim-buttons">
        <button
          className="sim-btn mini"
          onClick={() => handleSpawn(0.1, 'mini')}
          title="Spawns standard 0.1 SOL hopper"
        >
          <PlusCircle size={14} />
          <span>+0.1 SOL</span>
        </button>

        <button
          className="sim-btn mid"
          onClick={() => handleSpawn(1.5, 'mid')}
          title="Spawns 1.5 SOL tall neck chad"
        >
          <Zap size={14} />
          <span>+1.5 SOL</span>
        </button>

        <button
          className="sim-btn whale"
          onClick={() => handleSpawn(10.0, 'whale')}
          title="Spawns 10 SOL Skyscraper Whale"
        >
          <Crown size={15} />
          <span>+10 SOL Whale</span>
        </button>

        {onBoostHodlTime && (
          <button
            className="sim-btn boost"
            onClick={onBoostHodlTime}
            title="Fast-forward holding time for all hoppers (+5 minutes) to watch shafts grow!"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 183, 3, 0.25) 0%, rgba(255, 0, 127, 0.25) 100%)',
              borderColor: 'rgba(255, 183, 3, 0.5)',
              color: '#ffd700',
            }}
          >
            <Flame size={14} className="text-gold animate-pulse" />
            <span>+5m HODL Growth</span>
          </button>
        )}

        <button
          className="sim-btn clear"
          onClick={onClearNpcs}
          title="Clear all NPCs from the arena"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default SimulationBar;
