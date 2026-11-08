import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Manages a WebSocket connection to the SL world-stream proxy.
 * - Connects to wsUrl when provided.
 * - Parses incoming JSON frames and dispatches to type handlers.
 * - Exposes send() to push movement/chat/teleport commands to the proxy.
 * When wsUrl is empty, returns connected=false and the caller falls back to
 * the local simulated scene.
 *
 * Protocol (see railway/README.md): the bridge sends assetToken, loginOk, region,
 * terrain, objects { upsert, remove }, avatars, chat, im, lure, dialog, teleport and
 * disconnected frames; the app sends move, chat, im, teleport, home, touch, sit,
 * stand, acceptLure, dialogReply and logout. Register "*" with on() to receive
 * every frame.
 */
export function useWorldStream(wsUrl, onDrop) {
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const wsRef = useRef(null);
  const handlers = useRef({});
  const queue = useRef([]);
  const dropRef = useRef(onDrop);

  useEffect(() => {
    dropRef.current = onDrop;
  }, [onDrop]);

  useEffect(() => {
    if (!wsUrl) {
      setConnected(false);
      return;
    }

    let intentional = false;
    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      setLastError(e.message);
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setLastError(null);
      // flush anything queued before open
      while (queue.current.length) {
        ws.send(JSON.stringify(queue.current.shift()));
      }
    };
    ws.onclose = (ev) => {
      setConnected(false);
      if (!intentional) {
        dropRef.current?.({ code: ev.code, reason: ev.reason || "connection closed" });
      }
    };
    ws.onerror = () => setLastError("WebSocket error");
    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(typeof e.data === "string" ? e.data : "");
      } catch (_e) {
        return;
      }
      setLastEvent(msg);
      const handler = handlers.current[msg.type];
      if (handler) handler(msg);
      handlers.current["*"]?.(msg);
    };

    return () => {
      intentional = true;
      ws.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [wsUrl]);

  const send = useCallback((obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
      return true;
    }
    // buffer until the socket opens
    if (ws && ws.readyState === WebSocket.CONNECTING) {
      queue.current.push(obj);
    }
    return false;
  }, []);

  const on = useCallback((type, fn) => {
    handlers.current[type] = fn;
  }, []);

  return { connected, lastError, lastEvent, send, on };
}