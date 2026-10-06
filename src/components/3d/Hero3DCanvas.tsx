import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Hero3DCanvasProps {
  className?: string;
}

export default function Hero3DCanvas({ className = "" }: Hero3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const isReducedMotionRef = useRef(false);

  useEffect(() => {
    isReducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const container = mountRef.current;
    if (!container) return;

    // Scene setup — Graphite / Deep Void Environment
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02060c, 0.018); // Soft fog that retains depth without crushing visibility

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 7.8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35; // Enhanced exposure for rich highlights
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // --- Cinematic 3-Point & Rim Lighting System ---
    // 1. Graphite ambient illumination to ensure shadows remain detailed
    const ambientLight = new THREE.AmbientLight(0x071b1d, 3.2);
    scene.add(ambientLight);

    // 2. Primary Key Light — Radiant Emerald / Mint (Left Top)
    const keyLight = new THREE.DirectionalLight(0x10b981, 4.5);
    keyLight.position.set(-5, 6, 4);
    scene.add(keyLight);

    // 3. Rim / Back Light — Electric Cyan (Shining from behind for sharp edge definition)
    const rimLight = new THREE.DirectionalLight(0x00f0ff, 5.0);
    rimLight.position.set(3, -2, -3);
    scene.add(rimLight);

    // 4. Accent Point Light — Teal (Center Midground)
    const tealPointLight = new THREE.PointLight(0x14b8a6, 8, 25);
    tealPointLight.position.set(0, 2, 2);
    scene.add(tealPointLight);

    // 5. Secondary Accent — Warm Amber / Gold (Right Lower)
    const amberPointLight = new THREE.PointLight(0xf59e0b, 6, 20);
    amberPointLight.position.set(4.5, -2.5, 3);
    scene.add(amberPointLight);

    // 6. Cyan Highlight Point Light (Left Lower)
    const cyanPointLight = new THREE.PointLight(0x06b6d4, 7, 22);
    cyanPointLight.position.set(-4.5, -2, 2.5);
    scene.add(cyanPointLight);

    // Root 3D container group for mouse parallax
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // =========================================================================
    // 1. HIGH-VISIBILITY 3D ALGORITHM PIPELINE NODES
    // =========================================================================
    // Palette: Emerald (0x10b981), Teal (0x14b8a6), Cyan (0x06b6d4), Mint (0x34d399), Gold/Amber (0xf59e0b)
    const pipelineStages = [
      { name: "CODE", pos: new THREE.Vector3(-4.4, 0.6, -0.2), color: 0x10b981, accentColor: 0x34d399, geom: "octa" },
      { name: "EXECUTE", pos: new THREE.Vector3(-2.2, -0.5, 0.4), color: 0x14b8a6, accentColor: 0x2dd4bf, geom: "ico" },
      { name: "OPTIMIZE", pos: new THREE.Vector3(0, 0.8, 0.1), color: 0x06b6d4, accentColor: 0x38bdf8, geom: "dodeca" },
      { name: "VISUALIZE", pos: new THREE.Vector3(2.2, -0.4, 0.5), color: 0x00f59b, accentColor: 0x10b981, geom: "ico" },
      { name: "INSIGHT", pos: new THREE.Vector3(4.4, 0.7, -0.1), color: 0xf59e0b, accentColor: 0xfbbf24, geom: "octa" },
    ];

    const nodesGroup = new THREE.Group();
    rootGroup.add(nodesGroup);

    const nodeMeshes: {
      core: THREE.Mesh;
      wireCage: THREE.Mesh;
      ring1: THREE.Mesh;
      ring2: THREE.Mesh;
      beacon: THREE.PointLight;
      initialPos: THREE.Vector3;
      phase: number;
      baseScale: number;
    }[] = [];

    // Geometries with bold visual scale
    const octaGeo = new THREE.OctahedronGeometry(0.48, 0);
    const icoGeo = new THREE.IcosahedronGeometry(0.46, 1);
    const dodecaGeo = new THREE.DodecahedronGeometry(0.46, 0);
    const ringGeo1 = new THREE.TorusGeometry(0.78, 0.032, 16, 64);
    const ringGeo2 = new THREE.TorusGeometry(0.96, 0.024, 16, 64);

    pipelineStages.forEach((stage, i) => {
      const nodeSubGroup = new THREE.Group();
      nodeSubGroup.position.copy(stage.pos);
      nodesGroup.add(nodeSubGroup);

      // Pick geometry
      let selectedGeo = icoGeo;
      if (stage.geom === "octa") selectedGeo = octaGeo;
      if (stage.geom === "dodeca") selectedGeo = dodecaGeo;

      // 1. Faceted Reflective Core
      const coreMat = new THREE.MeshStandardMaterial({
        color: stage.color,
        emissive: stage.color,
        emissiveIntensity: 1.4, // Bright controlled emissive
        roughness: 0.18,
        metalness: 0.88,
        flatShading: true,
      });
      const coreMesh = new THREE.Mesh(selectedGeo, coreMat);
      nodeSubGroup.add(coreMesh);

      // 2. Outer Luminous Wireframe Cage for high-tech architectural silhouette
      const wireMat = new THREE.MeshBasicMaterial({
        color: stage.accentColor,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      });
      const wireCage = new THREE.Mesh(selectedGeo.clone(), wireMat);
      wireCage.scale.setScalar(1.22);
      nodeSubGroup.add(wireCage);

      // 3. Primary Inner Orbital Ring (Gleaming Metallic)
      const ringMat1 = new THREE.MeshStandardMaterial({
        color: stage.accentColor,
        emissive: stage.color,
        emissiveIntensity: 0.8,
        roughness: 0.25,
        metalness: 0.95,
      });
      const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
      ring1.rotation.x = Math.PI / 3;
      ring1.rotation.y = (i * Math.PI) / 4;
      nodeSubGroup.add(ring1);

      // 4. Secondary Outer Gyroscopic Ring
      const ringMat2 = new THREE.MeshBasicMaterial({
        color: stage.color,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
      });
      const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
      ring2.rotation.x = -Math.PI / 4;
      ring2.rotation.z = (i * Math.PI) / 3;
      nodeSubGroup.add(ring2);

      // 5. Dedicated Node Emissive Glow Light
      const beacon = new THREE.PointLight(stage.accentColor, 3.5, 6.0);
      nodeSubGroup.add(beacon);

      nodeMeshes.push({
        core: coreMesh,
        wireCage: wireCage,
        ring1: ring1,
        ring2: ring2,
        beacon: beacon,
        initialPos: stage.pos.clone(),
        phase: i * 1.25,
        baseScale: 1.0,
      });
    });

    // =========================================================================
    // 2. LUMINOUS CURVED DATA HIGHWAY (SPLINE + PULSING FLOW)
    // =========================================================================
    const curvePoints = pipelineStages.map((s) => s.pos);
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, "catmullrom", 0.5);

    // Outer Translucent Glow Tube
    const outerTubeGeo = new THREE.TubeGeometry(curve, 140, 0.075, 16, false);
    const outerTubeMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x10b981,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.85,
      transparent: true,
      opacity: 0.6,
    });
    const outerTubeMesh = new THREE.Mesh(outerTubeGeo, outerTubeMat);
    rootGroup.add(outerTubeMesh);

    // Inner Core Laser Line
    const innerTubeGeo = new THREE.TubeGeometry(curve, 140, 0.025, 12, false);
    const innerTubeMat = new THREE.MeshBasicMaterial({
      color: 0x00f59b,
    });
    const innerTubeMesh = new THREE.Mesh(innerTubeGeo, innerTubeMat);
    rootGroup.add(innerTubeMesh);

    // High-Energy Glowing Data Packets
    const packetCount = 12;
    const packetGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const packetGlowGeo = new THREE.SphereGeometry(0.24, 16, 16);

    const packets: {
      mesh: THREE.Group;
      coreMat: THREE.MeshBasicMaterial;
      glowMat: THREE.MeshBasicMaterial;
      progress: number;
      speed: number;
    }[] = [];

    const packetColors = [0x00f59b, 0x22d3ee, 0x34d399, 0xfbbf24, 0x06b6d4, 0x10b981];

    for (let i = 0; i < packetCount; i++) {
      const pGroup = new THREE.Group();
      const col = packetColors[i % packetColors.length];

      const pCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pCoreMesh = new THREE.Mesh(packetGeo, pCoreMat);
      pGroup.add(pCoreMesh);

      const pGlowMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.75,
      });
      const pGlowMesh = new THREE.Mesh(packetGlowGeo, pGlowMat);
      pGroup.add(pGlowMesh);

      rootGroup.add(pGroup);
      packets.push({
        mesh: pGroup,
        coreMat: pCoreMat,
        glowMat: pGlowMat,
        progress: i / packetCount,
        speed: 0.0022 + (i % 4) * 0.0006,
      });
    }

    // =========================================================================
    // 3. 3D GEOMETRIC ALGORITHM LATTICE & CONNECTED NEURAL GRAPH
    // =========================================================================
    const matrixGroup = new THREE.Group();
    rootGroup.add(matrixGroup);

    const latticeNodeCount = 36;
    const latticePositions: THREE.Vector3[] = [];
    const latticeMeshes: THREE.Mesh[] = [];

    const latticeGeoOcta = new THREE.OctahedronGeometry(0.18, 0);
    const latticeGeoBox = new THREE.BoxGeometry(0.18, 0.18, 0.18);

    const latticeMatEmerald = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      emissive: 0x10b981,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.8,
    });

    const latticeMatTeal = new THREE.MeshStandardMaterial({
      color: 0x134e4a,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.8,
    });

    const latticeMatGold = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.1,
      roughness: 0.2,
      metalness: 0.9,
    });

    for (let i = 0; i < latticeNodeCount; i++) {
      const angle = (i / latticeNodeCount) * Math.PI * 2;
      const radius = 3.6 + Math.sin(i * 3.7) * 1.8;
      const x = Math.cos(angle) * radius + Math.sin(i * 2.3) * 1.0;
      const y = Math.sin(i * 3.9) * 2.6 - 0.1;
      const z = Math.sin(angle) * radius - 1.2;

      const pos = new THREE.Vector3(x, y, z);
      latticePositions.push(pos);

      const mat = i % 5 === 0 ? latticeMatGold : i % 2 === 0 ? latticeMatEmerald : latticeMatTeal;
      const geo = i % 3 === 0 ? latticeGeoOcta : latticeGeoBox;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.rotation.set(i * 0.4, i * 0.6, i * 0.2);
      matrixGroup.add(mesh);
      latticeMeshes.push(mesh);
    }

    // Dynamic Interconnecting Lattice Laser Lines
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x14b8a6,
      transparent: true,
      opacity: 0.38, // High-contrast, sharp network strands
    });
    const lineGeo = new THREE.BufferGeometry();
    const linePoints: number[] = [];

    for (let i = 0; i < latticePositions.length; i++) {
      for (let j = i + 1; j < latticePositions.length; j++) {
        if (latticePositions[i].distanceTo(latticePositions[j]) < 2.9) {
          linePoints.push(
            latticePositions[i].x,
            latticePositions[i].y,
            latticePositions[i].z,
            latticePositions[j].x,
            latticePositions[j].y,
            latticePositions[j].z
          );
        }
      }
    }
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePoints, 3));
    const lineSegments = new THREE.LineSegments(lineGeo, lineMat);
    matrixGroup.add(lineSegments);

    // =========================================================================
    // 4. FLOATING 3D DATA / CODE PARTICLES
    // =========================================================================
    const particleCount = 75;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 16;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
      particleSpeeds.push(0.004 + Math.random() * 0.008);
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.065,
      transparent: true,
      opacity: 0.65,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particleSystem);

    // =========================================================================
    // 5. 3D SPATIAL PERSPECTIVE COORDINATE FLOOR GRID
    // =========================================================================
    const gridHelper = new THREE.GridHelper(20, 30, 0x10b981, 0x064e3b);
    gridHelper.position.y = -2.8;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.45; // Visible perspective floor
    rootGroup.add(gridHelper);

    // Pointer Parallax Handler
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = x * 0.5;
      mouse.targetY = y * 0.4;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // =========================================================================
    // 6. CINEMATIC ANIMATION LOOP
    // =========================================================================
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera / root parallax
      if (!isReducedMotionRef.current) {
        mouse.x += (mouse.targetX - mouse.x) * 0.06;
        mouse.y += (mouse.targetY - mouse.y) * 0.06;

        rootGroup.rotation.y = mouse.x * 0.4;
        rootGroup.rotation.x = -mouse.y * 0.3;

        // Subtle ambient continuous breathing wave
        rootGroup.position.y = Math.sin(elapsedTime * 0.7) * 0.12;
      }

      // Animate Main Algorithm Pipeline Nodes
      nodeMeshes.forEach((item) => {
        if (!isReducedMotionRef.current) {
          // Organic floating undulation
          const floatY = Math.sin(elapsedTime * 1.6 + item.phase) * 0.16;
          item.core.parent?.position.set(
            item.initialPos.x,
            item.initialPos.y + floatY,
            item.initialPos.z + Math.cos(elapsedTime * 1.2 + item.phase) * 0.08
          );

          // Core rotation
          item.core.rotation.y += 0.012;
          item.core.rotation.x += 0.008;

          // Wireframe cage counter-rotation
          item.wireCage.rotation.y -= 0.018;
          item.wireCage.rotation.z += 0.01;

          // Double orbital ring spin
          item.ring1.rotation.z += 0.02;
          item.ring1.rotation.x += 0.012;
          item.ring2.rotation.z -= 0.016;
          item.ring2.rotation.y += 0.014;

          // Subtle pulsing emissive breathing
          const pulse = 1.0 + Math.sin(elapsedTime * 3.0 + item.phase) * 0.3;
          (item.core.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 * pulse;
          item.beacon.intensity = 3.0 * pulse;
        }
      });

      // Animate Glowing Data Packets along Highway
      packets.forEach((p) => {
        p.progress = (p.progress + p.speed) % 1;
        const pt = curve.getPointAt(p.progress);
        p.mesh.position.copy(pt);

        // High-energy particle spin
        p.mesh.rotation.y += 0.04;
        p.mesh.rotation.x += 0.02;
      });

      // Animate Lattice Nodes & Background Graph
      if (!isReducedMotionRef.current) {
        matrixGroup.rotation.y = elapsedTime * 0.05;
        matrixGroup.rotation.x = Math.sin(elapsedTime * 0.3) * 0.05;

        latticeMeshes.forEach((mesh, idx) => {
          mesh.rotation.y += 0.015;
          mesh.rotation.z += 0.01;
        });

        // Floating particles drift
        const positions = particleGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          positions[i * 3 + 1] += Math.sin(elapsedTime + i) * 0.003;
          if (positions[i * 3 + 1] > 4) positions[i * 3 + 1] = -4;
        }
        particleGeo.attributes.position.needsUpdate = true;

        // Grid floor subtle counter drift
        gridHelper.rotation.y = -elapsedTime * 0.018;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("resize", handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Thorough resource disposal
      renderer.dispose();
      octaGeo.dispose();
      icoGeo.dispose();
      dodecaGeo.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      outerTubeGeo.dispose();
      outerTubeMat.dispose();
      innerTubeGeo.dispose();
      innerTubeMat.dispose();
      packetGeo.dispose();
      packetGlowGeo.dispose();
      latticeGeoOcta.dispose();
      latticeGeoBox.dispose();
      latticeMatEmerald.dispose();
      latticeMatTeal.dispose();
      latticeMatGold.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}

