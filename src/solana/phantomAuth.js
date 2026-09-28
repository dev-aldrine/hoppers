import { useState, useEffect, useCallback } from 'react';

// Default Admin settings storage key
const STORAGE_KEY = 'dickcoin_admin_settings_v1';
const BROADCAST_KEY = 'dickcoin_broadcast_channel';

// Fallback / Initial Demo settings
export const DEFAULT_SETTINGS = {
  adminWallet: '3Pxv5rZVxFoBBFf57yE6opeyqqNbDWBGnB4TzvFBQwDN',
  mintAddress: 'DICKpump11111111111111111111111111111111111',
  heliusApiKey: '',
  solUsdPrice: 155,
  minSpawnSol: 0.01,
  telegramUrl: 'https://t.me/dickcoin_pump',
  twitterUrl: 'https://x.com/dickcoin_sol',
  tokenSymbol: '$DICK',
  tokenName: 'DICK COIN',
  prizePoolEnabled: true,
  prizePoolSol: 5.0,
  prizePoolHeadline: 'Top 10 biggest dicks wins!',
  prizePoolTargetInches: 69.0,
  growthRateInchesPerMin: 1.5,
  prizePoolDistribution: [40, 25, 15, 12, 8],
  prizePoolWinners: [],
};

export function getProjectSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {}
  return DEFAULT_SETTINGS;
}

// Fetch shared global settings from server/public settings.json
export async function fetchSharedSettings() {
  const urls = ['/settings.json', '/api/settings'];
  for (const url of urls) {
    try {
      const res = await fetch(`${url}?_t=${Date.now()}`);
      if (res.ok) {
        const remote = await res.json();
        if (remote && remote.mintAddress) {
          const merged = { ...DEFAULT_SETTINGS, ...remote };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
      }
    } catch (e) {}
  }
  return getProjectSettings();
}

// Save project settings globally to server and local storage
export async function saveProjectSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BROADCAST_KEY);
      channel.postMessage({ type: 'SETTINGS_UPDATE', payload: settings });
      channel.close();
    }

    // Persist to server API endpoint for all users globally
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch (apiErr) {
      console.warn('Server settings persistence warning:', apiErr);
    }
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}

export function usePhantomAuth(adminWalletOverride) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const targetAdmin = (adminWalletOverride || DEFAULT_SETTINGS.adminWallet).trim();

  // Check auto-connect if already approved
  useEffect(() => {
    const provider = window.phantom?.solana || window.solana;
    if (provider?.isPhantom && provider.isConnected && provider.publicKey) {
      const pubKey = provider.publicKey.toString();
      setWalletAddress(pubKey);
      setIsAuthorized(pubKey.toLowerCase() === targetAdmin.toLowerCase());
    }
  }, [targetAdmin]);

  const connectWallet = useCallback(async () => {
    const provider = window.phantom?.solana || window.solana;
    if (!provider?.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      return { success: false, reason: 'Phantom not found' };
    }

    setIsConnecting(true);
    try {
      const resp = await provider.connect();
      const pubKey = resp.publicKey.toString();
      setWalletAddress(pubKey);
      const auth = pubKey.toLowerCase() === targetAdmin.toLowerCase();
      setIsAuthorized(auth);
      setIsConnecting(false);
      return { success: true, pubKey, isAuthorized: auth };
    } catch (err) {
      console.error('Phantom connection error:', err);
      setIsConnecting(false);
      return { success: false, error: err.message };
    }
  }, [targetAdmin]);

  const disconnectWallet = useCallback(async () => {
    const provider = window.phantom?.solana || window.solana;
    if (provider) {
      try {
        await provider.disconnect();
      } catch (e) {}
    }
    setWalletAddress(null);
    setIsAuthorized(false);
  }, []);

  return { walletAddress, isAuthorized, isConnecting, connectWallet, disconnectWallet };
}
