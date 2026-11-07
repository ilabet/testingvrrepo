import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { createVrHud } from "@/lib/vrHud";
import { loadControls } from "@/lib/vrControls";

const NEON_PURPLE = 0xa855f7;
const NEON_PINK = 0xec4899;
const NEON_BLUE = 0x3b82f6;

export default function WorldScene({ joystickInput, onRendererReady, statusText, onSelectTool }) {
  const mountRef = useRef(null);
  const statusRef = useRef(statusText || "Sandbox · Welcome Island");
  const toolRef = useRef(onSelectTool);

  useEffect(() => {
    statusRef.current = statusText || "Sandbox · Welcome Island";
  }, [statusText]);

  useEffect(() => {
    toolRef.current = onSelectTool;
  }, [onSelectTool]);

  const controlsRef = useRef(loadControls());

  useEffect(() => {
    const handler = (e) => {
      controlsRef.current = e.detail;
    };
    window.addEventListener("vr-controls-updated", handler);
    return () => window.removeEventListener("vr-controls-updated", handler);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08060f);
    scene.fog = new THREE.Fog(0x140a24, 45, 220);

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 500);
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    renderer.xr.setFoveation(1);
    mount.appendChild(renderer.domElement);
    onRendererReady?.(renderer);

    // Player rig — flat camera and XR headset both live here.
    const player = new THREE.Group();
    scene.add(player);
    player.add(camera);

    scene.add(new THREE.AmbientLight(0x6a4b8a, 0.9));
    const key = new THREE.DirectionalLight(0xffc0e0, 0.9);
    key.position.set(20, 30, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fillPurple = new THREE.PointLight(NEON_PURPLE, 45, 70, 2);
    fillPurple.position.set(-8, 6, -6);
    scene.add(fillPurple);
    const fillPink = new THREE.PointLight(NEON_PINK, 45, 70, 2);
    fillPink.position.set(10, 5, 8);
    scene.add(fillPink);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      new THREE.MeshStandardMaterial({ color: 0x140b26, roughness: 0.95, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(220, 55, NEON_PURPLE, 0x3a1f5e);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    const avatarGroup = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, 1, 8, 16),
      new THREE.MeshStandardMaterial({ color: NEON_PURPLE, emissive: 0x5b1a9c, emissiveIntensity: 0.9 })
    );
    body.position.y = 1.2;
    body.castShadow = true;
    avatarGroup.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xf4c2c2, emissive: 0x7a3b6a, emissiveIntensity: 0.5 })
    );
    head.position.y = 2.1;
    head.castShadow = true;
    avatarGroup.add(head);
    scene.add(avatarGroup);

    const addTree = (x, z) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a1240 })
      );
      trunk.position.set(x, 1, z);
      trunk.castShadow = true;
      scene.add(trunk);
      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 10),
        new THREE.MeshStandardMaterial({ color: NEON_PURPLE, emissive: NEON_PURPLE, emissiveIntensity: 0.4, roughness: 0.4 })
      );
      leaves.position.set(x, 2.8, z);
      leaves.castShadow = true;
      scene.add(leaves);
    };

    const addBuilding = (x, z, w, h, d, color) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12, roughness: 0.5, metalness: 0.3 })
      );
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    };

    [-15, -8, 8, 15, -12, 12, -20, 20].forEach((x, i) => {
      addTree(x, -10 + i * 4);
      addTree(x + 3, -5 + i * 3);
    });
    addBuilding(-10, -10, 4, 6, 4, 0x3a1f5e);
    addBuilding(10, -8, 6, 4, 5, 0x5b1a9c);
    addBuilding(0, -20, 8, 3, 6, 0x2a1240);
    addBuilding(-15, 10, 3, 8, 3, 0x7a3b6a);
    addBuilding(12, 15, 5, 5, 5, 0x9c1a5c);

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 15),
      new THREE.MeshStandardMaterial({ color: NEON_BLUE, emissive: NEON_BLUE, emissiveIntensity: 0.35, transparent: true, opacity: 0.55 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(20, 0.05, -20);
    scene.add(water);

    // ---- In-world VR HUD ----
    let fps = 60;
    const hud = createVrHud({
      getStatus: () =>
        `${statusRef.current}\n${Math.round(fps)} fps · WebXR\nLeft stick move · A jump · B menu`,
      actions: {
        minimap: () => toolRef.current?.("minimap"),
        recenter: () => {
          player.position.set(0, 0, 0);
          player.rotation.set(0, 0, 0);
        },
        exit: () => renderer.xr.getSession()?.end(),
      },
    });
    camera.add(hud.mesh);

    // ---- XR controllers ----
    const controllerModelFactory = new XRControllerModelFactory();
    const controllers = [0, 1].map((i) => {
      const controller = renderer.xr.getController(i);
      controller.userData.hudIndex = -1;
      controller.addEventListener("connected", (e) => { controller.userData.inputSource = e.data; });
      controller.addEventListener("disconnected", () => { controller.userData.inputSource = null; });
      controller.addEventListener("selectstart", () => {
        const idx = controller.userData.hudIndex;
        if (idx >= 0) hud.selectAt(idx);
      });
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]),
        new THREE.LineBasicMaterial({ color: NEON_PINK })
      );
      line.scale.z = 5;
      controller.add(line);
      player.add(controller);

      const grip = renderer.xr.getControllerGrip(i);
      grip.add(controllerModelFactory.createControllerModel(grip));
      player.add(grip);
      return controller;
    });

    // ---- Session lifecycle: correct head pose + rig reset ----
    const camOffset = new THREE.Vector3(0, 4, 8);

    const onSessionStart = () => {
      player.position.set(0, 0, 0);
      player.rotation.set(0, 0, 0);
      camera.position.set(0, 1.6, 0);
      camera.rotation.set(0, 0, 0);
      hud.mesh.visible = controlsRef.current.showHud !== false;
    };
    const onSessionEnd = () => {
      hud.mesh.visible = false;
      camera.position.copy(camOffset);
      camera.rotation.set(0, 0, 0);
      avatarGroup.position.set(0, 0, 0);
      avatarGroup.rotation.set(0, 0, 0);
    };
    renderer.xr.addEventListener("sessionstart", onSessionStart);
    renderer.xr.addEventListener("sessionend", onSessionEnd);

    // ---- Locomotion (VRChat-style bindings) ----
    // left stick: move (edge = run) · right stick: turn · A/X: jump · B/Y: quick menu
    const clock = new THREE.Clock();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);

    let velocityY = 0;

    const pressEdge = (controller, index) => {
      const gp = controller.userData.inputSource?.gamepad;
      const pressed = Boolean(gp?.buttons?.[index]?.pressed);
      const key = `btn${index}`;
      const wasPressed = controller.userData[key] ?? false;
      controller.userData[key] = pressed;
      return pressed && !wasPressed;
    };

    const handleButtons = (controller) => {
      // A / X — jump
      if (pressEdge(controller, 4) && player.position.y <= 0.01) velocityY = 4.2;
      // B / Y — toggle the quick menu
      if (pressEdge(controller, 5)) {
        hud.mesh.visible = !hud.mesh.visible;
        controlsRef.current = { ...controlsRef.current, showHud: hud.mesh.visible };
      }
    };

    const updateLocomotion = (dt) => {
      const cfg = controlsRef.current;

      controllers.forEach((controller, index) => {
        const gp = controller.userData.inputSource?.gamepad;
        if (!gp) return;
        handleButtons(controller);

        const ax = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0];
        const ay = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1];
        if (typeof ax !== "number" || typeof ay !== "number") return;

        if (index === 1) {
          if (cfg.turnMode === "smooth") {
            if (Math.abs(ax) > 0.15) player.rotation.y -= ax * 2.2 * dt;
          } else if (Math.abs(ax) > 0.7) {
            if (controller.userData.turnReady !== false) {
              player.rotation.y -= Math.sign(ax) * ((cfg.snapAngle || 30) * Math.PI) / 180;
              controller.userData.turnReady = false;
            }
          } else if (Math.abs(ax) < 0.3) {
            controller.userData.turnReady = true;
          }
          return;
        }

        const magnitude = Math.hypot(ax, ay);
        if (magnitude < 0.15) return;
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        right.crossVectors(forward, UP).normalize();
        const running = magnitude > 0.92;
        const speed = (cfg.moveSpeed || 2.4) * (running ? cfg.runMultiplier || 1.8 : 1) * dt;
        player.position.addScaledVector(forward, -ay * speed);
        player.position.addScaledVector(right, ax * speed);
      });

      // gravity
      velocityY -= 9.8 * dt;
      player.position.y = Math.max(0, player.position.y + velocityY * dt);
      if (player.position.y <= 0) velocityY = 0;
    };

    // ---- Controller ray → HUD hit testing ----
    const raycaster = new THREE.Raycaster();
    const rotMatrix = new THREE.Matrix4();
    const rayOrigin = new THREE.Vector3();
    const rayDir = new THREE.Vector3();

    const updateHudPointer = (controller) => {
      if (!hud.mesh.visible) {
        controller.userData.hudIndex = -1;
        return;
      }
      controller.updateMatrixWorld();
      rotMatrix.identity().extractRotation(controller.matrixWorld);
      rayOrigin.setFromMatrixPosition(controller.matrixWorld);
      rayDir.set(0, 0, -1).applyMatrix4(rotMatrix);
      raycaster.set(rayOrigin, rayDir);
      const hit = raycaster.intersectObject(hud.mesh, false)[0];
      controller.userData.hudIndex = hit?.uv ? hud.hitTest(hit.uv.x, hit.uv.y) : -1;
    };

    let hudTick = 0;
    let frameCount = 0;
    let fpsTime = 0;

    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      frameCount += 1;
      fpsTime += dt;
      if (fpsTime >= 0.5) {
        fps = frameCount / fpsTime;
        frameCount = 0;
        fpsTime = 0;
      }

      if (renderer.xr.isPresenting) {
        avatarGroup.visible = false;
        updateLocomotion(dt);
        controllers.forEach(updateHudPointer);
        hud.setHover(Math.max(...controllers.map((c) => c.userData.hudIndex)));
        hudTick += dt;
        if (hudTick > 0.4) {
          hudTick = 0;
          hud.refresh();
        }
      } else {
        avatarGroup.visible = true;
        const { x, y } = joystickInput.current || { x: 0, y: 0 };
        const speed = 0.12;
        avatarGroup.position.x += x * speed;
        avatarGroup.position.z -= y * speed;
        if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
          avatarGroup.rotation.y = Math.atan2(x, -y);
        }
        const targetCamPos = avatarGroup.position.clone().add(camOffset);
        camera.position.lerp(targetCamPos, 0.05);
        camera.lookAt(avatarGroup.position.x, avatarGroup.position.y + 1.5, avatarGroup.position.z);
      }

      renderer.render(scene, camera);
    });

    const handleResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      renderer.setAnimationLoop(null);
      renderer.xr.removeEventListener("sessionstart", onSessionStart);
      renderer.xr.removeEventListener("sessionend", onSessionEnd);
      window.removeEventListener("resize", handleResize);
      camera.remove(hud.mesh);
      hud.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" />;
}