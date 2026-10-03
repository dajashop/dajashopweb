import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CanvasTexture, SRGBColorSpace } from 'three';
class Fallback extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function Model({ canvas, rotate, reset, zoom, diameter }) {
  const texture = useMemo(() => { const value = new CanvasTexture(canvas); value.colorSpace = SRGBColorSpace; return value; }, [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);
  const controls = useRef();
  useEffect(() => { controls.current?.reset(); }, [reset, rotate]);
  const radius = diameter / 20;
  return <>
    <ambientLight intensity={1.5} /><directionalLight position={[4, 5, 7]} intensity={3} /><directionalLight position={[-4, -2, 4]} intensity={2} />
    <group scale={zoom}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius, radius * .97, .25, 96]} /><meshStandardMaterial color="#a9afb7" metalness={.85} roughness={.28} /></mesh>
      <mesh position={[0, 0, .135]}><circleGeometry args={[radius * .95, 96]} /><meshStandardMaterial map={texture} metalness={.5} roughness={.55} /></mesh>
      <mesh position={[0, 0, .15]}><torusGeometry args={[radius * .95, .045, 12, 96]} /><meshStandardMaterial color="#dddfe2" metalness={.85} roughness={.24} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} position={[Math.cos(i * Math.PI / 3) * radius * .91, Math.sin(i * Math.PI / 3) * radius * .91, .17]} rotation={[0, 0, i * .7]}><boxGeometry args={[.13, .025, .012]} /><meshStandardMaterial color="#73777e" metalness={.7} roughness={.4} /></mesh>)}
      {[-1, 1].map((direction) => <mesh key={direction} position={[0, direction * radius * 1.04, -.07]}><boxGeometry args={[radius * .95, .4, .2]} /><meshStandardMaterial color="#a1a7b0" metalness={.8} roughness={.3} /></mesh>)}
    </group>
    <OrbitControls ref={controls} enabled={rotate} enablePan={false} enableZoom={false} minPolarAngle={.1} maxPolarAngle={Math.PI - .1} />
  </>;
}
export default function WatchPreview({ canvas, rotate, reset, zoom, diameter, flat, onMove, onStart, onEnd, onZoom }) {
  const drag = useRef(false);
  const stage = useRef(null);
  const panGesture = useRef(null);
  const touches = useRef(new Map());
  const pinchDistance = useRef(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const isFlat = flat || failed;
  useEffect(() => { setPan({ x: 0, y: 0 }); }, [reset]);
  useEffect(() => {
    const element = stage.current;
    const wheel = (event) => {
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      onZoom?.((value) => Math.max(.7, Math.min(1.6, value * Math.exp(-delta * .0015))));
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [onZoom]);
  const point = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = (isFlat ? Math.min(rect.width, rect.height) * .74 : rect.height * .95 / (3.4 * Math.tan(Math.PI / 9))) * zoom;
    return { x: Math.max(0, Math.min(1000, 500 + (event.clientX - rect.left - rect.width / 2 - pan.x) / scale * 1000)), y: Math.max(0, Math.min(1000, 500 + (event.clientY - rect.top - rect.height / 2 - pan.y) / scale * 1000)) };
  };
  const flatPreview = <img className="engrave-flat" src={canvas?.toDataURL()} alt="Ravan pregled poklopca i gravure" style={{ transform: `scale(${zoom})` }} />;
  return <div ref={stage} data-lenis-prevent className={`engrave-stage${panGesture.current ? ' is-panning' : ''}`} onContextMenu={(event) => event.preventDefault()}
    onPointerDownCapture={(event) => {
      if (event.pointerType === 'touch') {
        touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touches.current.size === 2) {
          const [a, b] = [...touches.current.values()]; pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
          drag.current = false; onEnd?.(); event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId); return;
        }
      }
      if (event.button !== 2) return;
      event.preventDefault(); event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      panGesture.current = { x: event.clientX, y: event.clientY, origin: pan };
    }} onPointerMoveCapture={(event) => {
      if (event.pointerType === 'touch' && touches.current.has(event.pointerId)) {
        touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touches.current.size === 2) {
          const [a, b] = [...touches.current.values()]; const distance = Math.hypot(a.x - b.x, a.y - b.y);
          const ratio = pinchDistance.current > 0 ? distance / pinchDistance.current : 1;
          onZoom?.((value) => Math.max(.7, Math.min(1.6, value * ratio))); pinchDistance.current = distance;
          event.stopPropagation(); return;
        }
      }
      if (!panGesture.current) return;
      event.stopPropagation(); const start = panGesture.current;
      setPan({ x: Math.max(-event.currentTarget.clientWidth / 2, Math.min(event.currentTarget.clientWidth / 2, start.origin.x + event.clientX - start.x)), y: Math.max(-event.currentTarget.clientHeight / 2, Math.min(event.currentTarget.clientHeight / 2, start.origin.y + event.clientY - start.y)) });
    }} onPointerUpCapture={(event) => {
      touches.current.delete(event.pointerId); pinchDistance.current = 0;
      if (!panGesture.current) return;
      event.stopPropagation(); panGesture.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      setPan((value) => ({ ...value }));
    }} onPointerCancelCapture={(event) => { touches.current.delete(event.pointerId); pinchDistance.current = 0; panGesture.current = null; drag.current = false; onEnd?.(); }}>
    <div className="engrave-stage-content" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
    {canvas && (isFlat ? flatPreview : <Fallback fallback={flatPreview} onFailure={() => setFailed(true)}><Canvas camera={{ position: [0, 0, diameter / 20 * 3.4], fov: 40 }} gl={{ antialias: true }} onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); setFailed(true); onEnd?.(); }, { once: true }); }}><Model canvas={canvas} rotate={rotate} reset={reset} zoom={zoom} diameter={diameter} /></Canvas></Fallback>)}
    </div>
    {!rotate && <div className="engrave-drag" role="application" aria-label="Pomerite izabrani element gravure" onPointerDown={(event) => { if (!onStart(point(event))) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = true; }} onPointerMove={(event) => { if (drag.current) onMove(point(event)); }} onPointerUp={(event) => { drag.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); onEnd(); }} onPointerCancel={() => { drag.current = false; onEnd(); }} />}
  </div>;
}
