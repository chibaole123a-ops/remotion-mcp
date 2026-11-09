import { Tunnel } from 'cloudflared';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

// Automatically load token securely from Windows Keyring via GitHub CLI (never exposed in plaintext files)
if (!process.env.GITHUB_TOKEN) {
  try {
    const token = execSync('gh auth token --user chibaole123a-ops', { encoding: 'utf-8' }).trim();
    if (token) process.env.GITHUB_TOKEN = token;
  } catch (e) {
    console.error('Không thể lấy token từ gh cli:', e);
  }
}

if (!process.env.MCP_SECRET) {
  process.env.MCP_SECRET = 'bao-' + randomBytes(6).toString('hex');
}

async function main() {
  const { startApp } = await import('./server.js');
  startApp();
  const port = Number(process.env.PORT || 3456);

  console.log('⏳ Đang khởi tạo đường hầm HTTPS bảo mật (Cloudflare Tunnel)...');
  const t = Tunnel.quick(`http://localhost:${port}`);

  t.on('url', (publicUrl: string) => {
    process.env.PUBLIC_URL = publicUrl.replace(/\/$/, '');
    console.log('\n============================================================');
    console.log('🎉 REMOTION CLOUD MCP (GITHUB ACTIONS 16GB RAM) ĐÃ SẴN SÀNG!');
    console.log('============================================================');
    console.log(`🔒 Đường link MCP ĐÃ ĐƯỢC MÃ HÓA BẢO MẬT RIÊNG CHO BẠN:`);
    console.log(`\n   ${process.env.PUBLIC_URL}/mcp/${process.env.MCP_SECRET}\n`);
    console.log('============================================================\n');
  });

  t.on('error', (err) => {
    console.error('Tunnel error:', err);
  });

  process.on('SIGINT', () => {
    t.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Lỗi khi khởi động:', err);
  process.exit(1);
});
