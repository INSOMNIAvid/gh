import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export default class RenderEngine {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.controls = null;
    this.models = {};
    this.init();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(this.renderer.domElement);

    // Освещение
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Загрузчик моделей
    this.loader = new GLTFLoader();
  }

  initControls(domElement) {
    this.controls = new PointerLockControls(this.camera, domElement);
    return this.controls;
  }

  async loadModel(path, name) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          this.models[name] = gltf.scene;
          resolve(gltf.scene);
        },
        undefined,
        (error) => {
          console.error('Error loading model:', error);
          reject(error);
        }
      );
    });
  }

  createPlayerModel(playerData) {
    const model = this.models.player.clone();
    model.position.set(playerData.x, 0, playerData.z);
    model.rotation.y = playerData.rotation;

    // Настройка материала в зависимости от команды
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: playerData.team === 'red' ? 0xff3333 : 0x3333ff,
          roughness: 0.8,
          metalness: 0.2
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    model.userData = { id: playerData.id };
    this.scene.add(model);
    return model;
  }

  createMap(mapSize, obstacles) {
    // Земля
    const groundGeometry = new THREE.PlaneGeometry(mapSize, mapSize);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a5f0b,
      roughness: 0.8,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Препятствия
    obstacles.forEach((obstacle) => {
      const geometry = new THREE.BoxGeometry(obstacle.width, 5, obstacle.height);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.3
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        obstacle.x + obstacle.width / 2,
        2.5,
        obstacle.z + obstacle.height / 2
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'obstacle' };
      this.scene.add(mesh);
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
