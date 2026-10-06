import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface DataStructure3DCanvasProps {
  array: number[];
  activeIndices?: number[];
  foundIndices?: number[];
  swappedIndices?: number[];
  sortedIndices?: number[];
  comparingIndices?: number[];
  pointers?: Record<string, number>;
  currentOperation?: string;
  stepDescription?: string;
  className?: string;
}

/**
 * Creates a dynamic Canvas texture with the number value and index
 */
function createValueTexture(val: number, idx: number, state: "normal" | "active" | "found" | "swap" | "sorted"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);

    // Background fill based on state
    if (state === "found") {
      ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
    } else if (state === "swap") {
      ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
    } else if (state === "active") {
      ctx.fillStyle = "rgba(34, 211, 238, 0.9)";
    } else if (state === "sorted") {
      ctx.fillStyle = "rgba(16, 185, 129, 0.8)";
    } else {
      ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
    }

    // Rounded box outline
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 236, 236);

    // Value text
    ctx.font = "bold 96px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(val), 128, 120);

    // Subtitle Index text
    ctx.font = "bold 32px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillText(`idx: ${idx}`, 128, 200);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function DataStructure3DCanvas({
  array,
  activeIndices = [],
  foundIndices = [],
  swappedIndices = [],
  sortedIndices = [],
  comparingIndices = [],
  pointers = {},
  currentOperation = "",
  stepDescription = "",
  className = "",
}: DataStructure3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(true);

  // Keep references to 3D objects for smooth step updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const barMeshesRef = useRef<
    {
      mesh: THREE.Group;
      targetX: number;
      targetY: number;
      targetZ: number;
      targetScaleY: number;
      val: number;
      idx: number;
      cubeMesh: THREE.Mesh;
      pointerMesh?: THREE.Mesh;
    }[]
  >([]);
  const lasersRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 340;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x060b1d, 0.04);

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 3.2, 7.2);
    camera.lookAt(0, 0.3, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1e1b4b, 2.0);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const cyanPoint = new THREE.PointLight(0x22d3ee, 4, 12);
    cyanPoint.position.set(-3, 2, 2);
    scene.add(cyanPoint);

    const purplePoint = new THREE.PointLight(0xa855f7, 3.5, 12);
    purplePoint.position.set(3, 2, 2);
    scene.add(purplePoint);

    // 3D Grid Platform with soft mirror glow
    const grid = new THREE.GridHelper(12, 16, 0x6366f1, 0x1e293b);
    grid.position.y = -0.5;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.45;
    scene.add(grid);

    // Ground plane for shadows
    const planeGeo = new THREE.PlaneGeometry(16, 16);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.51;
    plane.receiveShadow = true;
    scene.add(plane);

    // Group for Array Blocks
    const arrayGroup = new THREE.Group();
    scene.add(arrayGroup);

    // Mouse drag / orbit
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let rotationAngleY = 0;
    let rotationAngleX = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      rotationAngleY += deltaX * 0.008;
      rotationAngleX = Math.max(-0.4, Math.min(0.6, rotationAngleX + deltaY * 0.008));

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 340;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth camera interpolation based on drag rotation
      camera.position.x = Math.sin(rotationAngleY) * 7.2;
      camera.position.z = Math.cos(rotationAngleY) * 7.2;
      camera.position.y = 3.2 + rotationAngleX * 3.5;
      camera.lookAt(0, 0.3, 0);

      // Interpolate 3D Bars toward target positions
      barMeshesRef.current.forEach((item) => {
        item.mesh.position.x += (item.targetX - item.mesh.position.x) * 0.12;
        item.mesh.position.y += (item.targetY - item.mesh.position.y) * 0.12;
        item.mesh.position.z += (item.targetZ - item.mesh.position.z) * 0.12;

        // Subtle floating glow
        if (item.targetY > 0.3) {
          item.mesh.rotation.y = Math.sin(elapsed * 4) * 0.05;
        } else {
          item.mesh.rotation.y = 0;
        }
      });

      // Animate laser pointers
      lasersRef.current.forEach((laser) => {
        laser.rotation.y += 0.04;
        (laser.material as THREE.MeshBasicMaterial).opacity =
          0.6 + Math.sin(elapsed * 8) * 0.25;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Re-build & animate 3D Array Blocks when array / step state changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear previous bars and lasers
    barMeshesRef.current.forEach((item) => {
      scene.remove(item.mesh);
    });
    lasersRef.current.forEach((laser) => {
      scene.remove(laser);
    });
    barMeshesRef.current = [];
    lasersRef.current = [];

    const count = array.length;
    if (count === 0) return;

    const spacing = Math.min(1.05, 7.5 / Math.max(count, 1));
    const startX = -((count - 1) * spacing) / 2;
    const maxVal = Math.max(...array, 1);

    array.forEach((val, i) => {
      const isComparing = comparingIndices.includes(i);
      const isActive = activeIndices.includes(i) || isComparing;
      const isFound = foundIndices.includes(i);
      const isSwapped = swappedIndices.includes(i);
      const isSorted = sortedIndices.includes(i);

      let state: "normal" | "active" | "found" | "swap" | "sorted" = "normal";
      if (isFound) state = "found";
      else if (isSwapped) state = "swap";
      else if (isActive) state = "active";
      else if (isSorted) state = "sorted";

      // Calculate bar dimensions
      const height = Math.max(0.6, (val / maxVal) * 2.2);
      const width = Math.min(0.75, spacing * 0.82);
      const depth = 0.75;

      const barGroup = new THREE.Group();

      // Geometry & Materials
      const boxGeo = new THREE.BoxGeometry(width, height, depth);

      let emissiveColor = 0x1e1b4b;
      let emissiveIntensity = 0.2;
      let barColor = 0x334155;

      if (state === "found") {
        emissiveColor = 0x22c55e;
        emissiveIntensity = 0.9;
        barColor = 0x15803d;
      } else if (state === "swap") {
        emissiveColor = 0xa855f7;
        emissiveIntensity = 0.85;
        barColor = 0x7e22ce;
      } else if (state === "active") {
        emissiveColor = 0x22d3ee;
        emissiveIntensity = 0.8;
        barColor = 0x0284c7;
      } else if (state === "sorted") {
        emissiveColor = 0x10b981;
        emissiveIntensity = 0.6;
        barColor = 0x047857;
      }

      const valTexture = createValueTexture(val, i, state);

      // Face materials: front & back show number texture
      const matNormal = new THREE.MeshStandardMaterial({
        color: barColor,
        emissive: emissiveColor,
        emissiveIntensity: emissiveIntensity,
        metalness: 0.6,
        roughness: 0.25,
      });

      const matTexture = new THREE.MeshStandardMaterial({
        map: valTexture,
        emissive: emissiveColor,
        emissiveIntensity: emissiveIntensity * 0.4,
        metalness: 0.5,
        roughness: 0.3,
      });

      const materials = [
        matNormal, // right
        matNormal, // left
        matNormal, // top
        matNormal, // bottom
        matTexture, // front
        matTexture, // back
      ];

      const boxMesh = new THREE.Mesh(boxGeo, materials);
      boxMesh.position.y = height / 2;
      boxMesh.castShadow = true;
      boxMesh.receiveShadow = true;
      barGroup.add(boxMesh);

      // Active / Comparing Laser Indicator Beam
      if (isActive || isFound || isSwapped) {
        const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 16);
        const beamMat = new THREE.MeshBasicMaterial({
          color: isFound ? 0x4ade80 : isSwapped ? 0xc084fc : 0x38bdf8,
          transparent: true,
          opacity: 0.75,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = height + 1.0;
        barGroup.add(beam);
        lasersRef.current.push(beam);

        // Pointer Arrow Cone
        const coneGeo = new THREE.ConeGeometry(0.16, 0.35, 16);
        const coneMat = new THREE.MeshBasicMaterial({
          color: isFound ? 0x22c55e : isSwapped ? 0xa855f7 : 0x06b6d4,
        });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.rotation.x = Math.PI; // point downwards
        cone.position.y = height + 0.25;
        barGroup.add(cone);
      }

      // Initial position
      const posX = startX + i * spacing;
      const elevY = isSwapped ? 0.7 : isActive ? 0.3 : 0;
      const elevZ = isSwapped ? 0.4 : 0;

      barGroup.position.set(posX, elevY, elevZ);
      scene.add(barGroup);

      barMeshesRef.current.push({
        mesh: barGroup,
        targetX: posX,
        targetY: elevY,
        targetZ: elevZ,
        targetScaleY: 1,
        val,
        idx: i,
        cubeMesh: boxMesh,
      });
    });
  }, [array, activeIndices, foundIndices, swappedIndices, sortedIndices, comparingIndices]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-primary/20 bg-abyss-950 shadow-2xl ${className}`}>
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-[290px] cursor-grab active:cursor-grabbing"
      />

      {/* Floating 3D HUD Overlay */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 rounded-xl bg-background/80 backdrop-blur-md px-3 py-1.5 border border-white/10 shadow-lg">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-mono text-xs font-semibold text-cyan-300">
            3D SPATIAL ENGINE
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            (Drag to Rotate View)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {pointers && Object.keys(pointers).length > 0 && (
            <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 shadow-md">
              {Object.entries(pointers).map(([name, idx]) => (
                <span key={name} className="px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-200 font-mono text-[10px] font-bold border border-violet-400/30">
                  {name}: {idx}
                </span>
              ))}
            </div>
          )}
          {currentOperation && (
            <div className="rounded-xl bg-primary/20 backdrop-blur-md px-3 py-1 border border-primary/40 text-primary-300 font-mono text-xs uppercase font-bold tracking-wider">
              OP: {currentOperation}
            </div>
          )}
        </div>
      </div>

      {/* Step description live ticker */}
      {stepDescription && (
        <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-background/85 backdrop-blur-md px-4 py-2 border border-white/10 shadow-lg flex items-center justify-between">
          <p className="font-mono text-xs text-slate-200 line-clamp-1">
            {stepDescription}
          </p>
          <div className="hidden sm:flex items-center gap-2 shrink-0 ml-3">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Active
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-md">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" /> Swap
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Done
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
