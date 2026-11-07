import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const GRIDS = {
  agni: 'https://login.agni.lindenlab.com/cgi-bin/login.cgi',
  aditi: 'https://login.aditi.lindenlab.com/cgi-bin/login.cgi',
  osgrid: 'http://login.osgrid.org/cgi-bin/login.cgi',
};

// ---------- Minimal MD5 (RFC 1321) ----------
function md5(str) {
  function safeAdd(x, y) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRol(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
  function cmn(q, a, b, x, s, t) { return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
  function core(x, len) {
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < x.length; i += 16) {
      const oa = a, ob = b, oc = c, od = d;
      a = ff(a, b, c, d, x[i], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
      a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i], 20, -373897302);
      a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
      a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i], 11, -358537222);
      c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = hh(a, b, c, d, x[i + 9], 4, -640364487); d = hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
      a = ii(a, b, c, d, x[i], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
      c = ii(c, d, a, b, x[i + 14], 15, -1416354905); b = ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
      c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = ii(a, b, c, d, x[i + 8], 6, 1873313359); d = ii(d, a, b, c, x[i + 15], 10, -30611744);
      c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
      c = ii(c, d, a, b, x[i + 2], 15, 718787259); b = ii(b, c, d, a, x[i + 9], 21, -343485551);
      a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
    }
    return [a, b, c, d];
  }
  function rstr2binl(input) {
    const out = [];
    for (let i = 0; i < input.length * 8; i += 8) out[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (i % 32);
    return out;
  }
  function binl2rstr(input) {
    let out = '';
    for (let i = 0; i < input.length * 32; i += 8) out += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xff);
    return out;
  }
  function rstr(s) { return binl2rstr(core(rstr2binl(s), s.length * 8)); }
  function toHex(input) {
    const tab = '0123456789abcdef';
    let out = '';
    for (let i = 0; i < input.length; i++) {
      const x = input.charCodeAt(i);
      out += tab.charAt((x >>> 4) & 0xf) + tab.charAt(x & 0xf);
    }
    return out;
  }
  const utf8 = unescape(encodeURIComponent(str));
  return toHex(rstr(utf8));
}

// ---------- Minimal XMLRPC response parser ----------
function decodeXml(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function parseXmlRpc(xml) {
  let i = 0;
  const s = xml;
  const skipWs = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const skipProlog = () => {
    while (i < s.length) {
      skipWs();
      if (s.startsWith('<?', i)) i = s.indexOf('?>', i) + 2;
      else if (s.startsWith('<!--', i)) i = s.indexOf('-->', i) + 3;
      else break;
    }
  };
  const expectOpen = (tag) => {
    skipWs();
    if (!s.startsWith('<' + tag, i)) throw new Error('Expected <' + tag + '>');
    i = s.indexOf('>', i) + 1;
  };
  const expectClose = (tag) => {
    skipWs();
    const close = '</' + tag + '>';
    if (!s.startsWith(close, i)) throw new Error('Expected </' + tag + '>');
    i += close.length;
  };
  // Reads the text of a simple tag, tolerating self-closing tags (<string/>).
  const readText = (tag) => {
    const openEnd = s.indexOf('>', i);
    if (openEnd === -1) throw new Error('Unclosed <' + tag + '>');
    const selfClosing = s[openEnd - 1] === '/';
    i = openEnd + 1;
    if (selfClosing) return '';
    const close = '</' + tag + '>';
    const end = s.indexOf(close, i);
    if (end === -1) throw new Error('Unclosed <' + tag + '>');
    const text = s.slice(i, end);
    i = end + close.length;
    return text;
  };
  const parseValue = () => {
    skipWs();
    if (!s.startsWith('<value', i)) throw new Error('Expected <value>');
    i = s.indexOf('>', i) + 1;
    skipWs();
    let result;
    if (s.startsWith('<struct', i)) {
      result = parseStruct();
    } else if (s.startsWith('<array', i)) {
      result = parseArray();
    } else if (s.startsWith('<string', i)) {
      const text = readText('string');
      result = decodeXml(text.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1'));
    } else if (s.startsWith('<boolean', i)) {
      result = readText('boolean').trim() === '1';
    } else if (s.startsWith('<int', i) || s.startsWith('<i4', i)) {
      const tag = s.slice(i + 1, s.indexOf('>', i)).replace(/\s[\s\S]*$/, '').replace(/\/$/, '');
      result = parseInt(readText(tag).trim(), 10);
    } else if (s.startsWith('<double', i)) {
      result = parseFloat(readText('double').trim());
    } else {
      const end = s.indexOf('</value>', i);
      result = decodeXml(s.slice(i, end).trim());
      i = end;
    }
    skipWs();
    expectClose('value');
    return result;
  };
  const parseStruct = () => {
    expectOpen('struct');
    const obj = {};
    skipWs();
    while (s.startsWith('<member', i)) {
      i = s.indexOf('>', i) + 1;
      skipWs();
      expectOpen('name');
      const nameEnd = s.indexOf('</name>', i);
      const name = s.slice(i, nameEnd).trim();
      i = nameEnd + '</name>'.length;
      skipWs();
      obj[name] = parseValue();
      skipWs();
      expectClose('member');
      skipWs();
    }
    expectClose('struct');
    return obj;
  };
  const parseArray = () => {
    expectOpen('array');
    skipWs();
    expectOpen('data');
    skipWs();
    const arr = [];
    while (s.startsWith('<value', i)) { arr.push(parseValue()); skipWs(); }
    expectClose('data');
    expectClose('array');
    return arr;
  };
  skipProlog();
  expectOpen('methodResponse');
  skipWs();
  expectOpen('params');
  skipWs();
  expectOpen('param');
  return parseValue();
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { first_name, last_name, password, grid, custom_login_uri } = body;
    if (!first_name || !password) {
      return Response.json({ success: false, message: 'Missing avatar name or password' }, { status: 400 });
    }

    const loginUri = grid === 'custom' ? custom_login_uri : GRIDS[grid];
    if (!loginUri) return Response.json({ success: false, message: 'Unknown grid' }, { status: 400 });

    const passwordHash = '$1$' + md5(password);

    const xml = `<?xml version="1.0"?>
<methodCall>
  <methodName>login_to_simulator</methodName>
  <params>
    <param>
      <value>
        <struct>
          <member><name>first</name><value><string>${escapeXml(first_name)}</string></value></member>
          <member><name>last</name><value><string>${escapeXml(last_name || 'Resident')}</string></value></member>
          <member><name>passwd</name><value><string>${passwordHash}</string></value></member>
          <member><name>start</name><value><string>last</string></value></member>
          <member><name>channel</name><value><string>Second Life Mobile Viewer</string></value></member>
          <member><name>version</name><value><string>1.0.0</string></value></member>
          <member><name>platform</name><value><string>Mobile</string></value></member>
          <member><name>platform_version</name><value><string>1.0</string></value></member>
          <member><name>mac</name><value><string>00000000-0000-0000-0000-000000000000</string></value></member>
          <member><name>id0</name><value><string>00000000-0000-0000-0000-000000000000</string></value></member>
          <member><name>agree_to_tos</name><value><boolean>1</boolean></member>
          <member><name>read_critical</name><value><boolean>1</boolean></member>
          <member><name>viewer_digest</name><value><string></string></value></member>
        </struct>
      </value>
    </param>
  </params>
</methodCall>`;

    const resp = await fetch(loginUri, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml', 'User-Agent': 'Second Life Mobile Viewer/1.0.0' },
      body: xml,
    });

    const xmlText = await resp.text();

    // The grid answers with an HTML error page instead of XML-RPC when it
    // refuses or throttles a login attempt (e.g. "Your request failed to rez.").
    if (!/<methodResponse/i.test(xmlText)) {
      const plain = decodeXml(xmlText.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
      const refused = /failed to rez|internal server error/i.test(plain);
      return Response.json({
        success: false,
        message: refused
          ? 'The grid refused this login attempt ("failed to rez"). It returns that when too many attempts come from the same server or its login service is busy. Wait a few minutes, then try again.'
          : plain || 'The grid returned an unexpected response',
        grid_status: resp.status,
        raw: xmlText.slice(0, 500),
      }, { status: 502 });
    }

    let result;
    try {
      result = parseXmlRpc(xmlText) || {};
    } catch (_e) {
      return Response.json({
        success: false,
        message: 'The grid sent a login response this viewer could not read',
        grid_status: resp.status,
        raw: xmlText.slice(0, 500),
      }, { status: 502 });
    }

    const loginOk = result.login === true || result.login === 'true' || result.login === 1;
    if (!loginOk) {
      return Response.json({
        success: false,
        message: result.message || result.reason || 'Login rejected by grid',
        reason: result.reason || null,
      });
    }

    const agentId = result.agent_id || '';
    const sessionId = result.session_id || '';
    const region = result.agent_region || {};
    const avatarName = `${result.first_name || first_name} ${result.last_name || last_name}`;
    const location = region.region ? `${region.region} (${region.x || 0}, ${region.y || 0})` : 'unknown';

    let sessionRecordId = null;
    try {
      const sessionRecord = await base44.entities.SLSession.create({
        first_name,
        last_name: last_name || 'Resident',
        grid,
        session_token: `${agentId}:${sessionId}`,
        agent_id: String(agentId),
        status: 'logged_in',
        last_location: location,
        avatar_name: avatarName,
      });
      sessionRecordId = sessionRecord?.id || null;
    } catch (_e) {
      // session persistence is best-effort
    }

    return Response.json({
      success: true,
      agent_id: String(agentId),
      session_id: String(sessionId),
      avatar_name: avatarName,
      region: region.region || null,
      region_x: region.x || null,
      region_y: region.y || null,
      region_z: region.z || null,
      simulator_ip: region.simulator_ip || null,
      simulator_port: region.simulator_port || null,
      seed_capabilities: result.seed_capabilities || [],
      look_at: result.look_at || null,
      session_record_id: sessionRecordId,
    });
  } catch (error) {
    return Response.json({ success: false, message: error.message || 'Login bridge error' }, { status: 500 });
  }
});