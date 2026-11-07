import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { proxy_base_url, first_name, last_name, password, grid, custom_login_uri } = await req.json();
    if (!proxy_base_url || !first_name || !password) {
      return Response.json({ success: false, message: 'Missing proxy URL or avatar credentials' }, { status: 400 });
    }

    const endpoint = proxy_base_url.replace(/\/$/, '') + '/login';
    let resp;
    try {
      resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name, last_name: last_name || 'Resident', password, grid, custom_login_uri }),
      });
    } catch (_e) {
      return Response.json({ success: false, message: 'Could not reach the proxy server at ' + endpoint }, { status: 502 });
    }

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (_e) {
      return Response.json({ success: false, message: 'Proxy returned a non-JSON response', raw: text.slice(0, 500) }, { status: 502 });
    }

    if (data.ws_url || data.websocket_url) {
      try {
        await base44.entities.SLSession.create({
          first_name,
          last_name: last_name || 'Resident',
          grid,
          session_token: data.session_token || '',
          agent_id: data.agent_id || '',
          status: 'logged_in',
          avatar_name: data.avatar_name || `${first_name} ${last_name || 'Resident'}`,
          last_location: data.region || 'unknown',
        });
      } catch (_e) {
        // persistence is best-effort
      }
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ success: false, message: error.message || 'Proxy connect error' }, { status: 500 });
  }
});