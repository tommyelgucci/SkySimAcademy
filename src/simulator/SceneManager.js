/**
 * SceneManager — todo lo relacionado con Three.js vive aquí.
 *
 * Responsabilidades: escena, luces, mundo (el escenario que se le pida en
 * el constructor, o uno al azar si no se indica; todos rodeados de océano),
 * el avión y la cámara de persecución. No sabe nada de física ni de React:
 * recibe el estado del FlightEngine en cada frame y lo dibuja.
 *
 * Los nombres visibles de los escenarios NO viven aquí: la UI los resuelve
 * vía i18next con la clave `simulator:scenarios.<id>` (5 idiomas).
 *
 * Además de dibujar, construye una descripción del terreno (pista(s)
 * seguras + radio del mapa) que expone vía `getTerrain()`, pensada para
 * pasarse tal cual a `flightEngine.setTerrain(...)`. Si nadie hace esa
 * llamada, FlightEngine se comporta exactamente igual que antes: aterrizar
 * suave y nivelado en cualquier sitio es válido.
 *
 * Interfaz pública:
 *   new SceneManager(canvas, scenarioId?)  — id de SCENARIOS o null (azar)
 *   .scene .camera .aircraft .scenario
 *   .update(state, dt)
 *   .render()
 *   .resize(width, height)
 *   .dispose()
 *   .getTerrain()       -> { mapRadius, isSafeZone(x,z) }
 */
import * as THREE from "three";

const SKY_TOP = 0x2f6fb0;
const SKY_HORIZON = 0xdff2f8;
const CAMERA_OFFSET = new THREE.Vector3(0, 3.4, 10); // detrás y encima del avión
const OCEAN_RADIUS = 3800;

/** Ids de escenario disponibles (la UI construye el selector con esto). */
export const SCENARIOS = ["desert", "mountain", "coastal", "platform"];

// Temporales reutilizados por frame (evitan crear objetos en el loop)
const _desired = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

/** PRNG determinista simple (LCG). Cada escenario arranca con una semilla
 *  distinta para que las rocas/palmeras/etc. varíen de un vuelo a otro. */
function makeSeededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Test de "punto dentro de un rectángulo" en el plano XZ, con rotación en
 *  Y para pistas que no van derechas al norte. */
function makeRectZone(cx, cz, halfLength, halfWidth, rotationY = 0) {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  return (x, z) => {
    const dx = x - cx;
    const dz = z - cz;
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    return Math.abs(localX) <= halfWidth && Math.abs(localZ) <= halfLength;
  };
}

/** Envuelve una lista de zonas seguras en el objeto que espera FlightEngine. */
function makeTerrain(mapRadius, safeZones) {
  return {
    mapRadius,
    safeZones,
    isSafeZone(x, z) {
      return this.safeZones.some((fn) => fn(x, z));
    },
  };
}

export class SceneManager {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {string|null} scenarioId Id de SCENARIOS; null/desconocido = azar.
   */
  constructor(canvas, scenarioId = null) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    const horizon = new THREE.Color(SKY_HORIZON);
    this.scene.background = horizon;
    this.scene.fog = new THREE.Fog(horizon.getHex(), 450, 2800);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
    this.camera.position.set(0, 5, 20);

    this.aircraft = buildAircraft();
    this.scene.add(this.aircraft);

    this.#buildSky();
    this.#buildLights();

    /** @type {{mapRadius:number, safeZones:Array<Function>, isSafeZone:Function}|null} */
    this.terrain = null;
    this.scenario = null;
    this.#buildWorld(scenarioId);
  }

  /** Terreno del escenario actual — pásaselo a flightEngine.setTerrain(). */
  getTerrain() {
    return this.terrain;
  }

  #buildSky() {
    // Cúpula con degradado vertical (horizonte claro → cénit azul intenso).
    const geo = new THREE.SphereGeometry(2900, 24, 16);
    const top = new THREE.Color(SKY_TOP);
    const bottom = new THREE.Color(SKY_HORIZON);
    const pos = geo.attributes.position;
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = THREE.MathUtils.clamp((y / 2900 + 0.12) / 1.12, 0, 1);
      const c = bottom.clone().lerp(top, t);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
    });
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  #buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xdff2f8, 0x4c6b3a, 1.0));
    const sun = new THREE.DirectionalLight(0xfff3d6, 1.5);
    sun.position.set(250, 420, 120);
    this.scene.add(sun);
  }

  /** Océano presente en TODOS los escenarios: es lo que hace de límite del
   *  mapa (fuera de las zonas seguras, tocar el suelo es tocar agua). */
  #buildOcean() {
    const ocean = new THREE.Mesh(
      new THREE.CircleGeometry(OCEAN_RADIUS, 64),
      new THREE.MeshPhongMaterial({ color: 0x1f7fa8, shininess: 55, specular: 0xbfe9ff })
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -3;
    this.scene.add(ocean);
  }

  /** Construye el escenario pedido (o uno al azar) sobre el océano base. */
  #buildWorld(scenarioId) {
    this.#buildOcean();

    const scenario = SCENARIOS.includes(scenarioId)
      ? scenarioId
      : SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    this.scenario = scenario;

    switch (scenario) {
      case "mountain":
        this.terrain = this.#buildMountainPass();
        break;
      case "coastal":
        this.terrain = this.#buildCoastalIsland();
        break;
      case "platform":
        this.terrain = this.#buildSeaPlatform();
        break;
      default:
        this.terrain = this.#buildDesertAerodrome();
    }
  }

  /**
   * Dibuja una pista (superficie + líneas discontinuas + marcas de umbral)
   * centrada en (x, z) con orientación rotationY, y devuelve un test de
   * "punto dentro de la pista" con margen de tolerancia (aterrizar no debe
   * exigir precisión milimétrica salvo que se reduzca el margen a propósito,
   * como en la plataforma marina).
   */
  #buildRunway({
    x = 0,
    z = 0,
    length = 900,
    width = 20,
    rotationY = 0,
    color = 0x33363c,
    marginLength = 30,
    marginWidth = 14,
  }) {
    const group = new THREE.Group();

    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(width, length),
      new THREE.MeshLambertMaterial({ color })
    );
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.05;
    group.add(surface);

    const dashMaterial = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
    const dashGeometry = new THREE.PlaneGeometry(0.8, 8);
    for (let d = -length / 2 + 25; d < length / 2 - 25; d += 30) {
      const dash = new THREE.Mesh(dashGeometry, dashMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.08, d);
      group.add(dash);
    }

    const thresholdGeometry = new THREE.PlaneGeometry(0.9, 10);
    for (let tx = -width / 2 + 1.5; tx <= width / 2 - 1.5; tx += 2.2) {
      const th = new THREE.Mesh(thresholdGeometry, dashMaterial);
      th.rotation.x = -Math.PI / 2;
      th.position.set(tx, 0.08, -length / 2 + 15);
      group.add(th);
    }

    group.position.set(x, 0, z);
    group.rotation.y = rotationY;
    this.scene.add(group);

    return makeRectZone(x, z, length / 2 + marginLength, width / 2 + marginWidth, rotationY);
  }

  /** Anillo/arco de conos rocosos: referencia visual de escala, decorativo. */
  #scatterMountains({ startDeg, endDeg, count, distMin, distMax, heightMin, heightMax, colors, snowLine, random }) {
    for (let i = 0; i < count; i++) {
      const angle = THREE.MathUtils.degToRad(startDeg + (i / count) * (endDeg - startDeg));
      const dist = distMin + random() * (distMax - distMin);
      const h = heightMin + random() * (heightMax - heightMin);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(55 + random() * 40, h, 6),
        new THREE.MeshLambertMaterial({ color: colors[i % colors.length] })
      );
      cone.position.set(Math.cos(angle) * dist, h / 2 - 6, Math.sin(angle) * dist);
      cone.rotation.y = random() * Math.PI;
      this.scene.add(cone);
      if (snowLine != null && h > snowLine) {
        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(20, 38, 6),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        cap.position.set(cone.position.x, h - 15, cone.position.z);
        this.scene.add(cap);
      }
    }
  }

  /** Nubes esparcidas por el cielo: referencia de altitud, decorativas. */
  #scatterClouds(count, random) {
    const cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < count; i++) {
      const cloud = new THREE.Group();
      const puffCount = 3 + Math.floor(random() * 2);
      for (let p = 0; p < puffCount; p++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(9 + random() * 9, 8, 8),
          cloudMaterial
        );
        puff.position.set(p * 13 - 16, random() * 4, random() * 8);
        cloud.add(puff);
      }
      cloud.position.set(
        (random() - 0.5) * 2600,
        150 + random() * 200,
        (random() - 0.5) * 2600 - 150
      );
      this.scene.add(cloud);
    }
  }

  /** Hangar + torre de control, reutilizados en los escenarios de aeródromo. */
  #buildAerodromeBuildings({ x, z, hangarColor = 0x8a2f2f, roofColor = 0xc7c9cc, towerColor = 0x345b7a }) {
    const hangarBody = new THREE.Mesh(
      new THREE.BoxGeometry(36, 13, 24),
      new THREE.MeshLambertMaterial({ color: hangarColor })
    );
    hangarBody.position.set(x + 65, 6.5, z - 20);
    this.scene.add(hangarBody);
    const hangarRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 12, 36, 16, 1, false, 0, Math.PI),
      new THREE.MeshLambertMaterial({ color: roofColor })
    );
    hangarRoof.rotation.z = Math.PI / 2;
    hangarRoof.position.set(x + 65, 13, z - 20);
    this.scene.add(hangarRoof);

    const towerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 4, 40, 10),
      new THREE.MeshLambertMaterial({ color: 0x9a8465 })
    );
    towerBase.position.set(x - 55, 20, z - 60);
    this.scene.add(towerBase);
    const towerTop = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 8.5, 6.5, 10),
      new THREE.MeshLambertMaterial({ color: towerColor })
    );
    towerTop.position.set(x - 55, 43, z - 60);
    this.scene.add(towerTop);
  }

  // ------------------------------------------------------------------
  // Escenario 1: aeródromo en isla desértica (el original, recoloreado a
  // tono arena para distinguirlo del paso de montaña).
  // ------------------------------------------------------------------
  #buildDesertAerodrome() {
    const random = makeSeededRandom(Date.now());
    const islandRadius = 950;

    const island = new THREE.Mesh(
      new THREE.CircleGeometry(islandRadius, 48),
      new THREE.MeshLambertMaterial({ color: 0xd6a869 })
    );
    island.rotation.x = -Math.PI / 2;
    this.scene.add(island);

    const zone = this.#buildRunway({ x: 0, z: -430, length: 900, width: 20 });
    this.#buildAerodromeBuildings({ x: 0, z: 0 });

    this.#scatterMountains({
      startDeg: 140,
      endDeg: 206,
      count: 24,
      distMin: 780,
      distMax: 920,
      heightMin: 90,
      heightMax: 260,
      colors: [0xb9925a, 0xc7a06a, 0xd6b482],
      snowLine: null, // en el desierto no nieva
      random,
    });
    this.#scatterClouds(22, random);

    return makeTerrain(islandRadius + 220, [zone]);
  }

  // ------------------------------------------------------------------
  // Escenario 2: pista angosta en un paso de montaña, flanqueada por dos
  // paredes rocosas cercanas — exige un descenso alineado y estable.
  // ------------------------------------------------------------------
  #buildMountainPass() {
    const random = makeSeededRandom(Date.now());
    const islandRadius = 1000;

    const island = new THREE.Mesh(
      new THREE.CircleGeometry(islandRadius, 48),
      new THREE.MeshLambertMaterial({ color: 0x4f7a45 })
    );
    island.rotation.x = -Math.PI / 2;
    this.scene.add(island);

    const zone = this.#buildRunway({ x: 0, z: -380, length: 750, width: 18 });

    const wallColors = [0x8b8b86, 0x9c9990, 0xb8b6ad];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 10; i++) {
        const t = i / 9;
        const z = -20 - t * 760;
        const dist = 150 + random() * 60;
        const h = 220 + random() * 220;
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(50 + random() * 30, h, 6),
          new THREE.MeshLambertMaterial({ color: wallColors[i % wallColors.length] })
        );
        cone.position.set(side * dist, h / 2 - 6, z);
        cone.rotation.y = random() * Math.PI;
        this.scene.add(cone);
        if (h > 300) {
          const cap = new THREE.Mesh(
            new THREE.ConeGeometry(18, 34, 6),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
          );
          cap.position.set(cone.position.x, h - 12, cone.position.z);
          this.scene.add(cap);
        }
      }
    }

    this.#scatterMountains({
      startDeg: 0,
      endDeg: 360,
      count: 48,
      distMin: 820,
      distMax: 960,
      heightMin: 100,
      heightMax: 280,
      colors: wallColors,
      snowLine: 230,
      random,
    });
    this.#scatterClouds(18, random);

    return makeTerrain(islandRadius + 220, [zone]);
  }

  // ------------------------------------------------------------------
  // Escenario 3: isla costera pequeña, pista junto a la playa, con
  // palmeras decorativas y un muelle que se adentra en el agua.
  // ------------------------------------------------------------------
  #buildCoastalIsland() {
    const random = makeSeededRandom(Date.now());
    const islandRadius = 640;

    const island = new THREE.Mesh(
      new THREE.CircleGeometry(islandRadius, 48),
      new THREE.MeshLambertMaterial({ color: 0x6a9a52 })
    );
    island.rotation.x = -Math.PI / 2;
    this.scene.add(island);

    const beach = new THREE.Mesh(
      new THREE.RingGeometry(islandRadius - 60, islandRadius, 48),
      new THREE.MeshLambertMaterial({ color: 0xdfc98a })
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.y = 0.02;
    this.scene.add(beach);

    const zone = this.#buildRunway({
      x: -60,
      z: -260,
      length: 620,
      width: 18,
      rotationY: THREE.MathUtils.degToRad(12),
    });

    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
    const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x2f8f4f });
    for (let i = 0; i < 26; i++) {
      const angle = random() * Math.PI * 2;
      const dist = 120 + random() * (islandRadius - 220);
      const x = Math.cos(angle) * dist + 250;
      const z = Math.sin(angle) * dist;
      if (zone(x, z)) continue; // no sembrar palmeras encima de la pista
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.4, 10, 6), trunkMaterial);
      trunk.position.set(x, 5, z);
      this.scene.add(trunk);
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(4.5, 6, 5), leafMaterial);
      leaves.position.set(x, 10.5, z);
      leaves.scale.set(1, 0.5, 1);
      this.scene.add(leaves);
    }

    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.6, 60),
      new THREE.MeshLambertMaterial({ color: 0x7a5a3a })
    );
    pier.position.set(islandRadius - 20, 0.3, 200);
    this.scene.add(pier);

    this.#scatterMountains({
      startDeg: 200,
      endDeg: 320,
      count: 18,
      distMin: 720,
      distMax: 860,
      heightMin: 70,
      heightMax: 170,
      colors: [0x6d8a63, 0x7d9a73, 0x8dab82],
      snowLine: null,
      random,
    });
    this.#scatterClouds(20, random);

    return makeTerrain(islandRadius + 260, [zone]);
  }

  // ------------------------------------------------------------------
  // Escenario 4: sin isla — plataforma flotante en mar abierto, pista
  // corta. El reto: todo alrededor es agua, cero margen lateral.
  // ------------------------------------------------------------------
  #buildSeaPlatform() {
    const random = makeSeededRandom(Date.now());

    // Margen de aterrizaje reducido a propósito: es la prueba difícil.
    const zone = this.#buildRunway({
      x: 0,
      z: 0,
      length: 230,
      width: 16,
      color: 0x3b4046,
      marginLength: 15,
      marginWidth: 6,
    });

    const deckEdge = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 250),
      new THREE.MeshLambertMaterial({ color: 0x545a60 })
    );
    deckEdge.rotation.x = -Math.PI / 2;
    deckEdge.position.y = 0.02;
    this.scene.add(deckEdge);

    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x3a3f44 });
    for (const cx of [-13, 13]) {
      for (const cz of [-110, 110]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 42, 10), legMaterial);
        leg.position.set(cx, -20, cz);
        this.scene.add(leg);
      }
    }

    // Postes a franjas rojas y blancas en cada cabecera, con baliza —
    // referencia de alineación, como una plataforma real.
    const stripeMaterials = [
      new THREE.MeshLambertMaterial({ color: 0xd23c3c }),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f0 }),
    ];
    const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xffcf4d });
    for (const cz of [-118, 118]) {
      for (const cx of [-9, 9]) {
        const pole = new THREE.Group();
        for (let s = 0; s < 6; s++) {
          const seg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 3.2, 8),
            stripeMaterials[s % 2]
          );
          seg.position.y = s * 3.2;
          pole.add(seg);
        }
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), beaconMaterial);
        beacon.position.y = 6 * 3.2 + 1;
        pole.add(beacon);
        pole.position.set(cx, 0.3, cz);
        this.scene.add(pole);
      }
    }

    this.#scatterClouds(16, random);

    return makeTerrain(620, [zone]);
  }

  /**
   * Sincroniza el avión con la física y persigue con la cámara.
   * @param {{position: THREE.Vector3, quaternion: THREE.Quaternion}} state
   * @param {number} dt
   */
  update(state, dt) {
    this.aircraft.position.copy(state.position);
    this.aircraft.quaternion.copy(state.quaternion);

    // Cámara de persecución con amortiguación exponencial (independiente de FPS)
    _desired.copy(CAMERA_OFFSET).applyQuaternion(state.quaternion).add(state.position);
    _desired.y = Math.max(_desired.y, 1.4); // que no se meta bajo el suelo
    const smoothing = 1 - Math.exp(-4 * dt);
    this.camera.position.lerp(_desired, smoothing);
    _lookAt.copy(state.position);
    this.camera.lookAt(_lookAt);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** Ajusta el tamaño del render al contenedor. */
  resize(width, height) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Libera memoria GPU al desmontar el componente. */
  dispose() {
    this.scene.traverse((object) => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose());
      else object.material?.dispose();
    });
    this.renderer.dispose();
  }
}

/**
 * El avión: reparto tipo jet ejecutivo (fuselaje afilado, alas en flecha
 * con diedro, cola en "T" y motores gemelos en la cola). El morro apunta a
 * −Z, la dirección de vuelo que usa FlightEngine.
 */
function buildAircraft() {
  const group = new THREE.Group();

  const fuselageMaterial = new THREE.MeshPhongMaterial({ color: 0xf2f2f0 });
  const navyMaterial = new THREE.MeshPhongMaterial({ color: 0x1f3557 });
  const silverMaterial = new THREE.MeshPhongMaterial({ color: 0xb9bec4 });
  const glassMaterial = new THREE.MeshPhongMaterial({ color: 0x1c232b });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 3.0, 14),
    fuselageMaterial
  );
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.3, 14), fuselageMaterial);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -2.15;
  group.add(nose);

  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.6, 14), fuselageMaterial);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.z = 2.3;
  group.add(tailCone);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), glassMaterial);
  cockpit.position.set(0, 0.14, -1.85);
  cockpit.scale.set(0.9, 0.6, 1.3);
  group.add(cockpit);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 4.2), navyMaterial);
  stripe.position.set(0, -0.34, 0.3);
  group.add(stripe);

  const wingSpan = 3.2;
  const wingSweep = THREE.MathUtils.degToRad(28);
  const wingDihedral = THREE.MathUtils.degToRad(4);
  const makeWing = (mirror) => {
    const geo = new THREE.BoxGeometry(wingSpan, 0.08, 0.9);
    geo.translate((mirror * wingSpan) / 2, 0, 0);
    const wing = new THREE.Mesh(geo, fuselageMaterial);
    wing.position.set(mirror * 0.36, -0.05, 0.15);
    wing.rotation.y = -mirror * wingSweep;
    wing.rotation.z = mirror * wingDihedral;
    return wing;
  };
  group.add(makeWing(1), makeWing(-1));

  const finHeight = 1.5;
  const finLean = THREE.MathUtils.degToRad(22);
  const finGeo = new THREE.BoxGeometry(0.08, finHeight, 0.9);
  finGeo.translate(0, finHeight / 2, 0);
  const fin = new THREE.Mesh(finGeo, navyMaterial);
  fin.position.set(0, 0.36, 2.15);
  fin.rotation.x = finLean;
  group.add(fin);

  const tailSpan = 1.3;
  const tailSweep = THREE.MathUtils.degToRad(24);
  const makeTailplane = (mirror) => {
    const geo = new THREE.BoxGeometry(tailSpan, 0.06, 0.5);
    geo.translate((mirror * tailSpan) / 2, 0, 0);
    const plane = new THREE.Mesh(geo, navyMaterial);
    plane.position.set(0, finHeight + 0.55, 2.9);
    plane.rotation.y = -mirror * tailSweep;
    return plane;
  };
  group.add(makeTailplane(1), makeTailplane(-1));

  const makeEngine = (mirror) => {
    const nacelle = new THREE.Group();
    const cowling = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 1.05, 12),
      silverMaterial
    );
    cowling.rotation.x = Math.PI / 2;
    nacelle.add(cowling);
    const intake = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.17, 12),
      new THREE.MeshBasicMaterial({ color: 0x0e1116, side: THREE.DoubleSide })
    );
    intake.position.z = -0.53;
    nacelle.add(intake);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.4), silverMaterial);
    pylon.position.set(0, 0.08, 0);
    nacelle.add(pylon);
    nacelle.position.set(mirror * 0.5, 0.05, 1.7);
    return nacelle;
  };
  group.add(makeEngine(1), makeEngine(-1));

  return group;
}
