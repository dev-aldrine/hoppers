import React, { useState } from 'react';
import { X, Shield, Lock, Unlock, Key, RefreshCw, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePhantomAuth, saveProjectSettings } from '../../solana/phantomAuth';

export function AdminModal({ settings, onSaveSettings, onClose }) {
  const [form, setForm] = useState({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Phantom Auth Hook
  const { walletAddress, isAuthorized, isConnecting, connectWallet, disconnectWallet } =
    usePhantomAuth(form.adminWallet);

  const handleSave = (e) => {
    e.preventDefault();
    if (!isAuthorized) {
      alert('Access Denied: Connected wallet is not the authorized Admin wallet!');
      return;
    }
    saveProjectSettings(form);
    if (onSaveSettings) onSaveSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card admin-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="shield-icon-box">
            {isAuthorized ? <Unlock className="text-green" size={24} /> : <Lock className="text-gold" size={24} />}
          </div>
          <div>
            <h3 className="modal-title">Control Gate</h3>
            <p className="modal-subtitle">Cryptographic Verification Required</p>
          </div>
        </div>

        {/* Wallet Auth Status Bar */}
        <div className={`auth-banner ${isAuthorized ? 'auth-ok' : walletAddress ? 'auth-denied' : 'auth-idle'}`}>
          {!walletAddress ? (
            <div className="auth-row">
              <div className="auth-text">
                <span>Connect Phantom wallet to authenticate:</span>
              </div>
              <button className="btn-phantom" onClick={connectWallet} disabled={isConnecting}>
                <Key size={14} />
                <span>{isConnecting ? 'Connecting...' : 'Connect Phantom'}</span>
              </button>
            </div>
          ) : isAuthorized ? (
            <div className="auth-row">
              <div className="auth-text">
                <CheckCircle2 size={16} className="text-green inline mr-1" />
                <span className="text-green font-bold">Authorized Admin:</span>{' '}
                <code>{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</code>
              </div>
              <button className="btn-disconnect" onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          ) : (
            <div className="auth-row">
              <div className="auth-text">
                <AlertCircle size={16} className="text-red inline mr-1" />
                <span className="text-red font-bold">Access Denied:</span>{' '}
                <span>Unauthorized signature</span>
              </div>
              <button className="btn-disconnect" onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Admin Form Fields: ONLY displayed when cryptographically authorized */}
        {isAuthorized ? (
          <form onSubmit={handleSave} className="admin-form">
            <div className="form-group">
              <label>Pump.fun Token CA (Mint Address):</label>
              <input
                type="text"
                value={form.mintAddress || ''}
                onChange={(e) => setForm({ ...form, mintAddress: e.target.value })}
                placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Token Symbol:</label>
                <input
                  type="text"
                  value={form.tokenSymbol || ''}
                  onChange={(e) => setForm({ ...form, tokenSymbol: e.target.value })}
                  placeholder="$DICK"
                />
              </div>
              <div className="form-group">
                <label>Min Spawn Threshold (SOL):</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.minSpawnSol || 0.01}
                  onChange={(e) => setForm({ ...form, minSpawnSol: parseFloat(e.target.value) || 0.01 })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Dedicated Helius RPC API Key (Optional for Zero 429 Lag):</label>
              <input
                type="password"
                value={form.heliusApiKey || ''}
                onChange={(e) => setForm({ ...form, heliusApiKey: e.target.value })}
                placeholder="Helius API Key for dedicated WebSocket streaming"
              />
            </div>

            <div className="form-group">
              <label>Authorized Admin Solana Wallet:</label>
              <input
                type="text"
                value={form.adminWallet || ''}
                onChange={(e) => setForm({ ...form, adminWallet: e.target.value })}
                placeholder="Admin Solana Public Key"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Telegram Link:</label>
                <input
                  type="text"
                  value={form.telegramUrl || ''}
                  onChange={(e) => setForm({ ...form, telegramUrl: e.target.value })}
                  placeholder="https://t.me/yourgroup"
                />
              </div>
              <div className="form-group">
                <label>Twitter / X Link:</label>
                <input
                  type="text"
                  value={form.twitterUrl || ''}
                  onChange={(e) => setForm({ ...form, twitterUrl: e.target.value })}
                  placeholder="https://x.com/yourhandle"
                />
              </div>
            </div>

            {/* 🏆 Prize Pool & Growth Mechanics Section */}
            <div className="admin-section-divider">
              <span className="section-title">🏆 Prize Pool & Race Settings</span>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Total Prize Pool (SOL):</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.prizePoolSol !== undefined ? form.prizePoolSol : 5.0}
                  onChange={(e) => setForm({ ...form, prizePoolSol: parseFloat(e.target.value) || 0 })}
                  placeholder="5.0"
                />
              </div>
              <div className="form-group">
                <label>Top Right Headline Text:</label>
                <input
                  type="text"
                  value={form.prizePoolHeadline || ''}
                  onChange={(e) => setForm({ ...form, prizePoolHeadline: e.target.value })}
                  placeholder="Top 10 biggest dicks wins!"
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Target Length to Win (Inches):</label>
                <input
                  type="number"
                  step="1"
                  value={form.prizePoolTargetInches !== undefined ? form.prizePoolTargetInches : 69.0}
                  onChange={(e) => setForm({ ...form, prizePoolTargetInches: parseFloat(e.target.value) || 69.0 })}
                  placeholder="69.0"
                />
              </div>
              <div className="form-group">
                <label>HODL Growth Speed (Inches / Min):</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.growthRateInchesPerMin !== undefined ? form.growthRateInchesPerMin : 1.5}
                  onChange={(e) => setForm({ ...form, growthRateInchesPerMin: parseFloat(e.target.value) || 1.5 })}
                  placeholder="1.5"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Prize Pool Active:</label>
              <div style={{ display: 'flex', alignItems: 'center', height: '40px', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="prizePoolEnabled"
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#ff007f' }}
                  checked={form.prizePoolEnabled !== false}
                  onChange={(e) => setForm({ ...form, prizePoolEnabled: e.target.checked })}
                />
                <label htmlFor="prizePoolEnabled" style={{ margin: 0, cursor: 'pointer', fontSize: '0.85rem' }}>
                  Enable Prize Pool Race
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Top 5 Payout Split (% 1st, 2nd, 3rd, 4th, 5th):</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div key={idx} style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {idx === 0 ? '1st (40%)' : idx === 1 ? '2nd (25%)' : idx === 2 ? '3rd (15%)' : idx === 3 ? '4th (12%)' : '5th (8%)'}
                    </span>
                    <input
                      type="number"
                      value={form.prizePoolDistribution?.[idx] ?? [40, 25, 15, 12, 8][idx]}
                      onChange={(e) => {
                        const newDist = [...(form.prizePoolDistribution || [40, 25, 15, 12, 8])];
                        newDist[idx] = parseFloat(e.target.value) || 0;
                        setForm({ ...form, prizePoolDistribution: newDist });
                      }}
                      style={{ textAlign: 'center', padding: '6px' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '4px' }}>
              <button
                type="button"
                className="btn-danger-outline"
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  color: '#ef4444',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
                onClick={() => {
                  if (confirm('Are you sure you want to reset the Top 5 Winners and restart the race?')) {
                    const updated = { ...form, prizePoolWinners: [] };
                    setForm(updated);
                    saveProjectSettings(updated);
                    if (onSaveSettings) onSaveSettings(updated);
                    alert('Prize Pool Race has been reset!');
                  }
                }}
              >
                <RefreshCw size={14} />
                <span>Reset Race & Clear Crowned Winners ({form.prizePoolWinners?.length || 0})</span>
              </button>
            </div>

            {savedSuccess && (
              <div className="save-toast">
                <CheckCircle2 size={16} />
                <span>Settings saved & broadcast to all active users!</span>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn-demo-auth"
                onClick={() => {
                  setForm({ ...form, adminWallet: walletAddress || form.adminWallet });
                }}
                title="Set connected wallet as Admin"
              >
                Set My Wallet As Admin
              </button>

              <button type="submit" className="btn-save">
                <Save size={16} />
                <span>Save & Broadcast</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="locked-gate-panel" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '32px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            marginTop: '16px',
            gap: '12px'
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(255, 183, 3, 0.12)',
              border: '1px solid rgba(255, 183, 3, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffb703'
            }}>
              <Lock size={26} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              Access Restricted
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '340px', lineHeight: 1.45 }}>
              Cryptographic signature verification required to access this portal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
