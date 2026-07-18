/**
 * SceneManager — todo lo relacionado con Three.js vive aquí.
 *
 * Responsabilidades: escena, luces, mundo (pista, terreno, nubes, hitos),
 * el avión-cubo y la cámara de persecución. No sabe nada de física ni de
 * React: recibe el estado del FlightEngine en cada frame y lo dibuja.
 */
import * as THREE from "three";

const SKY_COLOR = 0x87b8dd;
const CAMERA_OFFSET = new THREE.Vector3(0, 3.2, 9.5); // detrás y encima del avión

// Temporales reutilizados por frame
const _desired = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

export class SceneManager {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKY_COLOR);
    this.scene.fog = new THREE.Fog(SKY_COLOR, 400, 2600);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 4000);
    this.camera.position.set(0, 4, 15);

    this.aircraft = buildAircraft();
    this.scene.add(this.aircraft);

    this.#buildLights();
    this.#buildWorld();
  }

  #buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x3e5f36, 1.1));
    const sun = new THREE.DirectionalLight(0xfff3d6, 1.6);
    sun.position.set(200, 400, 100);
    this.scene.add(sun);
  }

  #buildWorld() {
    // Terreno
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8000, 8000),
      new THREE.MeshLambertMaterial({ color: 0x5d8a4e })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(4000, 80, 0x4a7040, 0x4a7040);
    grid.position.y = 0.02;
    this.scene.add(grid);

    // Pista de despegue (a lo largo de −Z, la dirección inicial del avión)
    const runway = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 900),
      new THREE.MeshLambertMaterial({ color: 0x39404a })
    );
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(0, 0.05, -430);
    this.scene.add(runway);

    const dashMaterial = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
    const dashGeometry = new THREE.PlaneGeometry(0.8, 8);
    for (let z = -30; z > -860; z -= 30) {
      const dash = new THREE.Mesh(dashGeometry, dashMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.08, z);
      this.scene.add(dash);
    }

    // Hitos (cajas tipo edificio) para dar sensación de velocidad y escala.
    // Posiciones pseudoaleatorias deterministas — misma ciudad en cada vuelo.
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0x8d99ae });
    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 60; i++) {
      const width = 10 + random() * 25;
      const height = 15 + random() * 90;
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, width),
        buildingMaterial
      );
      const angle = random() * Math.PI * 2;
      const radius = 250 + random() * 1500;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (Math.abs(x) < 40 && z < 0) continue; // despejar la pista
      building.position.set(x, height / 2, z);
      this.scene.add(building);
    }

    // Nubes planas para dar referencia de altitud
    const cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 25; i++) {
      const cloud = new THREE.Mesh(
        new THREE.BoxGeometry(40 + random() * 60, 4, 30 + random() * 40),
        cloudMaterial
      );
      cloud.position.set(
        (random() - 0.5) * 3000,
        160 + random() * 220,
        (random() - 0.5) * 3000
      );
      this.scene.add(cloud);
    }
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
    _desired.y = Math.max(_desired.y, 1.2); // que no se meta bajo el suelo
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
 * El "avión": un cubo-fuselaje con alas y cola primitivas para que la
 * orientación (alabeo/cabeceo) se lea de un vistazo. Todo geometría básica.
 */
function buildAircraft() {
  const group = new THREE.Group();

  const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xe6552e });
  const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });

  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2.6), bodyMaterial);
  group.add(fuselage);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.5), wingMaterial);
  nose.position.z = -1.5; // el morro apunta a −Z (dirección de vuelo)
  group.add(nose);

  const wings = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 1.1), wingMaterial);
  wings.position.z = -0.2;
  group.add(wings);

  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.6), wingMaterial);
  tailplane.position.z = 1.2;
  group.add(tailplane);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.6), bodyMaterial);
  fin.position.set(0, 0.6, 1.2);
  group.add(fin);

  return group;
}
