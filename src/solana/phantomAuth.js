import { useState, useEffect, useCallback } from 'react';

// Default Admin settings storage key
const STORAGE_KEY = 'dickcoin_admin_settings_v1';
const BROADCAST_KEY = 'dickcoin_broadcast_channel';

// Fallback / Initial Demo settings
export const DEFAULT_SETTINGS = {
  adminWallet: '3Pxv5rZVxFoBBFf57yE6opeyqqNbDWBGnB4TzvFBQwDN',
  mintAddress: '',
  heliusApiKey: '',
  solUsdPrice: 155,
  minSpawnSol: 0.01,
  telegramUrl: 'https://t.me/GrowersOnSol',
  twitterUrl: 'https://x.com/Growers_sol',
  tokenSymbol: '$GROWERS',
  tokenName: 'GROWERS',
  prizePoolEnabled: true,
  prizePoolSol: 5.0,
  prizePoolHeadline: 'Top 10 biggest dicks wins!',
  prizePoolTargetInches: 69.0,
  growthRateInchesPerMin: 1.5,
  prizePoolDistribution: [40, 25, 15, 12, 8],
  prizePoolWinners: [],
  updatedAt: 0,
};

export function getProjectSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {}
  return DEFAULT_SETTINGS;
}

// Fetch shared global settings with strict timestamp precedence (Never overwrites newer local changes)
export async function fetchSharedSettings() {
  const localSettings = getProjectSettings();
  const localUpdatedAt = Number(localSettings?.updatedAt) || 0;

  // 1. Try dynamic serverless API first
  try {
    const res = await fetch(`/api/settings?_t=${Date.now()}`);
    if (res.ok) {
      const remote = await res.json();
      const remoteUpdatedAt = Number(remote?.updatedAt) || 0;
      if (remote && remoteUpdatedAt > localUpdatedAt) {
        const merged = { ...DEFAULT_SETTINGS, ...remote, updatedAt: remoteUpdatedAt };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (e) {}

  // 2. If user already modified/saved local settings, NEVER overwrite with initial static build file!
  if (localUpdatedAt > 0) {
    return localSettings;
  }

  // 3. Initial first-time load only if localStorage has never been saved
  try {
    const res = await fetch(`/settings.json?_t=${Date.now()}`);
    if (res.ok) {
      const initialJson = await res.json();
      if (initialJson) {
        const merged = { ...DEFAULT_SETTINGS, ...initialJson, updatedAt: 1 };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (e) {}

  return localSettings;
}

// Save project settings globally to server and local storage
export async function saveProjectSettings(settings) {
  try {
    const updatedSettings = {
      ...settings,
      updatedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));

    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BROADCAST_KEY);
      channel.postMessage({ type: 'SETTINGS_UPDATE', payload: updatedSettings });
      channel.close();
    }

    // Persist to server API endpoint for all users globally
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
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
