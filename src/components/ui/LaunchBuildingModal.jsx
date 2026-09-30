import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CONSTRUCTION_PLOTS } from '../3d/cityData';
import { soundManager } from '../../audio/soundEffects';

// 🏛️ Designated Protocol Treasury Wallet for Construction Permits
export const FEE_RECIPIENT_WALLET = '8CDbnNDvuWP9xyhstPUz5Brjfj9N3F6qxMmBggi7aWbT';
export const LAUNCH_FEE_SOL = 0.02;
export const LAUNCH_FEE_LAMPORTS = Math.round(LAUNCH_FEE_SOL * LAMPORTS_PER_SOL); // 20,000,000 lamports

const BUILDING_TYPES = [
  { id: 'palazzo', name: 'Grand Palazzo', desc: 'Regal Italian marble estate with columns & terrace', icon: '🏛️', color: '#2a9d8f' },
  { id: 'grand_hotel', name: 'Metropolis Hotel', desc: 'Multi-story luxury tower with penthouse suites', icon: '🏨', color: '#00bbf9' },
  { id: 'orange_villa', name: 'Sunset Villa', desc: 'Mediterranean terracotta estate with courtyard', icon: '🏡', color: '#f8961e' },
  { id: 'purple_townhouse', name: 'Cyber Townhouse', desc: 'Multi-level neon townhouse with rooftop garden', icon: '🏢', color: '#9d4edd' },
  { id: 'blue_cottage', name: 'Coastal Cottage', desc: 'Breezy seaside manor with pitched gables', icon: '🏠', color: '#70d6ff' },
  { id: 'barber_shop', name: 'Token Emporium', desc: 'Bustling commercial boutique & storefront', icon: '💈', color: '#ef476f' },
];

const COLOR_THEMES = [
  { name: 'Solana Gold', hex: '#ffd166' },
  { name: 'Cyber Emerald', hex: '#06d6a0' },
  { name: 'Neon Pink', hex: '#f72585' },
  { name: 'Electric Cyan', hex: '#00f5d4' },
  { name: 'Royal Purple', hex: '#7209b7' },
  { name: 'Sunset Orange', hex: '#f3722c' },
];

export function LaunchBuildingModal({
  isOpen,
  onClose,
  walletAddress,
  isConnecting,
  onConnectWallet,
  onDisconnectWallet,
  selectedPlotId = null,
  launchedBuildings = {},
  onLaunchBuilding,
  settings = null,
}) {
  const [selectedType, setSelectedType] = useState('palazzo');
  const [targetPlotId, setTargetPlotId] = useState(() => {
    return selectedPlotId || CONSTRUCTION_PLOTS[0]?.id || '';
  });
  const [buildingName, setBuildingName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_THEMES[0].hex);
  const [isProcessingTx, setIsProcessingTx] = useState(false);
  const [txStep, setTxStep] = useState('idle'); // 'idle' | 'awaiting_signature' | 'confirming' | 'success' | 'error'
  const [txSignature, setTxSignature] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasCopiedFeeWallet, setHasCopiedFeeWallet] = useState(false);

  // Update target plot when selectedPlotId prop changes
  useEffect(() => {
    if (selectedPlotId) {
      setTargetPlotId(selectedPlotId);
    }
  }, [selectedPlotId]);

  // Reset transient states on open/close
  useEffect(() => {
    if (isOpen) {
      setIsProcessingTx(false);
      setTxStep('idle');
      setTxSignature(null);
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPlot = CONSTRUCTION_PLOTS.find((p) => p.id === targetPlotId);
  const isPlotOccupied = Boolean(launchedBuildings[targetPlotId]);

  const copyFeeWallet = () => {
    navigator.clipboard?.writeText(FEE_RECIPIENT_WALLET);
    setHasCopiedFeeWallet(true);
    setTimeout(() => setHasCopiedFeeWallet(false), 2000);
  };

  const handleLaunchWithPayment = async () => {
    setErrorMessage('');

    if (!walletAddress) {
      if (onConnectWallet) {
        onConnectWallet();
      }
      return;
    }

    if (!targetPlotId) {
      setErrorMessage('⚠️ Please select an available construction plot.');
      return;
    }

    const provider = window.phantom?.solana || window.solana;
    if (!provider || !provider.isPhantom) {
      setErrorMessage('⚠️ Phantom wallet extension is required. Please install or unlock Phantom.');
      window.open('https://phantom.app/', '_blank');
      return;
    }

    setIsProcessingTx(true);
    setTxStep('awaiting_signature');

    try {
      // 1. Establish RPC connection with fallback redundancy
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
      let activeConnection = null;

      for (const rpc of rpcEndpoints) {
        try {
          const conn = new Connection(rpc, 'confirmed');
          const bh = await conn.getLatestBlockhash('confirmed');
          if (bh && bh.blockhash) {
            latestBlockhashInfo = bh;
            activeConnection = conn;
            break;
          }
        } catch (rpcErr) {
          console.warn(`[LaunchModal] RPC ${rpc} connection check failed:`, rpcErr);
        }
      }

      if (!latestBlockhashInfo || !activeConnection) {
        throw new Error('Unable to connect to Solana network. Please check your internet or try again.');
      }

      // 2. Construct 0.02 SOL transfer transaction
      const senderPublicKey = provider.publicKey || new PublicKey(walletAddress);
      const recipientPublicKey = new PublicKey(FEE_RECIPIENT_WALLET);

      const transferInstruction = SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: recipientPublicKey,
        lamports: LAUNCH_FEE_LAMPORTS,
      });

      const transaction = new Transaction().add(transferInstruction);
      transaction.recentBlockhash = latestBlockhashInfo.blockhash;
      transaction.feePayer = senderPublicKey;

      // 3. Request Phantom wallet user approval & broadcast
      setTxStep('awaiting_signature');
      const { signature } = await provider.signAndSendTransaction(transaction);

      setTxSignature(signature);
      setTxStep('confirming');

      // 4. Await transaction confirmation on-chain
      try {
        await activeConnection.confirmTransaction(
          {
            blockhash: latestBlockhashInfo.blockhash,
            lastValidBlockHeight: latestBlockhashInfo.lastValidBlockHeight,
            signature,
          },
          'confirmed'
        );
      } catch (confirmErr) {
        console.warn('[LaunchModal] Confirmation wait warning (tx already signed):', confirmErr);
      }

      // 5. Success! Construct & record building
      setTxStep('success');

      const finalName = buildingName.trim() || `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}'s Estate`;

      const newBuilding = {
        plotId: targetPlotId,
        type: selectedType,
        customName: finalName,
        color: selectedColor,
        tint: selectedColor,
        ownerWallet: walletAddress,
        launchedAt: Date.now(),
        feePaidSol: LAUNCH_FEE_SOL,
        feeRecipient: FEE_RECIPIENT_WALLET,
        txSignature: signature,
        scale: selectedType === 'grand_hotel' ? [2.4, 2.9, 2.4] : selectedType === 'palazzo' ? [2.6, 2.6, 2.6] : [2.4, 2.4, 2.4],
      };

      onLaunchBuilding(newBuilding);

      // 🎆 Celebratory Effects
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#00f5d4', '#ffd166', '#f72585', '#7209b7'],
      });
      soundManager?.playBuyChime?.();

      setTimeout(() => {
        setIsProcessingTx(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('[LaunchModal] Transaction failed:', err);
      setTxStep('error');
      setIsProcessingTx(false);

      if (err?.message?.includes('User rejected') || err?.code === 4001) {
        setErrorMessage('Transaction was cancelled in Phantom.');
      } else if (err?.message?.includes('insufficient funds') || err?.message?.includes('0x1')) {
        setErrorMessage('Insufficient SOL balance in Phantom for 0.02 SOL fee + gas.');
      } else {
        setErrorMessage(err?.message || 'Transaction failed. Please try again.');
      }
    }
  };

  return (
    <div className="launch-modal-backdrop" onClick={onClose}>
      <div className="launch-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="launch-modal-header">
          <div className="launch-modal-title-group">
            <span className="launch-modal-badge">🏗️ PUMPTOWN METROPOLIS</span>
            <h2 className="launch-modal-title">Launch a Building</h2>
          </div>
          <button className="launch-modal-close-btn" onClick={onClose} aria-label="Close" disabled={isProcessingTx}>
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="launch-modal-body">
          {/* 1. Phantom Wallet Section */}
          <div className="launch-section launch-wallet-section">
            <div className="section-label-row">
              <span className="section-num">1</span>
              <span className="section-label">Phantom Solana Wallet</span>
            </div>

            {walletAddress ? (
              <div className="wallet-connected-banner">
                <div className="wallet-info">
                  <div className="wallet-status-dot connected" />
                  <div>
                    <div className="wallet-status-text">Wallet Connected</div>
                    <div className="wallet-address-chip" title={walletAddress}>
                      👻 {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-disconnect-wallet"
                  onClick={onDisconnectWallet}
                  disabled={isProcessingTx}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="wallet-connect-prompt">
                <p className="wallet-prompt-desc">
                  Connect your Phantom wallet to claim land & deploy your building live on-chain in Pumptown.
                </p>
                <button
                  type="button"
                  className="btn-connect-phantom-glow"
                  onClick={onConnectWallet}
                  disabled={isConnecting}
                >
                  <span className="phantom-ghost-icon">👻</span>
                  {isConnecting ? 'Connecting to Phantom...' : 'Connect Phantom Wallet'}
                </button>
              </div>
            )}
          </div>

          {/* 2. Construction Plot Selection */}
          <div className="launch-section">
            <div className="section-label-row">
              <span className="section-num">2</span>
              <span className="section-label">Select Construction Plot</span>
              <span className="section-subtext">{CONSTRUCTION_PLOTS.length} prime plots across expanded map</span>
            </div>

            <div className="plot-selector-grid">
              {CONSTRUCTION_PLOTS.map((plot) => {
                const isOccupied = Boolean(launchedBuildings[plot.id]);
                const isSelected = plot.id === targetPlotId;

                return (
                  <button
                    key={plot.id}
                    type="button"
                    className={`plot-select-card ${isSelected ? 'selected' : ''} ${isOccupied ? 'occupied' : ''}`}
                    onClick={() => setTargetPlotId(plot.id)}
                    disabled={isProcessingTx}
                  >
                    <div className="plot-card-header">
                      <span className="plot-card-name">{plot.name}</span>
                      {isOccupied ? (
                        <span className="plot-status-tag occupied">BUILT</span>
                      ) : (
                        <span className="plot-status-tag available">OPEN</span>
                      )}
                    </div>
                    <div className="plot-card-district">{plot.district}</div>
                    {isOccupied && launchedBuildings[plot.id]?.customName && (
                      <div className="plot-card-owner">
                        🏛️ {launchedBuildings[plot.id].customName}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Building Architecture Model Selection */}
          <div className="launch-section">
            <div className="section-label-row">
              <span className="section-num">3</span>
              <span className="section-label">Choose Architecture</span>
            </div>

            <div className="building-type-grid">
              {BUILDING_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className={`building-type-card ${selectedType === type.id ? 'active' : ''}`}
                  onClick={() => setSelectedType(type.id)}
                  disabled={isProcessingTx}
                >
                  <span className="type-card-icon">{type.icon}</span>
                  <div className="type-card-content">
                    <span className="type-card-title">{type.name}</span>
                    <span className="type-card-desc">{type.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Name & Color Customization */}
          <div className="launch-section">
            <div className="section-label-row">
              <span className="section-num">4</span>
              <span className="section-label">Building Identity & Colors</span>
            </div>

            <div className="identity-form-row">
              <div className="input-group">
                <label className="input-label">Building Name / Brand</label>
                <input
                  type="text"
                  className="launch-text-input"
                  placeholder="e.g., Solana Diamond Penthouse"
                  value={buildingName}
                  maxLength={32}
                  disabled={isProcessingTx}
                  onChange={(e) => setBuildingName(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Colorway Tint</label>
                <div className="color-picker-row">
                  {COLOR_THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      type="button"
                      className={`color-swatch-btn ${selectedColor === theme.hex ? 'selected' : ''}`}
                      style={{ backgroundColor: theme.hex }}
                      title={theme.name}
                      disabled={isProcessingTx}
                      onClick={() => setSelectedColor(theme.hex)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Protocol Launch Fee & Deed Verification */}
          <div className="launch-section launch-fee-section">
            <div className="section-label-row">
              <span className="section-num">5</span>
              <span className="section-label">Construction Permit & Deed Fee</span>
            </div>

            <div className="launch-fee-card">
              <div className="fee-card-main">
                <div className="fee-sol-amount-box">
                  <span className="fee-sol-icon">◎</span>
                  <span className="fee-sol-value">{LAUNCH_FEE_SOL} SOL</span>
                  <span className="fee-sol-label">Launch Fee</span>
                </div>
                <div className="fee-details-col">
                  <div className="fee-detail-line">
                    <span className="fee-detail-title">Protocol Treasury Address:</span>
                    <div className="fee-wallet-chip" onClick={copyFeeWallet} title="Click to Copy">
                      <code>{FEE_RECIPIENT_WALLET.slice(0, 8)}...{FEE_RECIPIENT_WALLET.slice(-8)}</code>
                      <button type="button" className="btn-copy-fee-wallet">
                        {hasCopiedFeeWallet ? '✓ Copied' : '📋'}
                      </button>
                    </div>
                  </div>
                  <div className="fee-perks-line">
                    <span>✨ Permanent 3D Landmark</span>
                    <span>•</span>
                    <span>🏷️ Custom On-Chain Overhead Tag</span>
                    <span>•</span>
                    <span>⚡ Instant Deed</span>
                  </div>
                </div>
              </div>

              {/* Live Transaction Status Tracking */}
              {isProcessingTx && (
                <div className={`tx-status-banner ${txStep}`}>
                  <div className="tx-status-spinner" />
                  <div className="tx-status-content">
                    {txStep === 'awaiting_signature' && (
                      <div className="tx-status-text">
                        <strong>Awaiting Phantom Approval:</strong> Please confirm the 0.02 SOL transfer in your Phantom wallet popup.
                      </div>
                    )}
                    {txStep === 'confirming' && (
                      <div className="tx-status-content">
                        <div className="tx-status-text">
                          <strong>Confirming on Solana:</strong> Finalizing transaction block...
                        </div>
                        {txSignature && (
                          <a
                            href={`https://solscan.io/tx/${txSignature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tx-solscan-link"
                          >
                            View on Solscan ↗
                          </a>
                        )}
                      </div>
                    )}
                    {txStep === 'success' && (
                      <div className="tx-status-text success">
                        <strong>🎉 Payment Confirmed!</strong> Constructing your building in Pumptown...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="launch-status-msg error">
              ⚠️ {errorMessage}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="launch-modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={isProcessingTx}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn-launch-confirm ${isProcessingTx ? 'processing' : ''}`}
            onClick={handleLaunchWithPayment}
            disabled={!walletAddress || isProcessingTx}
          >
            {isProcessingTx ? (
              <>
                <span className="btn-spinner" />
                <span>
                  {txStep === 'awaiting_signature'
                    ? 'Approve in Phantom...'
                    : txStep === 'confirming'
                    ? 'Confirming 0.02 SOL Tx...'
                    : 'Constructing Building...'}
                </span>
              </>
            ) : walletAddress ? (
              <>
                <span>🚀</span>
                <span>Pay 0.02 SOL & Launch Building</span>
              </>
            ) : (
              <>
                <span>👻</span>
                <span>Connect Phantom to Launch (0.02 SOL)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LaunchBuildingModal;
