import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CampusBlock3D } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { RotateCw, Eye, Sparkles, Layers, Activity } from 'lucide-react';

interface ThreeCampusViewerProps {
  blocks: CampusBlock3D[];
  onSelectBlock?: (blockCode: string) => void;
  selectedBlockCode?: string | null;
  metricMode?: 'utilization' | 'risk' | 'latency';
  height?: string;
}

export const ThreeCampusViewer: React.FC<ThreeCampusViewerProps> = ({
  blocks,
  onSelectBlock,
  selectedBlockCode,
  metricMode = 'utilization',
  height = '520px',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBlock, setHoveredBlock] = useState<CampusBlock3D | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [displayMode, setDisplayMode] = useState<'utilization' | 'risk' | 'latency'>(metricMode);

  // References to preserve Three.js state across renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const buildingMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const signalWavesRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const heightPx = container.clientHeight || 520;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfcfcfd); // Crisp muted white backdrop
    scene.fog = new THREE.FogExp2(0xfcfcfd, 0.0035);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 1, 1000);
    camera.position.set(110, 95, 140);
    camera.lookAt(20, 0, 10);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffbf0, 1.2);
    dirLight.position.set(120, 180, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 400;
    dirLight.shadow.camera.left = -160;
    dirLight.shadow.camera.right = 160;
    dirLight.shadow.camera.top = 160;
    dirLight.shadow.camera.bottom = -160;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.4);
    fillLight.position.set(-100, 80, -100);
    scene.add(fillLight);

    // 5. Ground Plane & Campus Grid
    const groundGeo = new THREE.PlaneGeometry(360, 320);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(340, 68, 0xcbd5e1, 0xe2e8f0);
    grid.position.y = 0.01;
    scene.add(grid);

    // Campus pathways
    const pathwayMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
    const mainRoadGeo = new THREE.PlaneGeometry(16, 280);
    const mainRoad = new THREE.Mesh(mainRoadGeo, pathwayMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(28, 0.05, 0);
    mainRoad.receiveShadow = true;
    scene.add(mainRoad);

    const crossRoadGeo = new THREE.PlaneGeometry(280, 14);
    const crossRoad = new THREE.Mesh(crossRoadGeo, pathwayMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.set(0, 0.05, -5);
    crossRoad.receiveShadow = true;
    scene.add(crossRoad);

    // 6. Build 3D Campus Blocks
    buildingMeshesRef.current.clear();
    signalWavesRef.current = [];

    const getMetricColor = (b: CampusBlock3D) => {
      if (displayMode === 'risk') {
        if (b.prediction.risk === 'HIGH') return 0xef4444;
        if (b.prediction.risk === 'MEDIUM') return 0xf59e0b;
        return 0x10b981;
      } else if (displayMode === 'latency') {
        const lat = b.telemetry.avg_latency;
        if (lat >= 75) return 0xef4444;
        if (lat >= 45) return 0xf59e0b;
        return 0x10b981;
      } else {
        // Utilization
        const u = b.telemetry.avg_utilization;
        if (u >= 85) return 0xef4444;
        if (u >= 70) return 0xf97316;
        if (u >= 45) return 0xeab308;
        return 0x10b981;
      }
    };

    blocks.forEach((b) => {
      const blockGroup = new THREE.Group();
      blockGroup.position.set(b.position.x, 0, b.position.z);

      const colorHex = getMetricColor(b);

      // Main Building Body
      const bHeight = b.size.height;
      const bWidth = b.size.width;
      const bDepth = b.size.depth;

      const bodyGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.25,
        metalness: 0.1,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = bHeight / 2;
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      bodyMesh.userData = { block: b };
      blockGroup.add(bodyMesh);

      // Building Accent Top Slab (Colored by Telemetry Status)
      const roofGeo = new THREE.BoxGeometry(bWidth + 0.8, 1.2, bDepth + 0.8);
      const roofMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.4,
        metalness: 0.3,
      });
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.position.y = bHeight + 0.6;
      roofMesh.castShadow = true;
      roofMesh.receiveShadow = true;
      roofMesh.userData = { block: b };
      blockGroup.add(roofMesh);

      // Glass Windows Facade (horizontal floor strips)
      for (let f = 1; f < b.floors; f++) {
        const floorY = (bHeight / b.floors) * f;
        const windowGeo = new THREE.BoxGeometry(bWidth + 0.2, 0.7, bDepth + 0.2);
        const windowMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          roughness: 0.1,
          metalness: 0.8,
        });
        const windowMesh = new THREE.Mesh(windowGeo, windowMat);
        windowMesh.position.y = floorY;
        blockGroup.add(windowMesh);
      }

      // Wi-Fi AP Antenna Tower on Rooftop
      const antennaGeo = new THREE.CylinderGeometry(0.3, 0.5, 4.5, 8);
      const antennaMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
      const antenna = new THREE.Mesh(antennaGeo, antennaMat);
      antenna.position.set(0, bHeight + 3.0, 0);
      blockGroup.add(antenna);

      // AP Emitter Glowing Node
      const nodeGeo = new THREE.SphereGeometry(0.9, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(0, bHeight + 5.2, 0);
      blockGroup.add(node);

      // Pulsing Wi-Fi Radiation Ring (horizontal expanding wave)
      const ringGeo = new THREE.RingGeometry(1.5, 2.2, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const waveMesh = new THREE.Mesh(ringGeo, ringMat);
      waveMesh.rotation.x = Math.PI / 2;
      waveMesh.position.set(0, bHeight + 5.2, 0);
      waveMesh.userData = { baseScale: 1.0, speed: 0.025 + Math.random() * 0.015 };
      blockGroup.add(waveMesh);
      signalWavesRef.current.push(waveMesh);

      scene.add(blockGroup);
      buildingMeshesRef.current.set(b.code, bodyMesh);
    });

    // 7. Mouse Orbit and Drag Control
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let cameraAngle = 0.85;
    let cameraRadius = 180;
    let cameraHeight = 90;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - prevMousePos.x;
        const deltaY = e.clientY - prevMousePos.y;
        cameraAngle -= deltaX * 0.007;
        cameraHeight = Math.max(25, Math.min(180, cameraHeight + deltaY * 0.4));
        prevMousePos = { x: e.clientX, y: e.clientY };
      } else {
        // Raycasting for building hover
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
        const meshes = Array.from(buildingMeshesRef.current.values());
        const intersects = raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          const block = hit.userData?.block as CampusBlock3D;
          if (block) {
            setHoveredBlock(block);
            setTooltipPos({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top + 15 });
            container.style.cursor = 'pointer';
          }
        } else {
          setHoveredBlock(null);
          setTooltipPos(null);
          container.style.cursor = isDragging ? 'grabbing' : 'default';
        }
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      container.style.cursor = 'default';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraRadius = Math.max(70, Math.min(260, cameraRadius + e.deltaY * 0.15));
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      const meshes = Array.from(buildingMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const block = intersects[0].object.userData?.block as CampusBlock3D;
        if (block && onSelectBlock) {
          onSelectBlock(block.code);
        }
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick);

    // 8. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Auto rotation
      if (isAutoRotate && !isDragging) {
        cameraAngle += delta * 0.08;
      }

      // Update camera position
      camera.position.x = 20 + Math.cos(cameraAngle) * cameraRadius;
      camera.position.z = 10 + Math.sin(cameraAngle) * cameraRadius;
      camera.position.y = cameraHeight;
      camera.lookAt(20, 5, 10);

      // Animate Wi-Fi pulsing rings
      signalWavesRef.current.forEach((ring) => {
        const scale = ring.scale.x + ring.userData.speed;
        if (scale > 4.5) {
          ring.scale.set(1.0, 1.0, 1.0);
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.8;
        } else {
          ring.scale.set(scale, scale, 1.0);
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1.0 - scale / 4.5);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight || 520;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, [blocks, isAutoRotate, displayMode]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border bg-white shadow-subtle">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-border shadow-sm flex items-center space-x-3 pointer-events-auto">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-foreground tracking-tight">3D Campus Twin</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center space-x-1 text-xs">
            <button
              onClick={() => setDisplayMode('utilization')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                displayMode === 'utilization' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Utilization
            </button>
            <button
              onClick={() => setDisplayMode('risk')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                displayMode === 'risk' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Congestion Risk
            </button>
            <button
              onClick={() => setDisplayMode('latency')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                displayMode === 'latency' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Latency
            </button>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg border border-border shadow-sm flex items-center space-x-1.5 pointer-events-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            className="h-7 px-2 text-xs flex items-center space-x-1"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isAutoRotate ? 'animate-spin' : ''}`} />
            <span>{isAutoRotate ? 'Rotating' : 'Paused'}</span>
          </Button>
        </div>
      </div>

      {/* Legend Pill */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg border border-border shadow-sm text-xs pointer-events-auto">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {displayMode === 'utilization' ? 'Bandwidth Load' : (displayMode === 'risk' ? 'Prediction Risk' : 'Latency')}
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{displayMode === 'utilization' ? '<45% Normal' : 'Low'}</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span>{displayMode === 'utilization' ? '45-70% Moderate' : 'Medium'}</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>{displayMode === 'utilization' ? '70-85% High' : 'High'}</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>{displayMode === 'utilization' ? '≥85% Critical' : 'Critical'}</span>
          </span>
        </div>
      </div>

      {/* Interactive Hover Tooltip */}
      {hoveredBlock && tooltipPos && (
        <div
          className="absolute z-20 pointer-events-none bg-white/95 backdrop-blur-md border border-border shadow-elevation rounded-lg p-3 text-xs w-60 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-border mb-2">
            <span className="font-bold text-foreground text-sm tracking-tight">{hoveredBlock.name}</span>
            <Badge
              variant={
                hoveredBlock.status_text === 'CRITICAL'
                  ? 'destructive'
                  : hoveredBlock.status_text === 'HIGH'
                  ? 'warning'
                  : hoveredBlock.status_text === 'MODERATE'
                  ? 'secondary'
                  : 'success'
              }
            >
              {hoveredBlock.status_text}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-muted-foreground block">Active Devices</span>
              <span className="font-semibold text-foreground text-sm font-mono">
                {hoveredBlock.telemetry.total_devices}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Bandwidth Util</span>
              <span className="font-semibold text-foreground text-sm font-mono">
                {hoveredBlock.telemetry.avg_utilization}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Roundtrip Latency</span>
              <span className="font-semibold text-foreground font-mono">
                {hoveredBlock.telemetry.avg_latency} ms
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Packet Loss</span>
              <span className="font-semibold text-foreground font-mono">
                {hoveredBlock.telemetry.avg_packet_loss}%
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{hoveredBlock.ap_count} Access Points</span>
            <span className="text-primary font-medium">Click for AP drill-down →</span>
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full bg-[#fcfcfd] cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};

