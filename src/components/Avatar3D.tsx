'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Measurements } from '@/lib/api';
import { ClothSim, Sphere } from '@/lib/cloth';

const S = 0.01; // cm → metres
const radiusOf = (circ: number) => Math.max(0.04, (circ / (2 * Math.PI)) * S);

/**
 * Parametric mannequin (Batch 7) with optional real-time CLOTH SIMULATION.
 * Heights come from body proportions; WIDTHS come from the customer's real
 * circumferences so the measurement set visibly changes the silhouette. With
 * `cloth`, a Verlet spring-mass panel drapes over the torso under gravity
 * (genuine physics, not photorealistic rendering).
 */
export default function Avatar3D({
  measurements, garment, color, length = 'Hip', cloth = false,
}: { measurements: Measurements; garment: string; color: string; length?: string; cloth?: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const get = (k: string, d: number) => measurements?.[k]?.val ?? d;
    const H = get('height', 175);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(2, 4, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0xec4899, 0.4); rim.position.set(-3, 2, -2); scene.add(rim);

    // --- proportions (metres) ---
    const totalH = H * S;
    const headH = 0.13 * totalH, neckH = 0.04 * totalH, torsoH = 0.32 * totalH;
    const legH = totalH - headH - neckH - torsoH;
    const legTopY = legH;
    const torsoTopY = legTopY + torsoH;

    const rChest = radiusOf(get('chest', 100));
    const rWaist = radiusOf(get('waist', 90));
    const rHip = radiusOf(get('hip', 100));
    const rThigh = radiusOf(get('thigh', 58)) * 0.6;
    const rBicep = radiusOf(get('bicep', 33)) * 0.7;
    const rNeck = radiusOf(get('neck', 40)) * 0.7;
    const shoulder = get('shoulder', 46) * S;

    const skin = new THREE.MeshStandardMaterial({ color: 0xcaa07a, roughness: 0.85 });
    const body = new THREE.Group();

    const cyl = (rTop: number, rBot: number, h: number, mat: THREE.Material, y: number, x = 0, z = 0) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 24), mat);
      m.position.set(x, y, z); body.add(m); return m;
    };

    // legs
    const legGap = rHip * 0.5;
    cyl(rThigh * 0.6, rThigh, legH, skin, legH / 2, -legGap);
    cyl(rThigh * 0.6, rThigh, legH, skin, legH / 2, legGap);
    // torso: hip→waist then waist→chest
    cyl(rWaist, rHip, torsoH * 0.45, skin, legTopY + torsoH * 0.225);
    cyl(rChest, rWaist, torsoH * 0.55, skin, legTopY + torsoH * 0.45 + torsoH * 0.275);
    // shoulders
    const shoulderMesh = new THREE.Mesh(new THREE.SphereGeometry(rChest * 1.05, 24, 16), skin);
    shoulderMesh.scale.set(1.5, 0.5, 0.8); shoulderMesh.position.y = torsoTopY; body.add(shoulderMesh);
    // arms
    const armLen = torsoH * 1.05;
    cyl(rBicep * 0.7, rBicep, armLen, skin, torsoTopY - armLen / 2, -(shoulder / 2 + rBicep));
    cyl(rBicep * 0.7, rBicep, armLen, skin, torsoTopY - armLen / 2, shoulder / 2 + rBicep);
    // neck + head
    cyl(rNeck, rNeck, neckH, skin, torsoTopY + neckH / 2);
    const head = new THREE.Mesh(new THREE.SphereGeometry(headH * 0.5, 24, 20), skin);
    head.position.y = torsoTopY + neckH + headH * 0.45; body.add(head);

    // --- garment: static overlay OR simulated cloth ---
    const garMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.7, metalness: 0.03, side: THREE.DoubleSide });
    const isKaftan = /kaftan|agbada|gown|robe/i.test(garment);
    const ease = 0.012;
    const hemY = length === 'Knee' ? legTopY * 0.45 : length === 'Short' ? legTopY * 0.75 : isKaftan ? legTopY * 0.2 : legTopY;

    let stepCloth: (() => void) | null = null;

    if (cloth) {
      // Real-time cloth panel pinned at the shoulders, draping over the torso.
      const clothW = Math.max(rChest * 2, shoulder) + 0.05;
      const cols = 14;
      const spacing = clothW / (cols - 1);
      const clothTop = torsoTopY + 0.02;
      const rows = Math.max(8, Math.round((clothTop - hemY) / spacing));
      const sim = new ClothSim(cols, rows, spacing, -clothW / 2, clothTop, rChest * 0.25);
      sim.pinTopRow();

      const colliders: Sphere[] = [
        { x: 0, y: legTopY + torsoH * 0.72, z: 0, r: rChest },
        { x: 0, y: legTopY + torsoH * 0.40, z: 0, r: rWaist },
        { x: 0, y: legTopY + torsoH * 0.12, z: 0, r: rHip },
      ];

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(sim.pos, 3));
      const idx: number[] = [];
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
          idx.push(a, d, b, b, d, e);
        }
      }
      geom.setIndex(idx);
      geom.computeVertexNormals();
      body.add(new THREE.Mesh(geom, garMat));

      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      stepCloth = () => {
        sim.step(1 / 60, -9.8, colliders, 4);
        posAttr.needsUpdate = true;
        geom.computeVertexNormals();
      };
    } else if (isKaftan) {
      const robe = new THREE.Mesh(new THREE.CylinderGeometry(rChest + ease, rHip + 0.06, torsoTopY - hemY, 32, 1, true), garMat);
      robe.position.y = (torsoTopY + hemY) / 2; body.add(robe);
    } else {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(rChest + ease, rHip + ease, torsoTopY - hemY, 28, 1, true), garMat);
      top.position.y = (torsoTopY + hemY) / 2; body.add(top);
      cyl(rThigh * 0.6 + ease, rThigh + ease, legH, garMat, legH / 2, -legGap);
      cyl(rThigh * 0.6 + ease, rThigh + ease, legH, garMat, legH / 2, legGap);
    }

    // centre the figure
    body.position.y = -totalH / 2;
    scene.add(body);
    camera.position.set(0, 0, totalH * 1.5);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.enableZoom = false;
    controls.autoRotate = true; controls.autoRotateSpeed = cloth ? 0.8 : 1.6;
    controls.target.set(0, 0, 0);

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight || w * 1.2;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(mount);

    let raf = 0;
    const animate = () => { raf = requestAnimationFrame(animate); if (stepCloth) stepCloth(); controls.update(); renderer.render(scene, camera); };
    animate();

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((mm) => mm.dispose());
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [measurements, garment, color, length, cloth]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: 320 }} />;
}
