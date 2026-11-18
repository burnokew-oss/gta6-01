// Renderer 3D (Three.js r149 vendored): langit senja shader, kota
// InstancedMesh, kendaraan + karakter sebagai grup box, helikopter +
// kerucut spotlight, tracer peluru, partikel, marker misi, dan kamera
// chase dengan lag.
//
// Semua art prosedural — tidak ada aset eksternal. Bila WebGL tidak
// tersedia, renderer menandai webglOK=false dan main.js menampilkan
// pesan fallback (bukan layar hitam).
import { CITY_HALF, ROAD_LINES, ROAD_WIDTH, KMH_PER_UNIT } from './config.js';
import { SHOP_DEFS } from './shops.js';

const WORLD = CITY_HALF * 2;

export function createRenderer(canvas) {
  let webglOK = true;
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(1);
  } catch {
    webglOK = false;
  }

  // ---- scene, kamera, cahaya ----
  const scene = webglOK ? new THREE.Scene() : null;
  const camera = webglOK ? new THREE.PerspectiveCamera(65, 1, 0.1, 1500) : null;
  const ambient = webglOK ? new THREE.AmbientLight(0x8a7aa8, 0.85) : null;
  const sun = webglOK ? new THREE.DirectionalLight(0xffb070, 1.15) : null;
  const fill = webglOK ? new THREE.DirectionalLight(0xffd9b0, 0.5) : null;
  if (webglOK) {
    scene.add(ambient);
    sun.position.set(-40, 30, -75);
    scene.add(sun);
    // Fill dari timur: sisi mobil yang membelakangi matahari senja
    // tetap terbaca (mobil hero merah tidak jadi siluet hitam).
    fill.position.set(80, 50, 40);
    scene.add(fill);
    scene.fog = new THREE.Fog(0x3b2a4d, 90, 420);
  }

  // ---- langit: kubah shader gradien + piringan matahari ----
  const skyUniforms = webglOK ? {
    uTop: { value: new THREE.Color(0x2a338c) },
    uMid: { value: new THREE.Color(0xf28c59) },
    uBot: { value: new THREE.Color(0x8c4d4d) },
    uSunDir: { value: new THREE.Vector3(-0.35, 0.3, -0.75).normalize() },
    uSunAmt: { value: 0.85 },
  } : null;
  if (webglOK) {
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: skyUniforms,
      vertexShader: 'varying vec3 vDir; void main(){ vDir=normalize(position); vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'precision mediump float; varying vec3 vDir; uniform vec3 uTop,uMid,uBot,uSunDir; uniform float uSunAmt;'
        + ' void main(){ float h=vDir.y*0.5+0.5;'
        + ' vec3 col = h>0.55 ? mix(uMid,uTop,(h-0.55)/0.45) : mix(uBot,uMid,h/0.55);'
        + ' float s=max(dot(normalize(vDir),normalize(uSunDir)),0.0);'
        + ' col+=vec3(1.0,0.75,0.35)*pow(s,350.0)*2.5*uSunAmt;'
        + ' col+=vec3(1.0,0.45,0.12)*pow(s,6.0)*0.50*uSunAmt;'
        + ' gl_FragColor=vec4(col,1.0); }',
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(800, 24, 16), skyMat));
  }

  // ---- material + geometri bersama ----
  const boxGeo = webglOK ? new THREE.BoxGeometry(1, 1, 1) : null;
  const planeGeo = webglOK ? new THREE.PlaneGeometry(1, 1) : null;
  const sphereGeo = webglOK ? new THREE.SphereGeometry(0.35, 8, 6) : null;
  const coneGeo = webglOK ? new THREE.ConeGeometry(1, 1, 8) : null;
  const lambertCache = new Map();
  function lambert(hex) {
    if (!lambertCache.has(hex)) lambertCache.set(hex, new THREE.MeshLambertMaterial({ color: hex }));
    return lambertCache.get(hex);
  }
  const basicCache = new Map();
  function basic(hex) {
    if (!basicCache.has(hex)) basicCache.set(hex, new THREE.MeshBasicMaterial({ color: hex }));
    return basicCache.get(hex);
  }
  const dummy = webglOK ? new THREE.Object3D() : null;

  function putBox(parent, x, y, z, sx, sy, sz, mat) {
    const m = new THREE.Mesh(boxGeo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    parent.add(m);
    return m;
  }

  // ---- tanah, pasir, laut ----
  if (webglOK) {
    putBox(scene, 9, -0.5, 0, 242, 1, 260, lambert(0x557a45)); // rumput
    putBox(scene, -117, -0.45, 0, 10, 0.9, 260, lambert(0xd8c08a)); // pantai
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 500), lambert(0x2a6a9a));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(-270, -0.3, 0);
    scene.add(sea);
    // Dermaga timur (pelabuhan).
    putBox(scene, 128, 0.2, 40, 26, 0.8, 30, lambert(0x73614e));
  }

  // ---- jalan + trotoar + marka ----
  let roadMesh = null;
  let dashMesh = null;
  if (webglOK) {
    const roadSpots = [];
    for (const g of ROAD_LINES) {
      roadSpots.push([g, 0, 0, ROAD_WIDTH, 0.12, WORLD + 20]);
      roadSpots.push([0, 0, g, WORLD + 20, 0.12, ROAD_WIDTH]);
    }
    // Jalan basah: Phong berkilau supaya lampu neon + lampu jalan
    // memantul di aspal (gaya malam-hujan referensi).
    roadMesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshPhongMaterial({ color: 0x15151d, shininess: 140, specular: 0x8a8a9a }), roadSpots.length);
    roadSpots.forEach((r, i) => {
      dummy.position.set(r[0], r[1], r[2]);
      dummy.scale.set(r[3], r[4], r[5]);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      roadMesh.setMatrixAt(i, dummy.matrix);
    });
    scene.add(roadMesh);
    const sideSpots = [];
    for (const g of ROAD_LINES) {
      sideSpots.push([g, 0, 0, ROAD_WIDTH + 8, 0.08, WORLD + 20]);
      sideSpots.push([0, 0, g, WORLD + 20, 0.08, ROAD_WIDTH + 8]);
    }
    const sideMesh = new THREE.InstancedMesh(boxGeo, lambert(0x9a9a92), sideSpots.length);
    sideSpots.forEach((r, i) => {
      dummy.position.set(r[0], r[1], r[2]);
      dummy.scale.set(r[3], r[4], r[5]);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      sideMesh.setMatrixAt(i, dummy.matrix);
    });
    scene.add(sideMesh);
    const dashes = [];
    for (const g of ROAD_LINES) {
      for (let t = -CITY_HALF; t <= CITY_HALF; t += 8) {
        dashes.push({ x: g, z: t, w: 0.35, d: 4, vertical: true });
        dashes.push({ x: t, z: g, w: 4, d: 0.35, vertical: false });
      }
    }
    dashMesh = new THREE.InstancedMesh(planeGeo, basic(0xd8d0a0), dashes.length);
    dashes.forEach((d, i) => {
      dummy.position.set(d.x, 0.08, d.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(d.w, d.d, 1);
      dummy.updateMatrix();
      dashMesh.setMatrixAt(i, dummy.matrix);
    });
    scene.add(dashMesh);
  }

  // ---- kota statis: gedung, jendela, palem, lampu, kontainer ----
  let cityBuilt = false;
  let shellMesh = null;
  let shellList = null;
  function buildCity(G) {
    if (cityBuilt) return;
    cityBuilt = true;
    const city = G.city;
    // Gedung: satu InstancedMesh, warna per instance.
    const bldg = new THREE.InstancedMesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), city.buildings.length);
    const col = new THREE.Color();
    city.buildings.forEach((b, i) => {
      dummy.position.set(b.x, b.h / 2, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bldg.setMatrixAt(i, dummy.matrix);
      bldg.setColorAt(i, col.setHex(b.color));
      if (b.tall) putBox(scene, b.x, b.h + 2.5, b.z, 0.4, 5, 0.4, lambert(0x4d4d52));
    });
    scene.add(bldg);
    // Jendela menyala: satu InstancedMesh bidang emissive.
    const wins = [];
    for (const b of city.buildings) {
      const cols = Math.max(2, Math.floor(b.w / 3.2));
      const rows = Math.max(2, Math.floor(b.h / 3.4));
      for (let s = 0; s < 4; s += 1) {
        for (let cx = 0; cx < cols; cx += 1) {
          for (let ry = 0; ry < rows; ry += 1) {
            if ((cx + ry + s) % 2 !== 0) continue;
            const warm = ((cx * 7 + ry * 3 + s) % 4) !== 0;
            const c = warm ? [1.0, 0.72, 0.28] : [0.65, 0.85, 1.0];
            const fx = (cx + 0.5) / cols - 0.5;
            const fy = 2.2 + ry * 3.4;
            if (fy > b.h - 1) continue;
            const off = 0.06;
            if (s === 0) wins.push({ x: b.x + fx * b.w, y: fy, z: b.z + b.d / 2 + off, ry: 0, c });
            if (s === 1) wins.push({ x: b.x + fx * b.w, y: fy, z: b.z - b.d / 2 - off, ry: Math.PI, c });
            if (s === 2) wins.push({ x: b.x + b.w / 2 + off, y: fy, z: b.z + fx * b.d, ry: Math.PI / 2, c });
            if (s === 3) wins.push({ x: b.x - b.w / 2 - off, y: fy, z: b.z + fx * b.d, ry: -Math.PI / 2, c });
          }
        }
      }
    }
    const winMesh = new THREE.InstancedMesh(planeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), wins.length);
    wins.forEach((w, i) => {
      dummy.position.set(w.x, w.y, w.z);
      dummy.rotation.set(0, w.ry, 0);
      dummy.scale.set(1.8, 1.6, 1);
      dummy.updateMatrix();
      winMesh.setMatrixAt(i, dummy.matrix);
      winMesh.setColorAt(i, col.setRGB(w.c[0], w.c[1], w.c[2]));
    });
    scene.add(winMesh);
    // Neon sign: papan nama bercahaya di fasad gedung dekat jalan +
    // pantulan warnanya di aspal basah (tekstur canvas prosedural,
    // tanpa aset eksternal).
    const NEON_TEXTS = ['KLUB', 'DISKO', 'WARUNG KOPI', 'ROOFTOP BAR', 'ARCADE 24/7', 'WARUNG', 'KAFE', 'HOTEL', 'BAR', 'SINEMA', 'PIZZA', 'KARAOKE', 'BILLIARD', 'TOKO 24 JAM'];
    const NEON_COLORS = ['#ff2d78', '#00e5ff', '#ffe14d', '#39ff6a', '#ff6a00', '#c26aff', '#ff3b30'];
    const neonTexCache = new Map();
    function neonTexture(text, color) {
      const key = `${text}|${color}`;
      if (neonTexCache.has(key)) return neonTexCache.get(key);
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 128;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 512, 128);
      ctx.font = '900 58px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = color;
      ctx.shadowBlur = 26;
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.strokeText(text, 256, 66);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.fillText(text, 256, 66);
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 4;
      neonTexCache.set(key, tex);
      return tex;
    }
    const signed = new Set();
    function placeSign(b, bi, f) {
      if (signed.has(b)) return;
      signed.add(b);
      const text = NEON_TEXTS[bi % NEON_TEXTS.length];
      const color = NEON_COLORS[(bi + 3) % NEON_COLORS.length];
      const w = Math.min(12, b.w * 0.95);
      const sign = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: neonTexture(text, color), transparent: true, side: THREE.DoubleSide }));
      sign.scale.set(w, w / 3, 1);
      sign.position.set(f.px, Math.min(4.5, b.h * 0.45), f.pz);
      sign.rotation.y = f.ry;
      scene.add(sign);
      // Pantulan neon di aspal basah (kotak tipis additif, mencapai jalan).
      const sx = f.nz !== 0 ? w * 0.9 : 13;
      const sz = f.nz !== 0 ? 13 : w * 0.9;
      const reach = (f.gap || 0) * 0.5 + 1.5;
      putBox(scene, f.px + f.nx * reach, 0.09, f.pz + f.nz * reach, sx, 0.05, sz,
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
    }
    city.buildings.forEach((b, bi) => {
      if (b.h < 6 || bi % 3 !== 0) return;
      // Fasad terdekat ke garis jalan (sisi mana pun).
      const faces = [
        { gap: Math.min(...ROAD_LINES.map((ln) => Math.abs(b.z + b.d / 2 - ln))), ry: 0, nx: 0, nz: 1, px: b.x, pz: b.z + b.d / 2 + 0.15 },
        { gap: Math.min(...ROAD_LINES.map((ln) => Math.abs(b.z - b.d / 2 - ln))), ry: Math.PI, nx: 0, nz: -1, px: b.x, pz: b.z - b.d / 2 - 0.15 },
        { gap: Math.min(...ROAD_LINES.map((ln) => Math.abs(b.x + b.w / 2 - ln))), ry: Math.PI / 2, nx: 1, nz: 0, px: b.x + b.w / 2 + 0.15, pz: b.z },
        { gap: Math.min(...ROAD_LINES.map((ln) => Math.abs(b.x - b.w / 2 - ln))), ry: -Math.PI / 2, nx: -1, nz: 0, px: b.x - b.w / 2 - 0.15, pz: b.z },
      ];
      faces.sort((a, c2) => a.gap - c2.gap);
      const f = faces[0];
      if (f.gap > 12) return;
      placeSign(b, bi, f);
    });
    // Koridor neon: jalan yang ramai (z=12 CBD + z=100 pelabuhan) wajib
    // punya neon di kedua sisi, supaya frame chase DAN shootout selalu
    // punya papan neon di dalam frame.
    function neonCorridor(roadZ, x0, x1) {
      city.buildings.forEach((b, bi) => {
        if (b.h < 6 || b.x < x0 || b.x > x1) return;
        const faces = [
          { gap: Math.min(Math.abs(b.z + b.d / 2 - roadZ), Math.min(...ROAD_LINES.map((ln) => Math.abs(b.z + b.d / 2 - ln)))), ry: 0, nx: 0, nz: 1, px: b.x, pz: b.z + b.d / 2 + 0.15 },
          { gap: Math.min(Math.abs(b.z - b.d / 2 - roadZ), Math.min(...ROAD_LINES.map((ln) => Math.abs(b.z - b.d / 2 - ln)))), ry: Math.PI, nx: 0, nz: -1, px: b.x, pz: b.z - b.d / 2 - 0.15 },
          { gap: Math.min(...ROAD_LINES.map((ln) => Math.abs(b.x + b.w / 2 - ln))), ry: Math.PI / 2, nx: 1, nz: 0, px: b.x + b.w / 2 + 0.15, pz: b.z },
          { gap: Math.min(...ROAD_LINES.map((ln) => Math.abs(b.x - b.w / 2 - ln))), ry: -Math.PI / 2, nx: -1, nz: 0, px: b.x - b.w / 2 - 0.15, pz: b.z },
        ];
        faces.sort((a, c2) => a.gap - c2.gap);
        const f = faces[0];
        if (f.gap > 16) return;
        placeSign(b, bi + 5, f);
      });
    }
    neonCorridor(12, -40, 110);
    neonCorridor(100, 40, 110);
    // Billboard raksasa "TELUK FM" di koridor chase: papan pink menghadap
    // kamera (timur), di selatan jalan z=12, di depan mobil hero.
    const bbCanvas = document.createElement('canvas');
    bbCanvas.width = 1024;
    bbCanvas.height = 384;
    const bctx = bbCanvas.getContext('2d');
    bctx.fillStyle = '#ff2d78';
    bctx.fillRect(0, 0, 1024, 384);
    bctx.strokeStyle = '#ffffff';
    bctx.lineWidth = 10;
    bctx.strokeRect(14, 14, 996, 356);
    bctx.font = '900 130px Arial, sans-serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillStyle = '#ffffff';
    bctx.shadowColor = '#ff8ab0';
    bctx.shadowBlur = 30;
    bctx.fillText('TELUK FM', 600, 160);
    bctx.font = '700 64px Arial, sans-serif';
    bctx.fillText('88.1 · MALAM NEON', 600, 300);
    const bbTex = new THREE.CanvasTexture(bbCanvas);
    bbTex.anisotropy = 4;
    const billboard = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: bbTex, side: THREE.DoubleSide }));
    billboard.scale.set(14, 5.2, 1);
    // Menghadap timur (ke kamera chase) — digeser ke barat + selatan supaya
    // tidak menutupi titik hilang jalan (ala referensi: papan di sisi jalan).
    billboard.position.set(-20, 8, 26);
    billboard.rotation.y = Math.PI / 2;
    scene.add(billboard);
    // Palem koridor: deret palem tinggi berbatang merah di tepi jalan
    // z=12 (avenue ala referensi rank 1).
    const corTrunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 1, 6);
    const corCrownGeo = new THREE.ConeGeometry(3, 3.6, 6);
    const corSpots = [];
    for (let i = 0; i < 10; i += 1) {
      if (i === 2 || i === 4 || i === 6) continue; // palem selatan ini menutupi billboard TELUK FM — lewati
      corSpots.push({ x: -30 + i * 10, z: 12 + (i % 2 === 0 ? 9.5 : -9.5), h: 9 + (i % 3) });
    }
    const corTrunks = new THREE.InstancedMesh(corTrunkGeo, lambert(0x7a2a20), corSpots.length);
    const corCrowns = new THREE.InstancedMesh(corCrownGeo, lambert(0x1e8a2e), corSpots.length);
    corSpots.forEach((pt, i) => {
      dummy.position.set(pt.x, pt.h / 2, pt.z);
      dummy.scale.set(1, pt.h, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      corTrunks.setMatrixAt(i, dummy.matrix);
      dummy.position.set(pt.x, pt.h + 1.6, pt.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      corCrowns.setMatrixAt(i, dummy.matrix);
    });
    scene.add(corTrunks);
    scene.add(corCrowns);
    // Palem: batang + tajuk, masing-masing satu InstancedMesh.
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 1, 6);
    const crownGeo = new THREE.ConeGeometry(2.2, 2.6, 6);
    const trunks = new THREE.InstancedMesh(trunkGeo, lambert(0x402914), city.palms.length);
    const crowns = new THREE.InstancedMesh(crownGeo, lambert(0x14541a), city.palms.length);
    city.palms.forEach((p, i) => {
      dummy.position.set(p.x, p.h / 2, p.z);
      dummy.scale.set(1, p.h, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      dummy.position.set(p.x, p.h + 1.2, p.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);
    });
    scene.add(trunks);
    scene.add(crowns);
    // Lampu jalan: tiang + kepala menyala.
    const poles = new THREE.InstancedMesh(boxGeo, lambert(0x1f1f24), city.lamps.length);
    const heads = new THREE.InstancedMesh(boxGeo, basic(0xffd88a), city.lamps.length);
    city.lamps.forEach((l, i) => {
      dummy.position.set(l.x, 2.6, l.z);
      dummy.scale.set(0.3, 5.2, 0.3);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      dummy.position.set(l.x, 5.3, l.z);
      dummy.scale.set(1.1, 0.35, 0.35);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
    });
    scene.add(poles);
    scene.add(heads);
    // Kontainer pelabuhan.
    const cont = new THREE.InstancedMesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), city.containers.length);
    city.containers.forEach((c, i) => {
      dummy.position.set(c.x, c.h / 2, c.z);
      dummy.scale.set(c.w, c.h, c.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      cont.setMatrixAt(i, dummy.matrix);
      cont.setColorAt(i, col.setHex(c.color));
    });
    scene.add(cont);
    // Kerang Teluk: bola emas kecil.
    shellList = G.shells;
    shellMesh = new THREE.InstancedMesh(sphereGeo, basic(0xffd23f), shellList.length);
    scene.add(shellMesh);
  }

  // ---- kendaraan dinamis ----
  const carGroups = new Map();
  function buildCar(v) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: v.color });
    const body = putBox(g, 0, 0.55, 0, v.wid, 0.55, v.len, bodyMat);
    g.userData.body = body;
    g.userData.bodyMat = bodyMat;
    g.userData.baseColor = v.color;
    // Kabin: warna bodi digelapkan (bukan biru baja) — hero merah tetap merah.
    const cabCol = new THREE.Color(v.color).multiplyScalar(0.65).getHex();
    putBox(g, 0, 1.0, -0.3, v.wid - 0.4, 0.45, v.len * 0.42, lambert(cabCol)); // kabin
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.3, 10);
    const wheelMat = lambert(0x0d0d0f);
    for (const [wx, wz] of [[-0.85, 1.45], [0.85, 1.45], [-0.85, -1.45], [0.85, -1.45]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set((wx / 0.85) * (v.wid / 2 - 0.1), 0.32, (wz / 1.45) * (v.len / 2 - 0.6));
      g.add(w);
    }
    putBox(g, 0, 0.62, v.len / 2 + 0.01, v.wid - 0.5, 0.18, 0.06, basic(0xfff299)); // lampu depan
    putBox(g, 0, 0.62, -v.len / 2 - 0.01, v.wid - 0.5, 0.18, 0.06, basic(0xe61414)); // lampu belakang
    if (v.type === 'sport') {
      // Spoiler GT: sayap belakang + dua penyangga.
      putBox(g, 0, 1.22, -v.len / 2 + 0.3, v.wid - 0.3, 0.08, 0.6, lambert(0x111114));
      putBox(g, -0.6, 1.0, -v.len / 2 + 0.3, 0.1, 0.3, 0.1, lambert(0x111114));
      putBox(g, 0.6, 1.0, -v.len / 2 + 0.3, 0.1, 0.3, 0.1, lambert(0x111114));
    }
    if (v.type === 'police') {
      putBox(g, 0, 0.62, 0, v.wid + 0.02, 0.22, v.len * 0.55, lambert(0x0d0d14));
      const barL = putBox(g, -0.35, 1.42, -0.3, 0.6, 0.22, 0.7, new THREE.MeshBasicMaterial({ color: 0xff1a1a }));
      const barR = putBox(g, 0.35, 1.42, -0.3, 0.6, 0.22, 0.7, new THREE.MeshBasicMaterial({ color: 0x2244ff }));
      g.userData.barL = barL;
      g.userData.barR = barR;
    }
    if (v.type === 'taxi') {
      const sign = putBox(g, 0, 1.45, -0.3, 0.8, 0.25, 0.4, basic(0xf2c200));
      g.userData.sign = sign;
    }
    return g;
  }
  function syncCars(G, t) {
    const seen = new Set();
    for (const v of G.vehicles) {
      seen.add(v);
      let g = carGroups.get(v);
      if (!g) {
        g = buildCar(v);
        carGroups.set(v, g);
        scene.add(g);
      }
      if (g.userData.baseColor !== v.color) {
        g.userData.baseColor = v.color;
        g.userData.bodyMat.color.setHex(v.color);
      }
      g.position.set(v.x, 0, v.z);
      g.rotation.y = v.angle;
      g.visible = !v.dead;
      if (v.flash > 0) g.userData.bodyMat.color.setHex(0xffffff);
      else g.userData.bodyMat.color.setHex(g.userData.baseColor);
      if (g.userData.barL) {
        const phase = Math.floor(t * 4) % 2 === 0;
        g.userData.barL.material.color.setHex(phase ? 0xff1a1a : 0x2244ff);
        g.userData.barR.material.color.setHex(phase ? 0x2244ff : 0xff1a1a);
      }
    }
    for (const [v, g] of carGroups) {
      if (!seen.has(v)) {
        scene.remove(g);
        carGroups.delete(v);
      }
    }
  }

  // ---- karakter jalan kaki ----
  const personGroups = new Map();
  function buildPerson(color, armed, enemy) {
    const g = new THREE.Group();
    putBox(g, 0, 0.95, 0, 0.7, 1.1, 0.4, lambert(color)); // badan
    putBox(g, 0, 1.72, 0, 0.42, 0.42, 0.42, lambert(0xe8b98a)); // kepala
    putBox(g, 0, 0.35, 0, 0.55, 0.7, 0.35, lambert(0x222831)); // kaki
    if (armed) putBox(g, 0, 1.05, 0.45, 0.18, 0.18, 0.8, lambert(0x111111)); // senjata
    if (enemy) {
      const marker = new THREE.Mesh(coneGeo, basic(0xff2222));
      marker.scale.set(0.5, 0.9, 0.5);
      marker.position.y = 2.5;
      marker.rotation.x = Math.PI;
      g.add(marker);
      g.userData.marker = marker;
      const bg = putBox(g, 0, 2.15, 0, 1.1, 0.12, 0.05, basic(0x111111));
      const fg = putBox(g, 0, 2.15, 0, 1.1, 0.12, 0.06, basic(0xe5534b));
      g.userData.hpBg = bg;
      g.userData.hpFg = fg;
    }
    return g;
  }
  function syncPeople(G, t) {
    const seen = new Set();
    const entries = [];
    for (const ped of G.peds) entries.push({ e: ped, color: ped.color, armed: false, enemy: false });
    for (const c of G.cops) entries.push({ e: c, color: 0x1c2f6e, armed: true, enemy: false });
    for (const en of G.enemies) entries.push({ e: en, color: en.color, armed: true, enemy: true });
    for (const { e, color, armed, enemy } of entries) {
      seen.add(e);
      let g = personGroups.get(e);
      if (!g) {
        g = buildPerson(color, armed, enemy);
        personGroups.set(e, g);
        scene.add(g);
      }
      g.position.set(e.x, 0, e.z);
      g.rotation.y = e.angle;
      g.visible = !e.dead;
      if (g.userData.marker) {
        g.userData.marker.position.y = 2.5 + Math.sin(t * 4) * 0.15;
        const ratio = Math.max(0, e.health / 60);
        g.userData.hpFg.scale.x = ratio;
        g.userData.hpFg.position.x = -(1 - ratio) * 0.55;
      }
    }
    for (const [e, g] of personGroups) {
      if (!seen.has(e)) {
        scene.remove(g);
        personGroups.delete(e);
      }
    }
  }

  // ---- pemain jalan kaki ----
  const playerGroup = webglOK ? buildPerson(0x2e6fb5, true, false) : null;
  if (webglOK) scene.add(playerGroup);

  // ---- helikopter ----
  const heliGroup = webglOK ? new THREE.Group() : null;
  let heliRotor = null;
  let heliBlink = null;
  let spotCone = null;
  let spotCircle = null;
  if (webglOK) {
    putBox(heliGroup, 0, 0, 0, 2.2, 1.4, 4.6, lambert(0x1f242e));
    putBox(heliGroup, 0, 0.5, 1.6, 1.8, 1.0, 1.6, lambert(0x1a2942));
    putBox(heliGroup, 0, 0.1, -3.6, 0.7, 0.7, 3.4, lambert(0x1f242e));
    putBox(heliGroup, 0, 0.5, -5.2, 0.25, 1.6, 0.25, lambert(0x1f242e));
    putBox(heliGroup, -0.9, -0.85, 0.8, 0.18, 0.18, 3.4, lambert(0x0d0d14));
    putBox(heliGroup, 0.9, -0.85, 0.8, 0.18, 0.18, 3.4, lambert(0x0d0d14));
    heliRotor = new THREE.Group();
    heliRotor.position.y = 0.85;
    putBox(heliRotor, 0, 0, 0, 11, 0.1, 0.5, lambert(0x0d0d14));
    putBox(heliRotor, 0, 0, 0, 0.5, 0.1, 11, lambert(0x0d0d14));
    heliGroup.add(heliRotor);
    heliBlink = putBox(heliGroup, 0, -0.8, 0, 0.4, 0.2, 0.4, new THREE.MeshBasicMaterial({ color: 0xff1a1a }));
    scene.add(heliGroup);
    // Kerucut spotlight + lingkaran cahaya di tanah.
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff0a0, transparent: true, opacity: 0.05,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    spotCone = new THREE.Mesh(new THREE.ConeGeometry(6, 14, 20, 1, true), coneMat);
    scene.add(spotCone);
    const circMat = new THREE.MeshBasicMaterial({
      color: 0xfff0a0, transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    spotCircle = new THREE.Mesh(new THREE.CircleGeometry(5, 24), circMat);
    spotCircle.rotation.x = -Math.PI / 2;
    scene.add(spotCircle);
  }

  // ---- tracer peluru + partikel ----
  const tracerGeo = webglOK ? new THREE.BufferGeometry() : null;
  const tracerPos = webglOK ? new Float32Array(3 * 2 * 64) : null;
  if (webglOK) {
    tracerGeo.setAttribute('position', new THREE.BufferAttribute(tracerPos, 3));
    const tracers = new THREE.LineSegments(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9 }));
    tracers.frustumCulled = false;
    scene.add(tracers);
  }
  const MAX_PART = 300;
  const partGeo = webglOK ? new THREE.BufferGeometry() : null;
  const partPos = webglOK ? new Float32Array(MAX_PART * 3) : null;
  const partCol = webglOK ? new Float32Array(MAX_PART * 3) : null;
  if (webglOK) {
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    partGeo.setAttribute('color', new THREE.BufferAttribute(partCol, 3));
    const points = new THREE.Points(partGeo, new THREE.PointsMaterial({ size: 0.6, vertexColors: true, transparent: true, opacity: 0.95 }));
    points.frustumCulled = false;
    scene.add(points);
  }

  // ---- marker misi / toko ----
  const markerMat = webglOK ? new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, side: THREE.DoubleSide }) : null;
  const markerRing = webglOK ? new THREE.Mesh(new THREE.RingGeometry(1.4, 1.9, 32), markerMat) : null;
  if (webglOK) {
    markerRing.rotation.x = -Math.PI / 2;
    markerRing.position.y = 0.1;
    scene.add(markerRing);
  }
  const shopMarkers = [];
  if (webglOK) {
    for (const s of SHOP_DEFS) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.6, 2.1, 32),
        new THREE.MeshBasicMaterial({ color: 0x7dff8a, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(s.x, 0.1, s.z);
      scene.add(ring);
      const pillar = putBox(scene, s.x, 1.2, s.z, 0.5, 2.4, 0.5, basic(0x7dff8a));
      shopMarkers.push({ ring, pillar });
    }
  }

  // ---- muzzle flash: cahaya titik + sprite kuning di ujung laras ----
  const flashLight = webglOK ? new THREE.PointLight(0xffd23f, 0, 18) : null;
  const flashSprite = webglOK ? new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffd23f, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })) : null;
  if (webglOK) {
    scene.add(flashLight);
    flashSprite.scale.set(0.8, 0.8, 1);
    flashSprite.visible = false;
    scene.add(flashSprite);
  }
  // ---- garis tembak kuning persisten (balok additif laras -> musuh) ----
  const flashBeam = webglOK ? new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })) : null;
  if (webglOK) {
    flashBeam.visible = false;
    scene.add(flashBeam);
  }

  // ---- hujan: garis-garis vertikal di sekitar pemain (aktif bila G.rain) ----
  const RAIN_COUNT = 350;
  const rainGeo = webglOK ? new THREE.BufferGeometry() : null;
  let rain = null;
  if (webglOK) {
    const pos = new Float32Array(RAIN_COUNT * 2 * 3);
    let rs = 1234567; // sebaran deterministik
    const rnd = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
    for (let i = 0; i < RAIN_COUNT; i += 1) {
      const x = (rnd() - 0.5) * 80;
      const y = rnd() * 28;
      const z = (rnd() - 0.5) * 80;
      pos.set([x, y, z, x, y - 1.2, z], i * 6);
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x8fa8cc, transparent: true, opacity: 0.55 }));
    rain.frustumCulled = false;
    rain.visible = false;
    scene.add(rain);
  }

  // ---- kamera ----
  const camPos = webglOK ? new THREE.Vector3(0, 40, 90) : null;
  const camLook = webglOK ? new THREE.Vector3(0, 0, 0) : null;
  let camInit = false;
  const raycaster = webglOK ? new THREE.Raycaster() : null;
  const ndc = webglOK ? new THREE.Vector2() : null;

  function resize() {
    if (!webglOK) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if (webglOK) {
    resize();
    window.addEventListener('resize', resize);
  }

  // Warna langit + cahaya menurut jam game.
  function applyTimeOfDay(clock) {
    const hour = clock / 60;
    let top; let mid; let bot; let fog; let amb; let sunI; let sunC; let sunDir; let sunAmt;
    if (hour >= 17 && hour < 19) {
      // Senja: oranye-ungu, matahari rendah di barat.
      top = 0x2a338c; mid = 0xf28c59; bot = 0x8c4d4d; fog = 0x3b2a4d;
      amb = 0.85; sunI = 1.0; sunC = 0xffb070;
      sunDir = new THREE.Vector3(-0.75, 0.22, -0.15).normalize(); sunAmt = 1;
    } else if (hour >= 19 || hour < 6) {
      // Malam: biru gelap, bulan redup.
      top = 0x0a0d2a; mid = 0x1a2450; bot = 0x2a1a38; fog = 0x141828;
      amb = 0.45; sunI = 0.3; sunC = 0x8fa8ff;
      sunDir = new THREE.Vector3(0.3, 0.6, -0.4).normalize(); sunAmt = 0.25;
    } else {
      // Siang: biru cerah, matahari tinggi.
      top = 0x3a6fd8; mid = 0x9fc8e8; bot = 0xe8d8b0; fog = 0xa8c8d8;
      amb = 0.95; sunI = 1.25; sunC = 0xfff2d0;
      sunDir = new THREE.Vector3(0.3, 0.85, 0.25).normalize(); sunAmt = 0.7;
    }
    skyUniforms.uTop.value.setHex(top);
    skyUniforms.uMid.value.setHex(mid);
    skyUniforms.uBot.value.setHex(bot);
    skyUniforms.uSunDir.value.copy(sunDir);
    skyUniforms.uSunAmt.value = sunAmt;
    scene.fog.color.setHex(fog);
    ambient.intensity = amb;
    sun.intensity = sunI;
    sun.color.setHex(sunC);
    sun.position.copy(sunDir).multiplyScalar(100);
  }

  function draw(G) {
    if (!webglOK) return;
    buildCity(G);
    const t = G.time;
    applyTimeOfDay(G.clock);

    // Hujan: garis jatuh mengelilingi pemain (offset berputar tiap 1,2u).
    if (rain) {
      rain.visible = !!G.rain;
      if (G.rain) {
        rain.position.set(G.player.x, -((G.time * 22) % 1.2), G.player.z);
      }
    }

    // Kerang: sembunyikan yang sudah diambil.
    if (shellMesh && G.shells) {
      G.shells.forEach((s, i) => {
        dummy.position.set(s.x, 0.4, s.z);
        dummy.scale.setScalar(s.taken ? 0.001 : 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        shellMesh.setMatrixAt(i, dummy.matrix);
      });
      shellMesh.instanceMatrix.needsUpdate = true;
    }

    syncCars(G, t);
    syncPeople(G, t);

    // Pemain jalan kaki (sembunyi saat di mobil).
    const p = G.player;
    playerGroup.visible = p.onFoot;
    if (p.onFoot) {
      playerGroup.position.set(p.x, 0, p.z);
      playerGroup.rotation.y = p.angle;
    }

    // Helikopter + sorot.
    if (G.heli) {
      const h = G.heli;
      heliGroup.visible = true;
      heliGroup.position.set(h.x, h.y, h.z);
      heliGroup.rotation.y = h.angle;
      heliRotor.rotation.y = h.rotor;
      heliBlink.material.color.setHex(Math.floor(t * 2) % 2 === 0 ? 0xff1a1a : 0x111111);
      spotCone.visible = true;
      spotCircle.visible = true;
      // Kerucut: puncak di heli, mulut di tanah dekat pemain. Sumbu Y
      // kerucut diarahkan dari pemain ke heli, panjang disesuaikan jarak.
      const dx = h.x - p.x;
      const dz = h.z - p.z;
      const dist = Math.hypot(dx, h.y, dz);
      spotCone.position.set((h.x + p.x) / 2, h.y / 2, (h.z + p.z) / 2);
      spotCone.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(dx / dist, h.y / dist, dz / dist),
      );
      spotCone.scale.set(0.45, Math.max(0.6, dist / 14), 0.45);
      spotCircle.position.set(p.x, 0.09, p.z);
      spotCircle.scale.set(0.4, 0.4, 1); // cakram sorot kecil, jangan tutupi jalan/mobil
    } else {
      heliGroup.visible = false;
      spotCone.visible = false;
      spotCircle.visible = false;
    }

    // Muzzle flash: cahaya + sprite di ujung laras.
    if (G.muzzleFlash > 0 && p.onFoot) {
      const fx = p.x + Math.sin(p.aimAngle) * 1.4;
      const fz = p.z + Math.cos(p.aimAngle) * 1.4;
      flashLight.position.set(fx, 1.6, fz);
      flashLight.intensity = 3;
      flashSprite.position.set(fx, 1.6, fz);
      flashSprite.visible = true;
      // Balok tracer persisten laras -> target (tidak ikut decay peluru).
      if (G.flashTarget) {
        const tx = G.flashTarget.x;
        const tz = G.flashTarget.z;
        const len = Math.hypot(tx - fx, tz - fz);
        flashBeam.visible = true;
        flashBeam.position.set((fx + tx) / 2, 1.4, (fz + tz) / 2);
        flashBeam.scale.set(0.16, 0.16, Math.max(0.5, len));
        flashBeam.lookAt(tx, 1.4, tz);
      } else {
        flashBeam.visible = false;
      }
    } else {
      flashLight.intensity = 0;
      flashSprite.visible = false;
      flashBeam.visible = false;
    }

    // Tracer peluru.
    let n = 0;
    for (const b of G.bullets) {
      if (n >= 64) break;
      tracerPos[n * 6] = b.px ?? b.x;
      tracerPos[n * 6 + 1] = 1.2;
      tracerPos[n * 6 + 2] = b.pz ?? b.z;
      tracerPos[n * 6 + 3] = b.x;
      tracerPos[n * 6 + 4] = 1.2;
      tracerPos[n * 6 + 5] = b.z;
      n += 1;
    }
    tracerGeo.setDrawRange(0, n * 2);
    tracerGeo.attributes.position.needsUpdate = true;

    // Partikel.
    const pc = new THREE.Color();
    let pn = 0;
    for (const pt of G.particles) {
      if (pn >= MAX_PART) break;
      partPos[pn * 3] = pt.x;
      partPos[pn * 3 + 1] = 0.8 + (1 - pt.life / pt.max) * 1.5;
      partPos[pn * 3 + 2] = pt.z;
      pc.setHex(pt.color);
      partCol[pn * 3] = pc.r;
      partCol[pn * 3 + 1] = pc.g;
      partCol[pn * 3 + 2] = pc.b;
      pn += 1;
    }
    partGeo.setDrawRange(0, pn);
    partGeo.attributes.position.needsUpdate = true;
    partGeo.attributes.color.needsUpdate = true;

    // Marker objektif misi.
    let markerAt = null;
    const m = G.mission;
    if (m.started && m.index >= 0) {
      const step = G.missionDefs[m.index].steps[m.step];
      if (step && step.x !== undefined) markerAt = { x: step.x, z: step.z, color: 0xffd23f };
      if (step && step.type === 'route') {
        const pt = step.points[m.routeIndex];
        if (pt) markerAt = { x: pt.x, z: pt.z, color: 0xffd23f };
      }
      if (step && step.type === 'tail' && m.tail) {
        markerAt = { x: m.tail.vehicle.x, z: m.tail.vehicle.z, color: 0xff4f4f };
      }
      if (step && step.type === 'race' && m.race) {
        const cp = m.race.checkpoints[m.race.next];
        if (cp) markerAt = { x: cp.x, z: cp.z, color: 0x7dff8a };
      }
    }
    if (m.taxi) markerAt = { x: m.taxi.px, z: m.taxi.pz, color: 0xffd23f };
    if (markerAt) {
      markerRing.visible = true;
      markerRing.position.x = markerAt.x;
      markerRing.position.z = markerAt.z;
      markerRing.material.color.setHex(markerAt.color);
      const s = 1 + Math.sin(t * 4) * 0.15;
      markerRing.scale.set(s, s, 1);
    } else {
      markerRing.visible = false;
    }

    // ---- kamera ----
    if (G.shotCam) {
      // Kamera staging deterministik (?shot=): posisi + tatapan persis,
      // tanpa lerp — dipakai shot chase/shootout supaya hero besar di frame.
      camPos.set(G.shotCam.px, G.shotCam.py, G.shotCam.pz);
      camLook.set(G.shotCam.lx, G.shotCam.ly, G.shotCam.lz);
      camInit = false;
    } else if (G.screen === 'title') {
      if (G.titleFixed) {
        // Poster: mobil hero + Raka besar di foreground kiri-bawah, kota neon di belakang.
        camPos.set(10, 2.6, 30);
        camLook.set(8, 4.5, 16);
      } else {
        const a = t * 0.05;
        camPos.set(Math.sin(a) * 85, 38 + Math.sin(t * 0.1) * 4, Math.cos(a) * 85);
        camLook.set(0, 8, 0);
      }
      camInit = false;
    } else {
      const inCar = !p.onFoot;
      const back = inCar ? 10.5 : 7;
      const up = inCar ? 4.4 : 3.2;
      const tx = p.x - Math.sin(p.angle) * back;
      const tz = p.z - Math.cos(p.angle) * back;
      if (!camInit) {
        camPos.set(tx, up, tz);
        camInit = true;
      }
      const k = 1 - Math.exp(-(1 / 60) * 3.2);
      camPos.x += (tx - camPos.x) * k;
      camPos.y += (up - camPos.y) * k;
      camPos.z += (tz - camPos.z) * k;
      camLook.set(p.x + Math.sin(p.angle) * 7, 1.6, p.z + Math.cos(p.angle) * 7);
    }
    const shx = G.shake > 0 ? (Math.random() - 0.5) * G.shake * 0.3 : 0;
    const shy = G.shake > 0 ? (Math.random() - 0.5) * G.shake * 0.3 : 0;
    camera.position.set(camPos.x + shx, camPos.y + shy, camPos.z);
    camera.lookAt(camLook);
    renderer.render(scene, camera);

    // Titik bidik mouse di tanah (y=0) — dipakai pemain jalan kaki.
    if (G.input) {
      ndc.set((G.input.mouse.x / G.viewW) * 2 - 1, -(G.input.mouse.y / G.viewH) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const o = raycaster.ray.origin;
      const d = raycaster.ray.direction;
      if (Math.abs(d.y) > 0.001) {
        const tt = -o.y / d.y;
        if (tt > 0) G.aimPoint = { x: o.x + d.x * tt, z: o.z + d.z * tt };
      }
    }
  }

  return {
    draw,
    resize,
    snapCamera() { camInit = false; },
    get webglOK() { return webglOK; },
    _scene: scene, // hook debug: inspeksi scene dari console/playtest
  };
}
