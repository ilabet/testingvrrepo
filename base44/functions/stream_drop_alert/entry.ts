import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const webhook = secrets.get("DISCORD_WEBHOOK_URL");
    if (!webhook) {
      return Response.json({ error: 'DISCORD_WEBHOOK_URL is not set' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const proxyUrl = typeof body.proxy_url === 'string' && body.proxy_url ? body.proxy_url : 'unknown proxy';
    const reason = typeof body.reason === 'string' && body.reason ? body.reason.slice(0, 300) : 'connection lost';

    const content = [
      '🔴 **World stream dropped**',
      `**Proxy:** ${proxyUrl}`,
      `**Reason:** ${reason}`,
      `**When:** ${new Date().toISOString()}`,
    ].join('\n').slice(0, 1900);

    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'SecondLife Go', content }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return Response.json({ error: `Discord responded ${res.status}` }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}