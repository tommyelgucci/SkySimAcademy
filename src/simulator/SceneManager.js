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
 * `FREE_ROAM_SCENARIO` es un scenarioId especial (no está en SCENARIOS, no
 * tiene chip en el selector): SimulatorView lo pasa cuando la misión es
 * "free-flight", en vez del escenario elegido en el selector, y construye
 * un archipiélago disperso con límite de mapa mucho más grande.
 *
 * Además de dibujar, construye una descripción del terreno (pista(s)
 * seguras + radio del mapa) que expone vía `getTerrain()`, pensada para
 * pasarse tal cual a `flightEngine.setTerrain(...)`. Si nadie hace esa
 * llamada, FlightEngine se comporta exactamente igual que antes: aterrizar
 * suave y nivelado en cualquier sitio es válido.
 *
 * Interfaz pública:
 *   new SceneManager(canvas, scenarioId?, timeOfDay?)
 *   .scene .camera .aircraft .scenario
 *   .setCameraView("external"|"cockpit")  — con transición suave
 *   .cameraView
 *   .update(state, dt)
 *   .render()
 *   .resize(width, height)
 *   .dispose()
 *   .getTerrain()       -> { mapRadius, isSafeZone(x,z) }
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const CAMERA_OFFSET = new THREE.Vector3(0, 3.4, 10); // detrás y encima del avión
/** Posición del "asiento del piloto" relativa al avión (vista de cabina). */
const COCKPIT_OFFSET = new THREE.Vector3(0, 0.45, -0.9);
/**
 * El mar no es un disco gigante sino un parche teselado que se recentra bajo
 * el avión (ver `#buildOcean`). Tamaño y densidad son un compromiso: el borde
 * (3000 m del centro) debe caer siempre más allá de la niebla (fogFar máx.
 * 2800) para que no se vea, y la celda (`SIZE / SEGMENTS` ≈ 62 m) bastante
 * menor que la ola más corta (~300 m) para que la cresta no se vea
 * escalonada. Subir SEGMENTS es lo primero que se nota en el frame rate:
 * el desplazamiento se recalcula por vértice en cada frame.
 */
const OCEAN_PATCH_SIZE = 6000;
const OCEAN_SEGMENTS = 96;
/** Altura base del mar: bajo el nivel de las islas, con sitio para las olas. */
const OCEAN_LEVEL = -5;

/**
 * Escenario especial de "vuelo libre": no es uno de los SCENARIOS elegibles
 * en el selector (no tiene chip propio), lo activa SimulatorView cuando la
 * misión es "free-flight". Construye un archipiélago disperso en vez de un
 * único sitio, con un límite de mapa mucho más generoso — se puede volar
 * sobre mar abierto y toparse con otras pistas por casualidad explorando.
 */
export const FREE_ROAM_SCENARIO = "free-roam";
const FREE_ROAM_MAP_RADIUS = 6000;

/** Ids de escenario disponibles (la UI construye el selector con esto). */
export const SCENARIOS = ["desert", "mountain", "coastal", "platform"];

/** Horas del día disponibles (la UI construye el selector con esto). */
export const TIMES_OF_DAY = ["day", "dusk", "night"];

/**
 * Paleta de iluminación por hora. La cúpula del cielo y la niebla usan los
 * colores directamente; el terreno se oscurece solo porque sus materiales
 * (Lambert/Phong) responden a las luces. Las balizas y luces de pista son
 * MeshBasicMaterial (no responden a la luz), así que "brillan" de noche.
 */
const TIME_PALETTES = {
  day: {
    skyTop: 0x1d6ec4,
    horizon: 0xe8f6fb,
    hemiSky: 0xdff2f8,
    hemiGround: 0x6b8a52,
    hemiIntensity: 1.35,
    sunColor: 0xfff3d6,
    sunIntensity: 2.3,
    sunPos: [250, 420, 120],
    fogFar: 2800,
    stars: 0,
    water: 0x1a6f9c,
    waterDeep: 0x0d3f5e,
    waterSpecular: 0xcdefff,
    waterShininess: 110,
    sunDisc: 0xfff6d8,
    sunDiscSize: 210,
    exposure: 1.45,
  },
  dusk: {
    // El atardecer se va de las manos con facilidad: si el horizonte y la
    // luz hemisférica van los dos muy saturados, el naranja tiñe cada
    // superficie y la escena pierde el color propio. Naranja solo en el
    // cielo y en el sol; la luz ambiente casi neutra.
    skyTop: 0x35377a,
    horizon: 0xf2a878,
    hemiSky: 0xd9bda8,
    hemiGround: 0x4a5340,
    hemiIntensity: 0.95,
    sunColor: 0xffb877,
    sunIntensity: 1.25,
    sunPos: [420, 80, -160],
    fogFar: 2400,
    stars: 130,
    water: 0x27496e,
    waterDeep: 0x142639,
    waterSpecular: 0xffc79a,
    waterShininess: 150,
    sunDisc: 0xff9a52,
    sunDiscSize: 300,
    exposure: 1.25,
  },
  night: {
    skyTop: 0x04070f,
    horizon: 0x101d33,
    hemiSky: 0x24324a,
    hemiGround: 0x0a0f14,
    hemiIntensity: 0.34,
    sunColor: 0x9fb8dd,
    sunIntensity: 0.5,
    sunPos: [-220, 360, 200],
    fogFar: 2000,
    stars: 420,
    water: 0x0c1a2e,
    waterDeep: 0x04080f,
    waterSpecular: 0x7f9fd4,
    waterShininess: 90,
    sunDisc: 0xd8e4ff,
    sunDiscSize: 120,
    exposure: 1.3,
  },
};

// Temporales reutilizados por frame (evitan crear objetos en el loop)
const _desired = new THREE.Vector3();
const _lookAt = new THREE.Vector3();
const _cockpitPos = new THREE.Vector3();
const _cockpitLook = new THREE.Vector3();
const _forwardTmp = new THREE.Vector3();

// Temporales reutilizados al construir InstancedMesh (montañas, palmeras):
// una matriz/vector por escenario, no por instancia.
const _instMatrix = new THREE.Matrix4();
const _instPos = new THREE.Vector3();
const _instQuat = new THREE.Quaternion();
const _instScale = new THREE.Vector3();
const _instColor = new THREE.Color();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _identityQuat = new THREE.Quaternion();
const _leafScale = new THREE.Vector3(1, 0.5, 1);

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

const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Máscara suave de "esto tiene que estar llano": 1 dentro del rectángulo
 * (una pista con su margen) y bajando a 0 a lo largo de `feather` metros
 * alrededor. Sirve para hundir el relieve del terreno justo donde se
 * aterriza, sin que se note un escalón en el borde.
 */
function makeRectFlatness(cx, cz, halfLength, halfWidth, rotationY, feather) {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  return (x, z) => {
    const dx = x - cx;
    const dz = z - cz;
    const localX = Math.abs(dx * cos - dz * sin);
    const localZ = Math.abs(dx * sin + dz * cos);
    // Distancia (positiva fuera) al rectángulo, por el eje que más sobresale
    const outside = Math.max(localX - halfWidth, localZ - halfLength, 0);
    return 1 - smoothstep(0, feather, outside);
  };
}

/**
 * Envuelve las zonas seguras en el objeto que espera FlightEngine, junto con
 * la geometría de las pistas (`runways`) que consume FlightEvaluator para la
 * senda de planeo y la nota de aterrizaje.
 */
function makeTerrain(mapRadius, safeZones, runways = []) {
  return {
    mapRadius,
    safeZones,
    runways,
    isSafeZone(x, z) {
      return this.safeZones.some((fn) => fn(x, z));
    },
  };
}

export class SceneManager {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {string|null} scenarioId Id de SCENARIOS; null/desconocido = azar.
   * @param {string} timeOfDay "day" | "dusk" | "night" (por defecto, día).
   * @param {{shadows?: boolean}} [options] `shadows` activa la sombra
   *   proyectada del avión. Se puede cambiar en vuelo con
   *   `setShadowsEnabled`; lo decide la UI, no esta clase (ver
   *   SimulatorView: por defecto va apagada en dispositivos táctiles).
   */
  constructor(canvas, scenarioId = null, timeOfDay = "day", options = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.timeOfDay = TIMES_OF_DAY.includes(timeOfDay) ? timeOfDay : "day";
    this.palette = TIME_PALETTES[this.timeOfDay];

    // Tone mapping filmico + exposición por hora del día: es lo que separa
    // el "azul plano de WebGL" de una imagen con rango dinámico creíble.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.palette.exposure;
    // Sombra del sol; la cámara de sombras sigue al avión (ver update).
    // PCF simple y no PCFSoft: el filtrado suave multiplica las muestras por
    // píxel receptor y en GPU integrada se nota más que la mejora de calidad.
    this.renderer.shadowMap.enabled = options.shadows !== false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    const horizon = new THREE.Color(this.palette.horizon);
    this.scene.background = horizon;
    this.scene.fog = new THREE.Fog(horizon.getHex(), 450, this.palette.fogFar);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
    this.camera.position.set(0, 5, 20);

    // Cámara: "external" (persecución) o "cockpit"; _viewBlend interpola
    this.cameraView = "external";
    this._viewBlend = 0;
    this._elapsed = 0; // para el estroboscopio del avión
    /** Reloj compartido con el shader del mar (olas animadas en GPU). */
    this._waterTime = { value: 0 };

    this.aircraft = buildAircraft();
    this.aircraft.traverse((part) => {
      // Las luces de navegación y el estroboscopio son MeshBasic: proyectar
      // sombra desde ellas dejaría manchas sueltas bajo el avión.
      if (part.isMesh && !part.material?.isMeshBasicMaterial) part.castShadow = true;
    });
    this.scene.add(this.aircraft);

    this.#buildSky();
    this.#buildStars();
    this.#buildLights();
    this.#buildEnvMap();
    this.#buildContactShadow();
    this.#buildComposer();

    /** @type {{mapRadius:number, safeZones:Array<Function>, isSafeZone:Function}|null} */
    this.terrain = null;
    this.scenario = null;
    // Geometría de cono unitario (radio 1, altura 1) compartida por todas
    // las montañas instanciadas de esta escena: cada instancia consigue su
    // radio/altura propios escalando la matriz, no con geometría nueva (ver
    // #scatterMountains). Vive en la instancia, no a nivel de módulo, para
    // que su dispose() no afecte a otro SceneManager en paralelo.
    this._unitCone = new THREE.ConeGeometry(1, 1, 6);
    this.#buildWorld(scenarioId);
  }

  /** Terreno del escenario actual — pásaselo a flightEngine.setTerrain(). */
  getTerrain() {
    return this.terrain;
  }

  /** Cambia la vista con transición suave (interpolada en update). */
  setCameraView(view) {
    if (view === "external" || view === "cockpit") this.cameraView = view;
  }

  /**
   * Enciende o apaga las sombras proyectadas en pleno vuelo, sin reconstruir
   * la escena (y por tanto sin reiniciar el vuelo en curso). Three compila el
   * soporte de sombras dentro de cada shader, así que al cambiar el flag hay
   * que marcar los materiales para recompilar.
   */
  setShadowsEnabled(enabled) {
    if (this.renderer.shadowMap.enabled === enabled) return;
    this.renderer.shadowMap.enabled = enabled;
    this.scene.traverse((object) => {
      const material = object.material;
      if (!material) return;
      if (Array.isArray(material)) material.forEach((m) => (m.needsUpdate = true));
      else material.needsUpdate = true;
    });
  }

  /**
   * Pipeline de post-procesado: RenderPass normal + bloom selectivo (solo lo
   * que ya es muy brillante después del tone-mapping — disco solar, balizas
   * y luces de pista de noche — pasa el umbral) + OutputPass (aplica
   * tone-mapping/espacio de color al resultado final del composer, que si
   * no se pierde al pasar por el bloom). Umbral/fuerza ajustados a ojo para
   * que el cielo y el mar en pleno sol NO exploten en blanco.
   */
  #buildComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.4, 0.86);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  /**
   * Mapa de entorno procedural (sin HDRI externo) para los reflejos del
   * fuselaje: una cúpula de cielo en miniatura, renderizada aparte (nunca la
   * escena real, que ya tiene el propio avión dentro) y convertida a
   * irradiance map con PMREMGenerator. Se aplica a los materiales del avión
   * que sean MeshStandardMaterial — las luces (MeshBasic) no reciben nada.
   */
  #buildEnvMap() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);

    const envScene = new THREE.Scene();
    const geo = new THREE.SphereGeometry(1, 16, 12);
    const top = new THREE.Color(this.palette.skyTop);
    const bottom = new THREE.Color(this.palette.hemiGround);
    const pos = geo.attributes.position;
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
      const t = THREE.MathUtils.clamp(pos.getY(i) / 2 + 0.5, 0, 1);
      const c = bottom.clone().lerp(top, t);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
    envScene.add(new THREE.Mesh(geo, mat));

    const target = pmrem.fromScene(envScene, 0.04);
    this.envMap = target.texture;
    this.aircraft.traverse((part) => {
      if (part.isMesh && part.material?.isMeshStandardMaterial) {
        part.material.envMap = this.envMap;
        part.material.needsUpdate = true;
      }
    });

    pmrem.dispose();
    geo.dispose();
    mat.dispose();
  }

  /**
   * Blob de sombra suave (radial gradient en canvas, sin assets) que sigue
   * al avión en X/Z y se desvanece con la altitud. Dos motivos para que
   * exista además de la sombra proyectada real: el mar NUNCA recibe sombra
   * (`ocean.receiveShadow = false`, ver #buildOcean) y en móvil las sombras
   * proyectadas arrancan apagadas — sin esto, volar bajo sobre agua o con
   * sombras desactivadas pierde toda referencia de altura.
   */
  #buildContactShadow() {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(0,0,0,0.55)");
    gradient.addColorStop(0.7, "rgba(0,0,0,0.22)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const material = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 1;
    this.scene.add(mesh);
    this.contactShadow = mesh;
  }

  #buildSky() {
    // Cúpula con degradado vertical (horizonte claro → cénit oscuro).
    const geo = new THREE.SphereGeometry(2900, 24, 16);
    const top = new THREE.Color(this.palette.skyTop);
    const bottom = new THREE.Color(this.palette.horizon);
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
    this.#buildSunDisc();
  }

  /**
   * Disco solar con halo: un sprite con degradado radial pintado en canvas
   * (sin imágenes externas, misma política que el resto). Da un punto de
   * referencia real en el cielo y hace que el brillo del mar tenga origen.
   */
  #buildSunDisc() {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const color = new THREE.Color(this.palette.sunDisc);
    const rgb = `${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, `rgba(${rgb}, 1)`);
    gradient.addColorStop(0.16, `rgba(${rgb}, 0.95)`);
    gradient.addColorStop(0.38, `rgba(${rgb}, 0.28)`);
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    // Colocado en la dirección de la luz direccional, justo dentro de la cúpula
    const dir = new THREE.Vector3(...this.palette.sunPos).normalize();
    sprite.position.copy(dir).multiplyScalar(2750);
    sprite.scale.setScalar(this.palette.sunDiscSize * 4);
    this.scene.add(sprite);
  }

  /** Estrellas (solo atardecer/noche): puntos sobre la cúpula, sin assets. */
  #buildStars() {
    if (!this.palette.stars) return;
    const random = makeSeededRandom(9091);
    const positions = new Float32Array(this.palette.stars * 3);
    for (let i = 0; i < this.palette.stars; i++) {
      // Punto aleatorio en el hemisferio superior, justo bajo la cúpula
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(0.05 + random() * 0.9);
      const r = 2800;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xeef3ff,
      size: 2.2,
      sizeAttenuation: false,
      fog: false,
    });
    this.scene.add(new THREE.Points(geo, mat));
  }

  #buildLights() {
    const p = this.palette;
    this.scene.add(new THREE.HemisphereLight(p.hemiSky, p.hemiGround, p.hemiIntensity));

    const sun = new THREE.DirectionalLight(p.sunColor, p.sunIntensity);
    sun.position.set(...p.sunPos);
    // La sombra del avión sobre la pista es lo que más "vende" la escala y la
    // altura real. Un mapa de sombras global sobre kilómetros sería inútil de
    // grueso, así que la cámara de sombras es pequeña y sigue al avión
    // (`#updateSunShadow`), que es donde de verdad se mira.
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 1400;
    sun.shadow.camera.left = -110;
    sun.shadow.camera.right = 110;
    sun.shadow.camera.top = 110;
    sun.shadow.camera.bottom = -110;
    sun.shadow.bias = -0.0012;
    sun.shadow.normalBias = 0.6;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;
    /** Dirección normalizada del sol, reutilizada al mover la sombra. */
    this._sunDir = new THREE.Vector3(...p.sunPos).normalize();
  }

  /** Centra el volumen de sombras sobre el avión (ver `#buildLights`). */
  #updateSunShadow(position) {
    if (!this.sun) return;
    this.sun.target.position.set(position.x, 0, position.z);
    this.sun.target.updateMatrixWorld();
    this.sun.position.copy(this._sunDir).multiplyScalar(700).add(this.sun.target.position);
  }

  /**
   * Océano presente en TODOS los escenarios: es lo que hace de límite del
   * mapa (fuera de las zonas seguras, tocar el suelo es tocar agua).
   *
   * Las olas se calculan en el VERTEX SHADER (coste de CPU cero) a partir de
   * la posición en MUNDO, no en el modelo. Eso permite el truco de abajo: la
   * malla es solo un parche que se recentra bajo el avión en cada frame
   * (`update`), y como el patrón está anclado al mundo, no "se arrastra" con
   * él — se ve un mar infinito y con detalle a cualquier distancia, sin
   * teselar kilómetros de geometría. El borde del parche cae siempre más
   * lejos que la niebla, así que nunca se ve.
   */
  #buildOcean() {
    const p = this.palette;
    const geometry = new THREE.PlaneGeometry(
      OCEAN_PATCH_SIZE,
      OCEAN_PATCH_SIZE,
      OCEAN_SEGMENTS,
      OCEAN_SEGMENTS,
    );
    const material = new THREE.MeshPhongMaterial({
      color: p.water,
      specular: p.waterSpecular,
      shininess: p.waterShininess,
    });

    const time = this._waterTime;
    const deep = { value: new THREE.Color(p.waterDeep) };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.uniforms.uDeep = deep;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform float uTime;
           varying float vWave;
           // Suma de senoides cruzadas: barato y sin textura, pero con
           // suficiente interferencia como para no verse un patrón repetido.
           // Tres senoides cruzadas: el mínimo para que no se lea un patrón
           // repetido. Se calcula por vértice en cada frame, así que cada
           // término extra se paga en toda la malla — se quedan tres.
           float oceanWave(vec2 q) {
             return sin(q.x * 0.021 + uTime * 0.90) * 1.15
                  + sin(q.y * 0.017 - uTime * 0.70) * 1.35
                  + sin((q.x + q.y) * 0.009 + uTime * 0.45) * 1.80;
           }
           // Derivadas analíticas de oceanWave: sin esto la iluminación
           // quedaría plana y el mar no reflejaría el sol al ondular.
           vec2 oceanSlope(vec2 q) {
             float shared = cos((q.x + q.y) * 0.009 + uTime * 0.45) * 1.80 * 0.009;
             return vec2(
               cos(q.x * 0.021 + uTime * 0.90) * 1.15 * 0.021 + shared,
               cos(q.y * 0.017 - uTime * 0.70) * 1.35 * 0.017 + shared
             );
           }`,
        )
        .replace(
          "#include <beginnormal_vertex>",
          `#include <beginnormal_vertex>
           vec2 wWorld = (modelMatrix * vec4(position, 1.0)).xz;
           vec2 wSlope = oceanSlope(wWorld);
           objectNormal = normalize(vec3(-wSlope.x, wSlope.y, 1.0));`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           float wHeight = oceanWave(wWorld);
           transformed.z += wHeight;
           vWave = wHeight;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform vec3 uDeep;
           varying float vWave;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
           // Los senos van más oscuros (agua profunda) y las crestas más
           // claras: da volumen sin necesidad de espuma ni texturas.
           diffuseColor.rgb = mix(uDeep, diffuseColor.rgb, smoothstep(-2.6, 2.6, vWave));`,
        );
    };

    const ocean = new THREE.Mesh(geometry, material);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = OCEAN_LEVEL;
    // Sin receiveShadow a propósito: el mar cubre la pantalla entera, así que
    // activarlo obliga a un muestreo de sombras por píxel visible y hunde el
    // frame rate a la mitad — a cambio de una sombra sobre el agua que
    // apenas se distingue. Las sombras que importan (avión sobre pista) caen
    // sobre terreno y asfalto, que sí la reciben.
    ocean.receiveShadow = false;
    // El parche se recoloca bajo el avión cada frame; sin esto Three lo
    // descartaría del render al alejarse su centro original de la cámara.
    ocean.frustumCulled = false;
    this.scene.add(ocean);
    this.ocean = ocean;
  }

  /** Construye el escenario pedido (o uno al azar) sobre el océano base. */
  #buildWorld(scenarioId) {
    if (scenarioId === FREE_ROAM_SCENARIO) {
      this.scenario = FREE_ROAM_SCENARIO;
      this.#buildOcean();
      this.terrain = this.#buildFreeRoamWorld();
      return;
    }

    this.#buildOcean();

    const scenario = SCENARIOS.includes(scenarioId)
      ? scenarioId
      : SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    this.scenario = scenario;

    switch (scenario) {
      case "mountain": {
        const { zone, runway, standaloneRadius } = this.#buildMountainPass();
        this.terrain = makeTerrain(standaloneRadius, [zone], [runway]);
        break;
      }
      case "coastal": {
        const { zone, runway, standaloneRadius } = this.#buildCoastalIsland();
        this.terrain = makeTerrain(standaloneRadius, [zone], [runway]);
        break;
      }
      case "platform": {
        const { zone, runway, standaloneRadius } = this.#buildSeaPlatform();
        this.terrain = makeTerrain(standaloneRadius, [zone], [runway]);
        break;
      }
      default: {
        const { zone, runway, standaloneRadius } = this.#buildDesertAerodrome();
        this.terrain = makeTerrain(standaloneRadius, [zone], [runway]);
      }
    }
  }

  /**
   * Escenario especial de vuelo libre: un archipiélago disperso en mar
   * abierto en vez de un único sitio. La base de salida (aeródromo
   * desértico) queda en el origen —donde arranca FlightEngine— y las otras
   * tres pistas aparecen a varios kilómetros, en direcciones distintas, para
   * encontrarlas explorando en vuelo recto en vez de tenerlas ya a la vista.
   * El límite del mapa es mucho más amplio que en los escenarios normales:
   * se puede volar largo rato sobre mar abierto antes de "perderse" de
   * verdad.
   */
  #buildFreeRoamWorld() {
    const sites = [
      this.#buildDesertAerodrome(0, 0),
      this.#buildCoastalIsland(2600, -2200),
      this.#buildMountainPass(-2800, -1200),
      this.#buildSeaPlatform(1400, 3000),
    ];
    return makeTerrain(
      FREE_ROAM_MAP_RADIUS,
      sites.map((site) => site.zone),
      sites.map((site) => site.runway),
    );
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
    apron: withApron = true,
  }) {
    const group = new THREE.Group();

    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(width, length),
      new THREE.MeshLambertMaterial({ color }),
    );
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.05;
    // Recibe la sombra del avión: es la referencia visual de altura más útil
    // que hay en una aproximación.
    surface.receiveShadow = true;
    group.add(surface);

    // Explanada alrededor de la pista, para que no nazca de la nada sobre el
    // terreno: un rectángulo algo más ancho y con tono intermedio. No aplica
    // a la plataforma marina, donde la pista ES la cubierta y no hay tierra
    // alrededor que allanar.
    if (withApron) {
      const apron = new THREE.Mesh(
        new THREE.PlaneGeometry(width + 30, length + 70),
        new THREE.MeshLambertMaterial({ color: 0xa39781 }),
      );
      apron.rotation.x = -Math.PI / 2;
      apron.position.y = 0.01;
      apron.receiveShadow = true;
      group.add(apron);
    }

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

    // Luces de pista (MeshBasic: brillan de noche). Bordes blancos-cálidos,
    // umbral verde en una cabecera y rojo en la otra, como una pista real.
    //
    // Radio pequeño a propósito: el avión aparece justo sobre una de las
    // cabeceras, así que sus luces de umbral quedan a unos metros de la
    // cámara. Con esferas grandes se leen como cúpulas de plástico delante
    // del morro en vez de como puntos de luz.
    const lightGeometry = new THREE.SphereGeometry(0.32, 6, 6);
    const edgeLightMaterial = new THREE.MeshBasicMaterial({ color: 0xfff0b8 });
    for (let d = -length / 2; d <= length / 2; d += 45) {
      for (const side of [-1, 1]) {
        const bulb = new THREE.Mesh(lightGeometry, edgeLightMaterial);
        bulb.position.set(side * (width / 2 + 1.6), 0.3, d);
        group.add(bulb);
      }
    }
    const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x39d353 });
    const redMaterial = new THREE.MeshBasicMaterial({ color: 0xff4d4d });
    for (let tx = -width / 2; tx <= width / 2; tx += width / 3) {
      const green = new THREE.Mesh(lightGeometry, greenMaterial);
      green.position.set(tx, 0.3, length / 2 + 3);
      group.add(green);
      const red = new THREE.Mesh(lightGeometry, redMaterial);
      red.position.set(tx, 0.3, -length / 2 - 3);
      group.add(red);
    }

    group.position.set(x, 0, z);
    group.rotation.y = rotationY;
    this.scene.add(group);

    return {
      zone: makeRectZone(x, z, length / 2 + marginLength, width / 2 + marginWidth, rotationY),
      runway: { x, z, length, width, rotationY },
    };
  }

  /**
   * Isla con relieve real, en lugar de un disco plano.
   *
   * Se teselan anillos concéntricos (`RingGeometry`, que sí tiene divisiones
   * radiales, al revés que `CircleGeometry`) y se desplaza cada vértice en
   * altura con una suma de senoides deterministas. Dos reglas mandan sobre el
   * relieve:
   *   1. Donde se aterriza tiene que estar LLANO — `flatness` hunde el
   *      relieve a cero sobre la pista y lo reintroduce suavemente alrededor,
   *      así que el suelo plano que asume FlightEngine sigue siendo cierto
   *      donde importa.
   *   2. El borde baja bajo el nivel del mar, de modo que la costa la dibuja
   *      el propio corte con el agua (playa) y no un anillo pegado encima.
   *
   * El color va por vértice (arena en la orilla, tierra adentro, roca en las
   * cotas altas): da variedad sin una sola textura ni asset externo.
   *
   * @returns {(x:number, z:number) => number} altura del terreno en mundo,
   *   para posar encima props (palmeras, edificios) sin que floten.
   */
  #buildIsland({
    offsetX = 0,
    offsetZ = 0,
    radius,
    inland,
    shore,
    rock = null,
    amplitude = 14,
    flatness = null,
    random,
  }) {
    const RINGS = 44;
    const SEGMENTS = 108;
    const phase1 = random() * Math.PI * 2;
    const phase2 = random() * Math.PI * 2;
    const phase3 = random() * Math.PI * 2;

    /** Altura del terreno en coordenadas de MUNDO. */
    const heightAt = (x, z) => {
      const lx = x - offsetX;
      const lz = z - offsetZ;
      const t = Math.min(1, Math.hypot(lx, lz) / radius);
      let h =
        Math.sin(lx * 0.0042 + phase1) * Math.cos(lz * 0.0071 + phase2) * amplitude +
        Math.sin((lx + lz) * 0.0113 + phase3) * amplitude * 0.4;
      h *= 1 - t * t; // el relieve se apaga hacia la costa
      h -= smoothstep(0.82, 1, t) * (amplitude + 18); // playa que entra al agua
      if (flatness) h *= 1 - flatness(x, z);
      return h;
    };

    const geometry = new THREE.RingGeometry(radius * 0.015, radius, SEGMENTS, RINGS);
    const position = geometry.attributes.position;
    const inlandColor = new THREE.Color(inland);
    const shoreColor = new THREE.Color(shore);
    const rockColor = rock != null ? new THREE.Color(rock) : null;
    const colors = new Float32Array(position.count * 3);
    const vertexColor = new THREE.Color();

    for (let i = 0; i < position.count; i++) {
      // El anillo vive en el plano XY y se tumba con rotation.x = -PI/2, que
      // manda (lx, ly, lz) local a (lx, lz, -ly) en mundo.
      const lx = position.getX(i);
      const ly = position.getY(i);
      const worldX = offsetX + lx;
      const worldZ = offsetZ - ly;
      const height = heightAt(worldX, worldZ);
      position.setZ(i, height);

      const t = Math.min(1, Math.hypot(lx, ly) / radius);
      // Arena en la franja de costa, tierra adentro en el interior…
      vertexColor.copy(shoreColor).lerp(inlandColor, smoothstep(0.62, 0.82, 1 - t));
      // …y roca asomando en las cotas altas, si el escenario la usa.
      if (rockColor) {
        vertexColor.lerp(rockColor, smoothstep(amplitude * 0.35, amplitude * 0.9, height));
      }
      colors[i * 3] = vertexColor.r;
      colors[i * 3 + 1] = vertexColor.g;
      colors[i * 3 + 2] = vertexColor.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    // Grano procedural (dos octavas de value-noise en coordenadas de mundo,
    // igual de barato que las olas del mar): sin esto el color por vértice
    // se ve perfectamente liso a poca altura. Sin textura ni asset externo.
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\nvarying vec2 vGrainXZ;`)
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>\nvGrainXZ = (modelMatrix * vec4(position, 1.0)).xz;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           varying vec2 vGrainXZ;
           float grainHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
           float grainNoise(vec2 p) {
             vec2 i = floor(p);
             vec2 f = fract(p);
             float a = grainHash(i);
             float b = grainHash(i + vec2(1.0, 0.0));
             float c = grainHash(i + vec2(0.0, 1.0));
             float d = grainHash(i + vec2(1.0, 1.0));
             vec2 u = f * f * (3.0 - 2.0 * f);
             return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
           }`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
           float grain = grainNoise(vGrainXZ * 0.4) * 0.65 + grainNoise(vGrainXZ * 1.9) * 0.35;
           diffuseColor.rgb *= 0.88 + 0.22 * grain;`,
        );
    };

    const island = new THREE.Mesh(geometry, material);
    island.rotation.x = -Math.PI / 2;
    island.position.set(offsetX, 0, offsetZ);
    island.receiveShadow = true;
    this.scene.add(island);

    return heightAt;
  }

  /**
   * Anillo/arco de conos rocosos: referencia visual de escala, decorativo.
   *
   * Instanciado (InstancedMesh sobre `this._unitCone`, radio/altura por
   * matriz de instancia) en vez de una malla nueva por cono: mismo aspecto,
   * una sola draw call para hasta 48 conos por escenario en vez de 48.
   */
  #scatterMountains({
    startDeg,
    endDeg,
    count,
    distMin,
    distMax,
    heightMin,
    heightMax,
    colors,
    snowLine,
    random,
    offsetX = 0,
    offsetZ = 0,
    groundAt = null,
  }) {
    if (count === 0) return;
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const cones = new THREE.InstancedMesh(this._unitCone, material, count);
    // Sin castShadow a propósito: son el anillo lejano (>700 m) y el
    // volumen de sombras solo cubre ±160 m alrededor del avión, así que
    // pagarían el paso de sombras sin aportar un solo píxel.
    cones.receiveShadow = true;

    const snowCapSpots = [];
    for (let i = 0; i < count; i++) {
      const angle = THREE.MathUtils.degToRad(startDeg + (i / count) * (endDeg - startDeg));
      const dist = distMin + random() * (distMax - distMin);
      const h = heightMin + random() * (heightMax - heightMin);
      const radius = 55 + random() * 40;
      const cx = offsetX + Math.cos(angle) * dist;
      const cz = offsetZ + Math.sin(angle) * dist;
      // Con relieve, la base se hunde hasta donde esté el terreno: así no
      // quedan conos flotando sobre la playa o el agua.
      const base = groundAt ? Math.min(0, groundAt(cx, cz)) : 0;
      const cy = base + h / 2 - 6;
      _instPos.set(cx, cy, cz);
      _instQuat.setFromAxisAngle(_upAxis, random() * Math.PI);
      _instScale.set(radius, h, radius);
      _instMatrix.compose(_instPos, _instQuat, _instScale);
      cones.setMatrixAt(i, _instMatrix);
      _instColor.set(colors[i % colors.length]);
      cones.setColorAt(i, _instColor);
      if (snowLine != null && h > snowLine) snowCapSpots.push({ x: cx, y: cy + h / 2 - 15, z: cz });
    }
    cones.instanceMatrix.needsUpdate = true;
    if (cones.instanceColor) cones.instanceColor.needsUpdate = true;
    this.scene.add(cones);

    if (snowCapSpots.length) {
      const capMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const caps = new THREE.InstancedMesh(
        new THREE.ConeGeometry(20, 38, 6),
        capMaterial,
        snowCapSpots.length,
      );
      snowCapSpots.forEach((spot, i) => {
        _instMatrix.makeTranslation(spot.x, spot.y, spot.z);
        caps.setMatrixAt(i, _instMatrix);
      });
      caps.instanceMatrix.needsUpdate = true;
      this.scene.add(caps);
    }
  }

  /**
   * Nubes esparcidas por el cielo: referencia de altitud, decorativas.
   *
   * Cúmulos de esferas a dos alturas (una capa baja densa y otra alta y
   * dispersa) con tamaño y opacidad variables. Se tiñen con el color del
   * horizonte de la paleta para que al atardecer no queden blancas y planas
   * sobre un cielo naranja.
   */
  #scatterClouds(count, random) {
    const tint = new THREE.Color(0xffffff).lerp(new THREE.Color(this.palette.horizon), 0.45);
    // Top/bottom de cada cúmulo, no un gris parejo: los puffs de arriba
    // (los que de verdad mira el sol) van más claros y algo más cálidos,
    // los de abajo más oscuros y algo más fríos — falso rebote de luz, el
    // mismo tipo de truco barato que ya usa el mar (sin textura ni asset).
    const topTint = tint.clone().lerp(new THREE.Color(0xffffff), 0.4);
    const bottomTint = tint.clone().lerp(new THREE.Color(this.palette.hemiGround), 0.22);
    const geometryCache = new Map();
    const puffGeometry = (radius) => {
      const key = Math.round(radius * 4);
      let geo = geometryCache.get(key);
      if (!geo) {
        geo = new THREE.SphereGeometry(radius, 9, 7);
        geometryCache.set(key, geo);
      }
      return geo;
    };
    for (let i = 0; i < count; i++) {
      const cloud = new THREE.Group();
      const high = random() > 0.62; // capa alta: más grande y más tenue
      const puffCount = 5 + Math.floor(random() * 5);
      const scale = high ? 2.6 + random() * 1.6 : 1 + random() * 0.9;
      for (let p = 0; p < puffCount; p++) {
        const puffY = (random() - 0.5) * 9;
        const puffMaterial = new THREE.MeshLambertMaterial({
          color: bottomTint.clone().lerp(topTint, THREE.MathUtils.clamp(puffY / 4.5 + 0.5, 0, 1)),
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        });
        const puff = new THREE.Mesh(puffGeometry(10 + random() * 12), puffMaterial);
        // Se agrupan en horizontal y se aplastan: un cúmulo real es mucho
        // más ancho que alto.
        puff.position.set((p - puffCount / 2) * (11 + random() * 9), puffY, (random() - 0.5) * 22);
        puff.scale.set(1, 0.62 + random() * 0.22, 1);
        cloud.add(puff);
      }
      cloud.scale.setScalar(scale);
      cloud.position.set(
        (random() - 0.5) * 3400,
        (high ? 430 : 165) + random() * 190,
        (random() - 0.5) * 3400 - 150,
      );
      cloud.rotation.y = random() * Math.PI;
      this.scene.add(cloud);
    }
  }

  /** Hangar + torre de control, reutilizados en los escenarios de aeródromo. */
  #buildAerodromeBuildings({
    x,
    z,
    hangarColor = 0x8a2f2f,
    roofColor = 0xc7c9cc,
    towerColor = 0x345b7a,
    groundAt = null,
  }) {
    const hangarGround = groundAt ? groundAt(x + 65, z - 20) : 0;
    const hangarBody = new THREE.Mesh(
      new THREE.BoxGeometry(36, 13, 24),
      new THREE.MeshLambertMaterial({ color: hangarColor }),
    );
    hangarBody.position.set(x + 65, hangarGround + 6.5, z - 20);
    hangarBody.castShadow = true;
    hangarBody.receiveShadow = true;
    this.scene.add(hangarBody);
    const hangarRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 12, 36, 16, 1, false, 0, Math.PI),
      new THREE.MeshLambertMaterial({ color: roofColor }),
    );
    hangarRoof.rotation.z = Math.PI / 2;
    hangarRoof.position.set(x + 65, hangarGround + 13, z - 20);
    hangarRoof.castShadow = true;
    this.scene.add(hangarRoof);

    const towerGround = groundAt ? groundAt(x - 55, z - 60) : 0;
    const towerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 4, 40, 10),
      new THREE.MeshLambertMaterial({ color: 0x9a8465 }),
    );
    towerBase.position.set(x - 55, towerGround + 20, z - 60);
    towerBase.castShadow = true;
    this.scene.add(towerBase);
    const towerTop = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 8.5, 6.5, 10),
      new THREE.MeshLambertMaterial({ color: towerColor }),
    );
    towerTop.position.set(x - 55, towerGround + 43, z - 60);
    towerTop.castShadow = true;
    this.scene.add(towerTop);
  }

  // ------------------------------------------------------------------
  // Escenario 1: aeródromo en isla desértica (el original, recoloreado a
  // tono arena para distinguirlo del paso de montaña).
  // ------------------------------------------------------------------
  #buildDesertAerodrome(offsetX = 0, offsetZ = 0) {
    const random = makeSeededRandom(Date.now());
    const islandRadius = 950;

    const groundAt = this.#buildIsland({
      offsetX,
      offsetZ,
      radius: islandRadius,
      inland: 0xc9975a,
      shore: 0xe8d4a0,
      rock: 0xa87c4c,
      amplitude: 18,
      flatness: makeRectFlatness(offsetX, offsetZ - 430, 520, 130, 0, 260),
      random,
    });

    const { zone, runway } = this.#buildRunway({
      x: offsetX,
      z: offsetZ - 430,
      length: 900,
      width: 20,
    });
    this.#buildAerodromeBuildings({ x: offsetX, z: offsetZ, groundAt });

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
      offsetX,
      offsetZ,
      groundAt,
    });
    this.#scatterClouds(22, random);

    return { zone, runway, standaloneRadius: islandRadius + 220 };
  }

  // ------------------------------------------------------------------
  // Escenario 2: pista angosta en un paso de montaña, flanqueada por dos
  // paredes rocosas cercanas — exige un descenso alineado y estable.
  // ------------------------------------------------------------------
  #buildMountainPass(offsetX = 0, offsetZ = 0) {
    const random = makeSeededRandom(Date.now());
    const islandRadius = 1000;

    const groundAt = this.#buildIsland({
      offsetX,
      offsetZ,
      radius: islandRadius,
      inland: 0x4f7a45,
      shore: 0x9aa46a,
      rock: 0x8d8b80,
      amplitude: 22,
      flatness: makeRectFlatness(offsetX, offsetZ - 380, 450, 120, 0, 240),
      random,
    });

    const { zone, runway } = this.#buildRunway({
      x: offsetX,
      z: offsetZ - 380,
      length: 750,
      width: 18,
    });

    const wallColors = [0x8b8b86, 0x9c9990, 0xb8b6ad];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 10; i++) {
        const t = i / 9;
        const z = -20 - t * 760;
        const dist = 150 + random() * 60;
        const h = 220 + random() * 220;
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(50 + random() * 30, h, 6),
          new THREE.MeshLambertMaterial({ color: wallColors[i % wallColors.length] }),
        );
        const cx = offsetX + side * dist;
        const cz = offsetZ + z;
        cone.position.set(cx, h / 2 - 6 + Math.min(0, groundAt(cx, cz)), cz);
        cone.rotation.y = random() * Math.PI;
        cone.castShadow = true;
        cone.receiveShadow = true;
        this.scene.add(cone);
        if (h > 300) {
          const cap = new THREE.Mesh(
            new THREE.ConeGeometry(18, 34, 6),
            new THREE.MeshBasicMaterial({ color: 0xffffff }),
          );
          cap.position.set(cone.position.x, cone.position.y + h / 2 - 12, cone.position.z);
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
      offsetX,
      offsetZ,
      groundAt,
    });
    this.#scatterClouds(18, random);

    return { zone, runway, standaloneRadius: islandRadius + 220 };
  }

  // ------------------------------------------------------------------
  // Escenario 3: isla costera pequeña, pista junto a la playa, con
  // palmeras decorativas y un muelle que se adentra en el agua.
  // ------------------------------------------------------------------
  #buildCoastalIsland(offsetX = 0, offsetZ = 0) {
    const random = makeSeededRandom(Date.now());
    const islandRadius = 640;

    const groundAt = this.#buildIsland({
      offsetX,
      offsetZ,
      radius: islandRadius,
      inland: 0x6a9a52,
      shore: 0xe4d3a1,
      rock: null, // isla baja: sin roca asomando
      amplitude: 12,
      flatness: makeRectFlatness(
        offsetX - 60,
        offsetZ - 260,
        380,
        110,
        THREE.MathUtils.degToRad(12),
        200,
      ),
      random,
    });

    const { zone, runway } = this.#buildRunway({
      x: offsetX - 60,
      z: offsetZ - 260,
      length: 620,
      width: 18,
      rotationY: THREE.MathUtils.degToRad(12),
    });

    // Posiciones válidas primero (fuera de la pista, fuera de la playa
    // sumergida); tronco y copa van cada uno en su propio InstancedMesh —
    // misma pinta que 52 meshes individuales, dos draw calls en vez de 52.
    const palmSpots = [];
    for (let i = 0; i < 26; i++) {
      const angle = random() * Math.PI * 2;
      const dist = 120 + random() * (islandRadius - 220);
      const x = offsetX + Math.cos(angle) * dist + 250;
      const z = offsetZ + Math.sin(angle) * dist;
      if (zone(x, z)) continue; // no sembrar palmeras encima de la pista
      const base = groundAt(x, z);
      if (base < -1) continue; // ni en la playa sumergida
      palmSpots.push({ x, z, base });
    }
    if (palmSpots.length) {
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
      const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x2f8f4f });
      const trunks = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(1, 1.4, 10, 6),
        trunkMaterial,
        palmSpots.length,
      );
      const leaves = new THREE.InstancedMesh(
        new THREE.SphereGeometry(4.5, 6, 5),
        leafMaterial,
        palmSpots.length,
      );
      trunks.castShadow = true;
      leaves.castShadow = true;
      palmSpots.forEach((spot, i) => {
        _instMatrix.makeTranslation(spot.x, spot.base + 5, spot.z);
        trunks.setMatrixAt(i, _instMatrix);
        _instPos.set(spot.x, spot.base + 10.5, spot.z);
        _instMatrix.compose(_instPos, _identityQuat, _leafScale);
        leaves.setMatrixAt(i, _instMatrix);
      });
      trunks.instanceMatrix.needsUpdate = true;
      leaves.instanceMatrix.needsUpdate = true;
      this.scene.add(trunks, leaves);
    }

    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.6, 60),
      new THREE.MeshLambertMaterial({ color: 0x7a5a3a }),
    );
    pier.position.set(offsetX + islandRadius - 20, 0.3, offsetZ + 200);
    pier.castShadow = true;
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
      offsetX,
      offsetZ,
      groundAt,
    });
    this.#scatterClouds(20, random);

    return { zone, runway, standaloneRadius: islandRadius + 260 };
  }

  // ------------------------------------------------------------------
  // Escenario 4: sin isla — plataforma flotante en mar abierto, pista
  // corta. El reto: todo alrededor es agua, cero margen lateral.
  // ------------------------------------------------------------------
  #buildSeaPlatform(offsetX = 0, offsetZ = 0) {
    const random = makeSeededRandom(Date.now());

    // Margen de aterrizaje reducido a propósito: es la prueba difícil.
    const { zone, runway } = this.#buildRunway({
      x: offsetX,
      z: offsetZ,
      length: 230,
      width: 16,
      color: 0x3b4046,
      marginLength: 15,
      marginWidth: 6,
      apron: false,
    });

    const deckEdge = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 250),
      new THREE.MeshLambertMaterial({ color: 0x545a60 }),
    );
    deckEdge.rotation.x = -Math.PI / 2;
    deckEdge.position.set(offsetX, 0.02, offsetZ);
    this.scene.add(deckEdge);

    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x3a3f44 });
    for (const cx of [-13, 13]) {
      for (const cz of [-110, 110]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 42, 10), legMaterial);
        leg.position.set(offsetX + cx, -20, offsetZ + cz);
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
            stripeMaterials[s % 2],
          );
          seg.position.y = s * 3.2;
          pole.add(seg);
        }
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), beaconMaterial);
        beacon.position.y = 6 * 3.2 + 1;
        pole.add(beacon);
        pole.position.set(offsetX + cx, 0.3, offsetZ + cz);
        this.scene.add(pole);
      }
    }

    this.#scatterClouds(16, random);

    return { zone, runway, standaloneRadius: 620 };
  }

  /**
   * Sincroniza el avión con la física y coloca la cámara según la vista
   * activa, interpolando suavemente entre exterior y cabina.
   * @param {{position: THREE.Vector3, quaternion: THREE.Quaternion}} state
   * @param {number} dt
   */
  update(state, dt) {
    this.aircraft.position.copy(state.position);
    this.aircraft.quaternion.copy(state.quaternion);

    // Mar: avanza el reloj del shader de olas y recentra el parche bajo el
    // avión. El patrón se calcula en coordenadas de mundo, así que mover la
    // malla NO arrastra las olas — solo mantiene geometría donde se ve.
    this._waterTime.value += dt;
    if (this.ocean) {
      this.ocean.position.x = state.position.x;
      this.ocean.position.z = state.position.z;
    }
    this.#updateSunShadow(state.position);

    // Estroboscopio del avión: destello blanco breve una vez por segundo
    this._elapsed += dt;
    const strobe = this.aircraft.userData.strobe;
    if (strobe) strobe.visible = this._elapsed % 1 < 0.08;

    // Transición de vista: 0 = exterior, 1 = cabina
    const targetBlend = this.cameraView === "cockpit" ? 1 : 0;
    this._viewBlend += (targetBlend - this._viewBlend) * Math.min(1, 5 * dt);
    // Dentro de la cabina el fuselaje propio no debe taparlo todo
    this.aircraft.visible = this._viewBlend < 0.7;

    // Posición exterior (persecución) y de cabina (asiento del piloto)
    _desired.copy(CAMERA_OFFSET).applyQuaternion(state.quaternion).add(state.position);
    _desired.y = Math.max(_desired.y, 1.4); // que no se meta bajo el suelo
    _cockpitPos.copy(COCKPIT_OFFSET).applyQuaternion(state.quaternion).add(state.position);
    _forwardTmp.set(0, 0, -1).applyQuaternion(state.quaternion);
    _cockpitLook.copy(_cockpitPos).addScaledVector(_forwardTmp, 120);

    // Mezcla de destino y de punto de mira según la vista
    const blend = this._viewBlend;
    _desired.lerp(_cockpitPos, blend);
    _lookAt.copy(state.position).lerp(_cockpitLook, blend);

    // Amortiguación: suave en exterior, pegada al avión en cabina
    const smoothing = 1 - Math.exp(-(4 + 16 * blend) * dt);
    this.camera.position.lerp(_desired, smoothing);
    this.camera.lookAt(_lookAt);

    // Sombra de contacto: sigue al avión en planta y se desvanece con la
    // altitud (a 50 m ya no aporta nada — a esa altura la sombra proyectada
    // real, si está activa, es la referencia).
    if (this.contactShadow) {
      const altitude = Math.max(0, state.position.y);
      const fade = 1 - smoothstep(0, 50, altitude);
      this.contactShadow.visible = fade > 0.02;
      this.contactShadow.material.opacity = fade;
      this.contactShadow.position.set(state.position.x, 0.12, state.position.z);
      this.contactShadow.scale.setScalar(1 + Math.min(altitude, 50) * 0.05);
    }
  }

  render() {
    this.composer.render();
  }

  /** Ajusta el tamaño del render (y del pipeline de post-procesado) al contenedor. */
  resize(width, height) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(width, height);
  }

  /** Libera memoria GPU al desmontar el componente. */
  dispose() {
    const disposeMaterial = (material) => {
      // El disco solar lleva una CanvasTexture propia; el resto de materiales
      // no tienen mapas, pero comprobarlo es gratis y evita fugas futuras.
      material.map?.dispose();
      material.dispose();
    };
    this.scene.traverse((object) => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
      else if (object.material) disposeMaterial(object.material);
    });
    this.envMap?.dispose();
    this.composer?.dispose();
    this.bloomPass?.dispose();
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

  // MeshStandardMaterial (PBR): SceneManager les asigna un envMap procedural
  // después de construir la escena (#buildEnvMap), así el fuselaje refleja
  // el cielo/mar en vez de verse plano. roughness/metalness aproximan
  // pintura aeronáutica (fuselaje/franja), metal pulido (motores) y vidrio
  // tintado (cabina) sin ninguna textura externa.
  const fuselageMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2f2f0,
    roughness: 0.38,
    metalness: 0.12,
  });
  const navyMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f3557,
    roughness: 0.42,
    metalness: 0.08,
  });
  const silverMaterial = new THREE.MeshStandardMaterial({
    color: 0xb9bec4,
    roughness: 0.25,
    metalness: 0.85,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x0c1116,
    roughness: 0.08,
    metalness: 0.9,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 3.0, 14), fuselageMaterial);
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

  // Luces de navegación reales: roja en punta izquierda, verde en derecha,
  // blanca en cola + estroboscopio (parpadea desde SceneManager.update).
  const navLightGeometry = new THREE.SphereGeometry(0.09, 6, 6);
  const navLeft = new THREE.Mesh(
    navLightGeometry,
    new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
  );
  navLeft.position.set(-3.1, -0.05, 0.9);
  group.add(navLeft);
  const navRight = new THREE.Mesh(
    navLightGeometry,
    new THREE.MeshBasicMaterial({ color: 0x34c759 }),
  );
  navRight.position.set(3.1, -0.05, 0.9);
  group.add(navRight);
  const tailLight = new THREE.Mesh(
    navLightGeometry,
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  tailLight.position.set(0, 0.4, 3.05);
  group.add(tailLight);
  const strobe = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  strobe.position.set(0, finHeight + 0.62, 2.9);
  strobe.visible = false;
  group.add(strobe);
  group.userData.strobe = strobe;

  const makeEngine = (mirror) => {
    const nacelle = new THREE.Group();
    const cowling = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 1.05, 12),
      silverMaterial,
    );
    cowling.rotation.x = Math.PI / 2;
    nacelle.add(cowling);
    const intake = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.17, 12),
      new THREE.MeshBasicMaterial({ color: 0x0e1116, side: THREE.DoubleSide }),
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
