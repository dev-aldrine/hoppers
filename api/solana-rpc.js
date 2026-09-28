// Vercel Serverless Function for Solana RPC Proxy
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const targets = [
    'https://solana-rpc.publicnode.com',
    'https://api.mainnet-beta.solana.com',
    'https://1rpc.io/sol',
  ];

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  for (const target of targets) {
    try {
      const upstream = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (upstream.ok) {
        const data = await upstream.text();
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(data);
      }
    } catch (err) {}
  }

  return res.status(200).json({ jsonrpc: '2.0', result: null, id: 1 });
}
