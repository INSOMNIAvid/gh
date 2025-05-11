// Инициализация Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('gameContainer').prepend(renderer.domElement);

// Подключение к серверу
const socket = io('http://localhost:3000');

// Состояние игры
let gameState = {
  players: {},
  bullets: {},
  obstacles: [],
  weapons: []
};

// 3D объекты
const objects = {
  players: {},
  bullets: {},
  obstacles: {},
  weapons: {}
};

// Освещение
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Текстуры и материалы
const materials = {
  wall: new THREE.MeshStandardMaterial({ color: 0x8B4513 }),
  door: new THREE.MeshStandardMaterial({ color: 0x964B00 }),
  box: new THREE.MeshStandardMaterial({ color: 0x556B2F }),
  player: new THREE.MeshStandardMaterial({ color: 0x1E90FF }),
  enemy: new THREE.MeshStandardMaterial({ color: 0xFF4500 }),
  bullet: new THREE.MeshStandardMaterial({ color: 0xFFFF00 }),
  pistol: new THREE.MeshStandardMaterial({ color: 0x696969 }),
  rifle: new THREE.MeshStandardMaterial({ color: 0x2F4F4F }),
  shotgun: new THREE.MeshStandardMaterial({ color: 0x8B0000 })
};

// Управление
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false
};

let mouseMovement = { x: 0, y: 0 };
let playerId = null;

// Обработчики событий
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') keys.space = true;
});

window.addEventListener('keyup', (e) => {
  if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = false;
  if (e.key === ' ') keys.space = false;
});

window.addEventListener('mousemove', (e) => {
  mouseMovement.x = e.movementX;
  mouseMovement.y = e.movementY;
});

window.addEventListener('click', () => {
  if (playerId) {
    // Выстрел в направлении взгляда камеры
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    socket.emit('shoot', { 
      x: direction.x, 
      y: direction.y, 
      z: direction.z 
    });
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Получение состояния игры от сервера
socket.on('gameState', (state) => {
  gameState = state;
  
  // Обновление HUD
  if (playerId && state.players[playerId]) {
    document.getElementById('health').textContent = `Health: ${state.players[playerId].health}`;
    document.getElementById('weapon').textContent = `Weapon: ${state.players[playerId].weapon}`;
  }
});

// Инициализация игрока
socket.on('connect', () => {
  playerId = socket.id;
});

// Игровой цикл
function gameLoop() {
  // Управление игроком
  if (playerId && gameState.players[playerId]) {
    const moveX = (keys.d ? 1 : 0) + (keys.a ? -1 : 0);
    const moveZ = (keys.w ? 1 : 0) + (keys.s ? -1 : 0);
    
    if (moveX !== 0 || moveZ !== 0 || mouseMovement.x !== 0 || mouseMovement.y !== 0) {
      socket.emit('move', {
        x: moveX,
        z: moveZ,
        rotation: mouseMovement.x * 0.002
      });
      mouseMovement = { x: 0, y: 0 };
    }
    
    // Обновление позиции камеры
    const player = gameState.players[playerId];
    camera.position.set(player.x, player.y + 1.5, player.z);
    camera.rotation.y = player.rotation;
  }
  
  // Обновление 3D объектов
  updateObjects();
  
  // Рендер
  renderer.render(scene, camera);
  requestAnimationFrame(gameLoop);
}

function updateObjects() {
  // Игроки
  for (const id in gameState.players) {
    if (!objects.players[id]) {
      const geometry = new THREE.BoxGeometry(1, 2, 1);
      const material = id === playerId ? materials.player : materials.enemy;
      objects.players[id] = new THREE.Mesh(geometry, material);
      scene.add(objects.players[id]);
    }
    
    const player = gameState.players[id];
    objects.players[id].position.set(player.x, player.y + 1, player.z);
    objects.players[id].rotation.y = player.rotation;
  }
  
  // Удаление отключившихся игроков
  for (const id in objects.players) {
    if (!gameState.players[id]) {
      scene.remove(objects.players[id]);
      delete objects.players[id];
    }
  }
  
  // Пули
  for (const id in gameState.bullets) {
    if (!objects.bullets[id]) {
      const geometry = new THREE.SphereGeometry(0.1);
      objects.bullets[id] = new THREE.Mesh(geometry, materials.bullet);
      scene.add(objects.bullets[id]);
    }
    
    const bullet = gameState.bullets[id];
    objects.bullets[id].position.set(bullet.x, bullet.y, bullet.z);
  }
  
  for (const id in objects.bullets) {
    if (!gameState.bullets[id]) {
      scene.remove(objects.bullets[id]);
      delete objects.bullets[id];
    }
  }
  
  // Препятствия
  for (const obstacle of gameState.obstacles) {
    if (!objects.obstacles[obstacle.id]) {
      let geometry;
      if (obstacle.type === 'door') {
        geometry = new THREE.BoxGeometry(obstacle.width, obstacle.height, obstacle.depth);
      } else {
        geometry = new THREE.BoxGeometry(obstacle.width, obstacle.height, obstacle.depth);
      }
      
      const material = materials[obstacle.type];
      objects.obstacles[obstacle.id] = new THREE.Mesh(geometry, material);
      scene.add(objects.obstacles[obstacle.id]);
    }
    
    objects.obstacles[obstacle.id].position.set(obstacle.x, obstacle.y, obstacle.z);
    
    // Анимация двери
    if (obstacle.type === 'door') {
      objects.obstacles[obstacle.id].rotation.y = obstacle.open ? Math.PI/2 : 0;
    }
  }
  
  // Оружие
  for (const weapon of gameState.weapons) {
    if (!objects.weapons[weapon.id]) {
      const geometry = new THREE.BoxGeometry(1, 0.5, 0.2);
      objects.weapons[weapon.id] = new THREE.Mesh(geometry, materials[weapon.type]);
      scene.add(objects.weapons[weapon.id]);
    }
    
    objects.weapons[weapon.id].position.set(weapon.x, weapon.y, weapon.z);
  }
  
  for (const id in objects.weapons) {
    if (!gameState.weapons.some(w => w.id === id)) {
      scene.remove(objects.weapons[id]);
      delete objects.weapons[id];
    }
  }
}

// Запуск игры
gameLoop();
