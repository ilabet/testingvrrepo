import * as THREE from "three";

const W = 512;
const H = 320;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** In-world HUD panel drawn to a canvas texture, hit-tested with controller rays. */
export function createVrHud({ getStatus, actions }) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56), material);
  mesh.position.set(0, -0.34, -0.95);
  mesh.rotation.x = -0.5;
  mesh.renderOrder = 20;
  mesh.visible = false;

  const buttons = [
    { id: "minimap", label: "Mini-map" },
    { id: "recenter", label: "Recenter" },
    { id: "exit", label: "Exit VR" },
  ];
  const rects = [];
  let hovered = -1;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    roundRect(ctx, 6, 6, W - 12, H - 12, 30);
    ctx.fillStyle = "rgba(14,13,15,0.82)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 26px Georgia, serif";
    ctx.fillText("SECOND LIFE GO", 30, 52);

    ctx.font = "16px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    String(getStatus())
      .split("\n")
      .slice(0, 3)
      .forEach((line, i) => ctx.fillText(line, 30, 84 + i * 24));

    rects.length = 0;
    const bw = (W - 60 - 24) / 3;
    buttons.forEach((b, i) => {
      const r = { x: 30 + i * (bw + 12), y: H - 96, w: bw, h: 56 };
      rects.push(r);
      roundRect(ctx, r.x, r.y, r.w, r.h, 16);
      ctx.fillStyle = hovered === i ? "rgba(244,199,208,0.95)" : "rgba(255,255,255,0.10)";
      ctx.fill();
      ctx.fillStyle = hovered === i ? "#171414" : "rgba(255,255,255,0.85)";
      ctx.font = "600 19px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(b.label, r.x + r.w / 2, r.y + 35);
    });
    ctx.textAlign = "left";

    texture.needsUpdate = true;
  }

  draw();

  return {
    mesh,
    refresh: draw,
    hitTest(u, v) {
      const px = u * W;
      const py = (1 - v) * H;
      return rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
    },
    setHover(index) {
      if (index === hovered) return;
      hovered = index;
      draw();
    },
    selectAt(index) {
      const b = buttons[index];
      if (b && actions[b.id]) actions[b.id]();
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}