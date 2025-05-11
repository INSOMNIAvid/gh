import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import io from 'socket.io-client';
import { MAP_SIZE, PLAYER_SPEED, PLAYER_HEALTH, WEAPONS } from '../shared/constants.js';
import SoundManager from './sound-manager.js';
import UIManager from './ui-manager.js';

class FPSGame {
  constructor() {
    // Инициализация основных компонентов
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initControls();
    this.initNetwork();
    this.initManagers();
    this.initEventListeners();
    
    // Игровое состояние
    this.player = null;
    this.players = {};
    this.bullets = {};
    this.obstacles = [];
    this.doors = [];
    this.weapons = {};
    this.currentWeapon = 'rifle';
    
    // Загрузка ресурсов
    this.loadAssets();
    
    // Запуск игрового цикла
    this.gameLoop();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(this.renderer.domElement);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    
    // Освещение
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.y = 1.6;
  }

  initControls() {
    this.controls = new PointerLockControls(this.camera, document.body);
    
    document.addEventListener('click', () => {
      if (!this.controls.isLocked) {
        this.controls.lock();
      }
    });
    
    this.controls.addEventListener('lock', () => {
      this.uiManager.showCrosshair();
    });
    
    this.controls.addEventListener('unlock', () => {
      this.uiManager.hideCrosshair();
    });
  }

  initNetwork() {
    this.socket = io();
    
    this.socket.on('gameInit', (data) => this.handleGameInit(data));
    this.socket.on('playerJoined', (player) => this.addPlayer(player));
    this.socket.on('playerLeft', (id) => this.removePlayer(id));
    this.socket.on('playerMoved', (data) => this.updatePlayerPosition(data));
    this.socket.on('bulletFired', (bullet) => this.addBullet(bullet));
    this.socket.on('bulletRemoved', (id) => this.removeBullet(id));
    this.socket.on('doorToggled', (data) => this.toggleDoor(data));
    this.socket.on('playerHealthUpdate', (data) => this.updatePlayerHealth(data));
    this.socket.on('playerAmmoUpdate', (data) => this.updatePlayerAmmo(data));
    this.socket.on('playerDied', (data) => this.handlePlayerDeath(data));
    this.socket.on('chatMessage', (data) => this.uiManager.addChatMessage(data));
  }

  initManagers() {
    this.soundManager = new SoundManager();
    this.uiManager = new UIManager(this.socket);
    this.assetLoader = new GLTFLoader();
  }

  initEventListeners() {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    document.addEventListener('mousedown', this.onMouseDown.bind(this));
  }

  loadAssets() {
    // Загрузка моделей
    this.models = {
      player: {},
      weapons: {},
      environment: {}
    };
    
    this.assetLoader.load('assets/models/player.glb', (gltf) => {
      this.models.player = gltf.scene;
    });
    
    this.assetLoader.load('assets/models/rifle.glb', (gltf) => {
      this.models.weapons.rifle = gltf.scene;
      this.models.weapons.rifle.position.set(0.5, -0.5, -1);
      this.models.weapons.rifle.rotation.set(0, Math.PI, 0);
      this.camera.add(this.models.weapons.rifle);
    });
    
    // Загрузка других моделей...
  }

  handleGameInit(data) {
    this.player = data.player;
    this.players = data.players;
    this.obstacles = data.obstacles;
    this.doors = data.doors;
    
    // Установка позиции камеры
    this.camera.position.set(this.player.x, 1.6, this.player.z);
    
    // Создание карты
    this.createMap();
    
    // Создание игроков
    Object.values(this.players).forEach(player => {
      if (player.id !== this.player.id) {
        this.addPlayer(player);
      }
    });
    
    // Обновление интерфейса
    this.uiManager.updateHealth(this.player.health);
    this.uiManager.updateAmmo(this.player.ammo);
    this.uiManager.updateScore(this.player.score);
  }

  createMap() {
    // Земля
    const groundGeometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
    const groundTexture = new THREE.TextureLoader().load('assets/textures/ground.jpg');
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      map: groundTexture,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Препятствия
    this.obstacles.forEach(obstacle => {
      const geometry = new THREE.BoxGeometry(obstacle.width, 5, obstacle.height);
      const texture = new THREE.TextureLoader().load(`assets/textures/${obstacle.type}.jpg`);
      const material = new THREE.MeshStandardMaterial({ map: texture });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(obstacle.x + obstacle.width/2, 2.5, obstacle.z + obstacle.height/2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'obstacle' };
      this.scene.add(mesh);
    });
  }

  addPlayer(playerData) {
    if (this.players[playerData.id]) return;
    
    const playerModel = this.models.player.clone();
    playerModel.position.set(playerData.x, 0, playerData.z);
    playerModel.rotation.y = playerData.rotation;
    
    // Настройка материала в зависимости от команды
    playerModel.traverse(child => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: playerData.team === 'red' ? 0xff3333 : 0x3333ff
        });
      }
    });
    
    playerModel.userData = { id: playerData.id };
    this.scene.add(playerModel);
    this.players[playerData.id] = { ...playerData, model: playerModel };
  }

  updatePlayerPosition(data) {
    const player = this.players[data.id];
    if (player) {
      player.x = data.x;
      player.z = data.z;
      player.rotation = data.rotation;
      player.model.position.set(data.x, 0, data.z);
      player.model.rotation.y = data.rotation;
    }
  }

  addBullet(bullet) {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(bullet.x, 1, bullet.z);
    sphere.userData = { id: bullet.id };
    this.scene.add(sphere);
    this.bullets[bullet.id] = { ...bullet, mesh: sphere };
    
    // Воспроизведение звука выстрела
    if (bullet.owner === this.player.id) {
      this.soundManager.play('shoot');
    }
  }

  updateBullets() {
    Object.values(this.bullets).forEach(bullet => {
      bullet.x += Math.sin(bullet.rotation) * bullet.speed;
      bullet.z += Math.cos(bullet.rotation) * bullet.speed;
      bullet.mesh.position.set(bullet.x, 1, bullet.z);
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  onKeyDown(event) {
    if (!this.controls.isLocked) return;
    
    switch (event.code) {
      case 'KeyR':
        this.socket.emit('playerReload');
        this.soundManager.play('reload');
        break;
      case 'KeyF':
        this.interactWithDoor();
        break;
      case 'Digit1':
        this.switchWeapon('rifle');
        break;
      case 'Digit2':
        this.switchWeapon('pistol');
        break;
    }
  }

  onMouseDown(event) {
    if (event.button === 0 && this.controls.isLocked) {
      this.shoot();
    }
  }

  shoot() {
    if (this.player.ammo > 0) {
      this.socket.emit('playerShoot', {
        rotation: this.camera.rotation.y,
        weapon: this.currentWeapon
      });
      
      // Анимация отдачи
      this.weaponRecoil();
    } else {
      this.soundManager.play('empty');
    }
  }

  weaponRecoil() {
    if (this.models.weapons[this.currentWeapon]) {
      const weapon = this.models.weapons[this.currentWeapon];
      
      // Анимация отдачи
      gsap.to(weapon.position, {
        z: weapon.position.z + 0.2,
        duration: 0.05,
        yoyo: true,
        repeat: 1
      });
    }
  }

  switchWeapon(weaponType) {
    if (this.currentWeapon !== weaponType && this.models.weapons[weaponType]) {
      this.models.weapons[this.currentWeapon].visible = false;
      this.currentWeapon = weaponType;
      this.models.weapons[weaponType].visible = true;
      this.soundManager.play('weaponSwitch');
    }
  }

  gameLoop() {
    requestAnimationFrame(() => this.gameLoop());
    
    // Обновление игровой логики
    if (this.player) {
      this.updatePlayerMovement();
      this.updateBullets();
    }
    
    // Рендеринг сцены
    this.renderer.render(this.scene, this.camera);
  }
}

// Запуск игры при загрузке страницы
window.addEventListener('load', () => {
  new FPSGame();
});
