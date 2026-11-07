// Turns a pasted YouTube / YouTube Music / SoundCloud / Spotify / direct-audio
// link into something embeddable. Returns null when the link is not recognised.
export function parseMusicUrl(raw) {
  const url = (raw || "").trim();
  if (!url) return null;

  if (/\.(mp3|m4a|ogg|oga|wav|aac|flac)(\?.*)?$/i.test(url)) {
    return { kind: "audio", provider: "Audio file", embedUrl: url, height: 0, label: "Audio file" };
  }

  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  // ---- YouTube (incl. YouTube Music, shorts, embeds) ----
  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    if (id) return youtubeVideo(id);
  }
  if (host.endsWith("youtube.com")) {
    const id =
      u.searchParams.get("v") ||
      (u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : "") ||
      (u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : "");
    if (id) return youtubeVideo(id);
    const list = u.searchParams.get("list");
    if (list) {
      return {
        kind: "embed",
        provider: "YouTube",
        embedUrl: `https://www.youtube.com/embed/videoseries?list=${list}&autoplay=1&rel=0`,
        height: 0,
        label: "YouTube playlist",
      };
    }
  }

  // ---- Spotify ----
  if (host === "open.spotify.com" || host === "play.spotify.com" || host === "embed.spotify.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    const type = parts[0] === "embed" ? parts[1] : parts[0];
    const id = parts[0] === "embed" ? parts[2] : parts[1];
    if (type && id) {
      const compact = type === "track" || type === "episode";
      return {
        kind: "embed",
        provider: "Spotify",
        embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
        height: compact ? 152 : 352,
        label: `Spotify ${type}`,
      };
    }
  }

  // ---- SoundCloud ----
  if (host.endsWith("soundcloud.com")) {
    return {
      kind: "embed",
      provider: "SoundCloud",
      embedUrl:
        "https://w.soundcloud.com/player/?url=" +
        encodeURIComponent(url) +
        "&color=%23ec4899&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=false",
      height: 166,
      label: "SoundCloud track",
    };
  }

  // ---- Bandcamp ----
  if (host.endsWith("bandcamp.com")) {
    return {
      kind: "embed",
      provider: "Bandcamp",
      embedUrl: `https://bandcamp.com/EmbeddedPlayer/track=${encodeURIComponent(url)}/size=small/bgcol=0c0810/linkcol=ec4899/transparent=true/`,
      height: 120,
      label: "Bandcamp track",
    };
  }

  return null;
}

function youtubeVideo(id) {
  return {
    kind: "embed",
    provider: "YouTube",
    embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&loop=1&playlist=${id}`,
    height: 0,
    label: "YouTube video",
  };
}