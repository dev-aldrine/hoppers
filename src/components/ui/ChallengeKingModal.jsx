import React, { useState } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import confetti from 'canvas-confetti';
import { soundManager } from '../../audio/soundEffects';

export const FEE_RECIPIENT_WALLET = '8CDbnNDvuWP9xyhstPUz5Brjfj9N3F6qxMmBggi7aWbT';

export function ChallengeKingModal({
  isOpen,
  onClose,
  walletAddress,
  isConnecting,
  onConnectWallet,
  onDethroneKing,
  crownedKing,
  timerSeconds,
  accumulatedFeesSol,
  settings,
}) {
  const [customBuySol, setCustomBuySol] = useState('0.25');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStep, setTxStep] = useState('idle'); // 'idle' | 'awaiting_signature' | 'confirming' | 'success'
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const solAmountNum = Math.max(0.25, parseFloat(customBuySol) || 0.25);

  const handleLiveOnChainChallenge = async () => {
    setErrorMsg('');

    if (!walletAddress) {
      if (onConnectWallet) onConnectWallet();
      return;
    }

    const provider = window.phantom?.solana || window.solana;
    if (!provider || !provider.isPhantom) {
      setErrorMsg('Phantom wallet is required. Please install or unlock Phantom.');
      window.open('https://phantom.app/', '_blank');
      return;
    }

    setIsProcessing(true);
    setTxStep('awaiting_signature');

    try {
      const rpcEndpoints = [
        settings?.heliusApiKey
          ? settings.heliusApiKey.startsWith('http')
            ? settings.heliusApiKey
            : `https://mainnet.helius-rpc.com/?api-key=${settings.heliusApiKey.trim()}`
          : null,
        'https://rpc.ankr.com/solana',
        'https://api.mainnet-beta.solana.com',
        'https://1rpc.io/sol',
      ].filter(Boolean);

      let latestBlockhashInfo = null;
      let activeConn = null;

      for (const rpc of rpcEndpoints) {
        try {
          const conn = new Connection(rpc, 'confirmed');
          const bh = await conn.getLatestBlockhash('confirmed');
          if (bh && bh.blockhash) {
            latestBlockhashInfo = bh;
            activeConn = conn;
            break;
          }
        } catch (e) {}
      }

      if (!latestBlockhashInfo || !activeConn) {
        throw new Error('Solana network unreachable. Try again in a moment.');
      }

      const senderPubkey = provider.publicKey || new PublicKey(walletAddress);
      const recipientPubkey = new PublicKey(FEE_RECIPIENT_WALLET);
      const lamports = Math.round(solAmountNum * LAMPORTS_PER_SOL);

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );
      tx.recentBlockhash = latestBlockhashInfo.blockhash;
      tx.feePayer = senderPubkey;

      setTxStep('awaiting_signature');
      const { signature } = await provider.signAndSendTransaction(tx);
      setTxStep('confirming');

      try {
        await activeConn.confirmTransaction(
          {
            blockhash: latestBlockhashInfo.blockhash,
            lastValidBlockHeight: latestBlockhashInfo.lastValidBlockHeight,
            signature,
          },
          'confirmed'
        );
      } catch (e) {}

      setTxStep('success');

      // Trigger Dethrone & King Ascension
      onDethroneKing(walletAddress, solAmountNum);

      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('[ChallengeKingModal] Error:', err);
      setIsProcessing(false);
      setTxStep('idle');
      if (err?.message?.includes('User rejected') || err?.code === 4001) {
        setErrorMsg('Transaction was cancelled in Phantom.');
      } else {
        setErrorMsg(err?.message || 'Transaction failed. Check balance.');
      }
    }
  };

  const handleInstantDemoChallenge = () => {
    const testWallet = walletAddress || `${Math.random().toString(36).substring(2, 6)}Sol${Math.random().toString(36).substring(2, 6)}pump`;
    onDethroneKing(testWallet, solAmountNum);
    onClose();
  };

  return (
    <div className="launch-modal-backdrop" onClick={onClose}>
      <div className="launch-modal-container challenge-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="launch-modal-header">
          <div className="launch-modal-title-group">
            <span className="launch-modal-badge">👑 CROWNED</span>
            <h2 className="launch-modal-title">Dethrone & Claim The Crown</h2>
          </div>
          <button className="launch-modal-close-btn" onClick={onClose} aria-label="Close" disabled={isProcessing}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="launch-modal-body">
          {/* King Crown Banner */}
          {(() => {
            const rawMint = settings?.mintAddress?.trim() || '';
            const isRealCA = Boolean(rawMint && rawMint.length >= 32 && !rawMint.toLowerCase().includes('updating'));

            return (
              <div className="challenge-king-spotlight">
                <div className="challenge-crown-icon">👑</div>
                <div className="challenge-king-info">
                  <span className="challenge-king-sub">Current Crown Holder</span>
                  <div className="challenge-king-name">
                    {isRealCA && crownedKing?.wallet
                      ? `${crownedKing.wallet.slice(0, 6)}...${crownedKing.wallet.slice(-6)}`
                      : 'Last buyer (no timer)'}
                  </div>
                  {isRealCA && (
                    <div className="challenge-king-stat-row">
                      <span>🔥 Buy: {crownedKing?.buyAmountSol || 0.25} SOL</span>
                      <span>•</span>
                      <span>⏱️ {timerSeconds.toFixed(1)}s remaining</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Rules / Mechanic Card */}
          <div className="challenge-rules-card">
            <h4 className="rules-card-title">📜 Crown Rules & Settlement:</h4>
            <ul className="rules-list">
              <li>🏆 <strong>Buy minimum 0.25 SOL</strong> on Pump.fun or via instant dethrone to knock the current King off the mountain.</li>
              <li>⏱️ <strong>60-Second Timer Resets:</strong> Hold the peak for 60 seconds without being dethroned by another 0.25+ buyer.</li>
              <li>💰 <strong>0.30% Creator Fee Redirection:</strong> 100% of all Pump.fun bonding curve creator reward fees (<strong>0.30% of trading volume = {accumulatedFeesSol >= 0.2 ? `◎ ${accumulatedFeesSol.toFixed(3)} SOL` : 'Accumulating...'}</strong>) are redirected directly to the winner's wallet!</li>
            </ul>
          </div>

          {/* Buy Amount Input */}
          <div className="challenge-input-section">
            <label className="input-label">Select Buy Amount (Min. 0.25 SOL):</label>
            <div className="challenge-presets-row">
              {['0.25', '0.50', '1.00', '2.50'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`preset-btn ${customBuySol === preset ? 'active' : ''}`}
                  onClick={() => setCustomBuySol(preset)}
                  disabled={isProcessing}
                >
                  ◎ {preset} SOL
                </button>
              ))}
            </div>
            <div className="custom-input-wrap">
              <input
                type="number"
                min="0.25"
                step="0.05"
                className="launch-text-input"
                placeholder="0.25"
                value={customBuySol}
                disabled={isProcessing}
                onChange={(e) => setCustomBuySol(e.target.value)}
              />
              <span className="input-unit-tag">SOL</span>
            </div>
          </div>

          {errorMsg && (
            <div className="launch-status-msg error">
              ⚠️ {errorMsg}
            </div>
          )}

          {isProcessing && (
            <div className="tx-status-banner confirming">
              <div className="tx-status-spinner" />
              <div className="tx-status-content">
                <span className="tx-status-text">
                  {txStep === 'awaiting_signature'
                    ? 'Please approve the transaction in Phantom...'
                    : 'Confirming on-chain & crowning new King...'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="launch-modal-footer challenge-footer">
          <button
            type="button"
            className="btn-demo-challenge"
            onClick={handleInstantDemoChallenge}
            disabled={isProcessing}
            title="Instant Challenge for Demonstration"
          >
            ⚡ Instant Demo Dethrone
          </button>
          <button
            type="button"
            className="btn-launch-confirm crown-btn"
            onClick={handleLiveOnChainChallenge}
            disabled={isProcessing}
          >
            <span>👑</span>
            <span>{walletAddress ? `Buy ${solAmountNum} SOL & Become King` : 'Connect Phantom & Dethrone'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChallengeKingModal;
