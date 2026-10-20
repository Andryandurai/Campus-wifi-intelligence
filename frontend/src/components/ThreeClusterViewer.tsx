import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { LocationClusterItem } from '../types';
import { Badge } from './ui/Badge';

interface ThreeClusterViewerProps {
  clusters: LocationClusterItem[];
  height?: string;
}

export const ThreeClusterViewer: React.FC<ThreeClusterViewerProps> = ({ clusters, height = '460px' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<LocationClusterItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || clusters.length === 0) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const heightPx = container.clientHeight || 460;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfcfcfd);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / heightPx, 0.1, 1000);
    camera.position.set(28, 22, 34);
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    // 5. 3D Coordinate Grid & Bounding Cube
    const gridXY = new THREE.GridHelper(30, 10, 0xcbd5e1, 0xf1f5f9);
    gridXY.position.y = -10;
    scene.add(gridXY);

    // 3D Box Wireframe Frame
    const boxGeo = new THREE.BoxGeometry(26, 22, 26);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxLine = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color: 0xe2e8f0 }));
    scene.add(boxLine);

    // 6. Cluster Colors
    const getClusterColor = (name: string) => {
      if (name.includes('High-Demand')) return 0xef4444; // Red
      if (name.includes('Moderate')) return 0x10b981; // Green
      if (name.includes('Underutilized')) return 0x3b82f6; // Blue
      return 0xf59e0b; // Amber / Unstable
    };

    // 7. Render Cluster AP Sphere Nodes
    const apMeshes: THREE.Mesh[] = [];
    clusters.forEach((ap) => {
      const radius = 1.1;
      const sphereGeo = new THREE.SphereGeometry(radius, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: getClusterColor(ap.cluster_name),
        roughness: 0.3,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(sphereGeo, sphereMat);
      mesh.position.set(ap.pca_x, ap.pca_y, ap.pca_z);
      mesh.userData = { apData: ap };

      // Halo ring around each node
      const haloGeo = new THREE.RingGeometry(1.3, 1.6, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: getClusterColor(ap.cluster_name),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      mesh.add(halo);

      scene.add(mesh);
      apMeshes.push(mesh);
    });

    // 8. Interactive Orbit Rotation
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let rotX = 0.4;
    let rotY = 0.6;
    let distance = 42;

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
        rotY += deltaX * 0.008;
        rotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX + deltaY * 0.008));
        prevMousePos = { x: e.clientX, y: e.clientY };
      } else {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
        const intersects = raycaster.intersectObjects(apMeshes);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          setHoveredNode(hit.userData?.apData);
          setTooltipPos({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top + 15 });
          container.style.cursor = 'pointer';
        } else {
          setHoveredNode(null);
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
      distance = Math.max(20, Math.min(80, distance + e.deltaY * 0.05));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // 9. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isDragging) {
        rotY += 0.002;
      }

      camera.position.x = distance * Math.cos(rotX) * Math.sin(rotY);
      camera.position.y = distance * Math.sin(rotX);
      camera.position.z = distance * Math.cos(rotX) * Math.cos(rotY);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight || 460;
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
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, [clusters]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border bg-white shadow-subtle">
      {/* Legend Top Header */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-lg border border-border shadow-sm text-xs">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          3D PCA Cluster Space (k=4)
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>High-Demand</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Moderate</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Underutilized</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Unstable</span>
          </span>
        </div>
      </div>

      {/* Axis Guide */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-md border border-border text-[10px] text-muted-foreground font-mono">
        PCA-1: Devices/Util • PCA-2: Latency/Loss • PCA-3: Peak Freq
      </div>

      {/* Hover Node Tooltip */}
      {hoveredNode && tooltipPos && (
        <div
          className="absolute z-20 pointer-events-none bg-white/95 backdrop-blur-md border border-border shadow-elevation rounded-lg p-3 text-xs w-64 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="flex items-center justify-between pb-1 border-b border-border mb-2">
            <span className="font-bold text-foreground font-mono">{hoveredNode.access_point}</span>
            <Badge variant="outline">{hoveredNode.cluster_name}</Badge>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium text-foreground">{hoveredNode.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Utilization:</span>
              <span className="font-semibold text-foreground font-mono">{hoveredNode.avg_utilization}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Devices:</span>
              <span className="font-semibold text-foreground font-mono">{hoveredNode.avg_devices}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Latency / Loss:</span>
              <span className="font-mono text-foreground">{hoveredNode.avg_latency}ms / {hoveredNode.avg_packet_loss}%</span>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-border text-[10px] text-primary">
            💡 {hoveredNode.suggested_action}
          </div>
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} style={{ height }} className="w-full bg-[#fcfcfd] cursor-grab active:cursor-grabbing" />
    </div>
  );
};

