import fs from 'fs';

const assetName = (process.env.PAYLOAD_ASSET_NAME || '').trim();
const repo = process.env.GITHUB_REPOSITORY || 'chibaole123a-ops/remotion-mcp';
const ghToken = process.env.GH_TOKEN || '';

async function fetchPayloadJson() {
  const cdnUrl = `https://github.com/${repo}/releases/download/videos-store/${encodeURIComponent(assetName)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(cdnUrl, {
        headers: { 'User-Agent': 'Remotion-Cloud-Runner' },
        redirect: 'follow',
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    await new Promise((r) => setTimeout(r, attempt * 1000));
  }

  // Fallback to GitHub Releases API in case release CDN edge lags
  if (ghToken) {
    const tagRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/videos-store`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${ghToken}`,
        'User-Agent': 'Remotion-Cloud-Runner',
      },
    });
    if (tagRes.ok) {
      const tagData = await tagRes.json();
      const found = (tagData.assets || []).find((a) => a.name === assetName);
      if (found?.url) {
        const binRes = await fetch(found.url, {
          headers: {
            Accept: 'application/octet-stream',
            Authorization: `Bearer ${ghToken}`,
            'User-Agent': 'Remotion-Cloud-Runner',
          },
          redirect: 'follow',
        });
        if (binRes.ok) {
          return await binRes.json();
        }
      }
    }
  }

  throw new Error(`Could not download offloaded job payload asset: ${assetName}`);
}

async function main() {
  if (!assetName) {
    console.log('⚡ Inline workflow payload mode (under 36 KB).');
    return;
  }

  fs.mkdirSync('outputs', { recursive: true });
  console.log(`📦 Hydrating offloaded job payload from Release asset: ${assetName}`);
  const payload = await fetchPayloadJson();

  if (typeof payload.tsxCode === 'string' && payload.tsxCode.length > 0) {
    fs.writeFileSync('outputs/hydrated-tsx.txt', payload.tsxCode, 'utf-8');
    console.log(`✅ Hydrated tsxCode (${payload.tsxCode.length} chars)`);
  }
  if (payload.audioConfig && typeof payload.audioConfig === 'object') {
    fs.writeFileSync('outputs/hydrated-audio.json', JSON.stringify(payload.audioConfig), 'utf-8');
    console.log(`✅ Hydrated audioConfig (${(payload.audioConfig.scenes || []).length} scenes)`);
  }
  if (payload.audioMastering && typeof payload.audioMastering === 'object') {
    fs.writeFileSync('outputs/hydrated-mastering.json', JSON.stringify(payload.audioMastering), 'utf-8');
  }
  if (payload.stitchConfig && typeof payload.stitchConfig === 'object') {
    fs.writeFileSync('outputs/hydrated-stitch.json', JSON.stringify(payload.stitchConfig), 'utf-8');
    console.log(`✅ Hydrated stitchConfig (${(payload.stitchConfig.chapters || []).length} chapters)`);
  }
}

main().catch((err) => {
  console.error('❌ Payload hydration failed:', err?.message || err);
  process.exit(1);
});
