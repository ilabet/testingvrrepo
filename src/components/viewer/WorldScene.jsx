import React, { useRef, useEffect } from "react";
import * as THREE from "three";

export default function WorldScene({ joystickInput }) {
  const mountRef = useRef(null);
  const avatarRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 500);
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x4a7c4f });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid overlay
    const gridHelper = new THREE.GridHelper(200, 50, 0x3a6c3f, 0x3a6c3f);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Avatar (simple capsule)
    const avatarGroup = new THREE.Group();
    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.3, 1, 8, 16);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4488cc });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    body.castShadow = true;
    avatarGroup.add(body);
    // Head
    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xf0c8a0 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.1;
    head.castShadow = true;
    avatarGroup.add(head);

    avatarRef.current = avatarGroup;
    scene.add(avatarGroup);

    // Some environment objects
    const addTree = (x, z) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 2, 8),
        new THREE.MeshLambertMaterial({ color: 0x8B4513 })
      );
      trunk.position.set(x, 1, z);
      trunk.castShadow = true;
      scene.add(trunk);

      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(1, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0x228B22 })
      );
      leaves.position.set(x, 2.8, z);
      leaves.castShadow = true;
      scene.add(leaves);
    };

    const addBuilding = (x, z, w, h, d, color) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    };

    // Scatter trees
    [-15, -8, 8, 15, -12, 12, -20, 20].forEach((x, i) => {
      addTree(x, -10 + i * 4);
      addTree(x + 3, -5 + i * 3);
    });

    // Buildings
    addBuilding(-10, -10, 4, 6, 4, 0x888888);
    addBuilding(10, -8, 6, 4, 5, 0x996633);
    addBuilding(0, -20, 8, 3, 6, 0xaaaacc);
    addBuilding(-15, 10, 3, 8, 3, 0x667788);
    addBuilding(12, 15, 5, 5, 5, 0xcc9966);

    // Water feature
    const waterGeo = new THREE.PlaneGeometry(15, 15);
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x4499cc, transparent: true, opacity: 0.7 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(20, 0.05, -20);
    scene.add(water);

    // Animation
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Move avatar based on joystick
      const avatar = avatarRef.current;
      const cam = cameraRef.current;
      if (avatar && joystickInput.current) {
        const { x, y } = joystickInput.current;
        const speed = 0.12;
        avatar.position.x += x * speed;
        avatar.position.z -= y * speed;

        if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
          const angle = Math.atan2(x, -y);
          avatar.rotation.y = angle;
        }

        // Camera follow
        const camOffset = new THREE.Vector3(0, 4, 8);
        const targetCamPos = avatar.position.clone().add(camOffset);
        cam.position.lerp(targetCamPos, 0.05);
        cam.lookAt(avatar.position.x, avatar.position.y + 1.5, avatar.position.z);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" />;
}