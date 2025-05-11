// Инициализация Three.js
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Небо

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').prepend(renderer.domElement);

// Освещение
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Подключение к серверу
const socket = io();

// Состояние игры
let playerId;
let players = {};
let bullets = {};
let obstacles = [];
let doors = [];
let mapSize = 100;

// Элементы интерфейса
const healthElement = document.getElementById('health');
const ammoElement = document.getElementById('ammo');
const scoreElement = document.getElementById('score');
const messageInput = document.getElementById('message-input');
const messagesElement = document.getElementById('messages');

// Управление
const keys = {};
document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);
document.addEventListener('mousedown', handleShoot);
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') socket.emit('playerReload');
  if (e.code === 'KeyF') toggleDoor();
});

// Обработка ввода сообщений
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && messageInput.value.trim() !== '') {
    socket.emit('chatMessage', messageInput.value.trim());
    messageInput.value = '';
  }
});

// Инициализация игры
socket.on('gameInit', (data) => {
  playerId = data.playerId;
  players = data.players;
  obstacles = data.obstacles;
  doors = data.doors;
  mapSize = data.mapSize;
  
  // Создание карты
  createMap();
  
  // Создание моделей игроков
  for (const id in players) {
    if (id !== playerId) {
      createPlayerModel(players[id]);
    }
  }
  
  // Создание препятствий
  createObstacles();
  
  // Создание дверей
  createDoors();
  
  // Позиция камеры для текущего игрока
  camera.position.set(players[playerId].x, 1.5, players[playerId].z);
  
  // Запуск игрового цикла
  animate();
});

// Создание карты
function createMap() {
  // Земля
  const groundGeometry = new THREE.PlaneGeometry(mapSize, mapSize);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3a5f0b,
    side: THREE.DoubleSide
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  
  // Границы карты
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
  const walls = [
    { pos: [mapSize/2, 2.5, 0], size: [mapSize, 5, 1] }, // Север
    { pos: [mapSize/2, 2.5, mapSize], size: [mapSize, 5, 1] }, // Юг
    { pos: [0, 2.5, mapSize/2], size: [1, 5, mapSize] }, // Запад
    { pos: [mapSize, 2.5, mapSize/2], size: [1, 5, mapSize] } // Восток
  ];
  
  walls.forEach(wall => {
    const geometry = new THREE.BoxGeometry(...wall.size);
    const mesh = new THREE.Mesh(geometry, wallMaterial);
    mesh.position.set(...wall.pos);
    scene.add(mesh);
  });
}

// Создание моделей игроков
function createPlayerModel(player) {
  const group = new THREE.Group();
  
  // Тело
  const bodyGeometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: player.team === 'red' ? 0xff0000 : 0x0000ff 
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.9;
  group.add(body);
  
  // Голова
  const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffccaa });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.7;
  group.add(head);
  
  group.position.set(player.x, 0, player.z);
  group.rotation.y = player.rotation;
  group.userData = { id: player.id };
  scene.add(group);
}

// Создание препятствий
function createObstacles() {
  const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
  
  obstacles.forEach(obstacle => {
    const geometry = new THREE.BoxGeometry(obstacle.width, 5, obstacle.height);
    const mesh = new THREE.Mesh(geometry, obstacleMaterial);
    mesh.position.set(obstacle.x + obstacle.width/2, 2.5, obstacle.z + obstacle.height/2);
    mesh.userData = { type: 'obstacle' };
    scene.add(mesh);
  });
}

// Создание дверей
function createDoors() {
  doors.forEach((door, index) => {
    const doorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x964B00,
      transparent: true,
      opacity: door.isOpen ? 0.5 : 1
    });
    
    const geometry = new THREE.BoxGeometry(door.width, 3, door.height);
    const mesh = new THREE.Mesh(geometry, doorMaterial);
    mesh.position.set(door.x + door.width/2, 1.5, door.z + door.height/2);
    mesh.userData = { type: 'door', index, isOpen: door.isOpen };
    scene.add(mesh);
  });
}

// Обработка движения игрока
function handlePlayerMovement() {
  if (!players[playerId]) return;
  
  const player = players[playerId];
  const prevX = player.x;
  const prevZ = player.z;
  
  const speed = 0.2;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  
  if (keys['KeyW']) {
    player.x += direction.x * speed;
    player.z += direction.z * speed;
  }
  if (keys['KeyS']) {
    player.x -= direction.x * speed;
    player.z -= direction.z * speed;
  }
  if (keys['KeyA']) {
    player.x -= direction.z * speed;
    player.z += direction.x * speed;
  }
  if (keys['KeyD']) {
    player.x += direction.z * speed;
    player.z -= direction.x * speed;
  }
  
  // Проверка границ карты
  player.x = Math.max(0.5, Math.min(mapSize - 0.5, player.x));
  player.z = Math.max(0.5, Math.min(mapSize - 0.5, player.z));
  
  // Обновление позиции камеры
  camera.position.set(player.x, 1.5, player.z);
  
  // Отправка данных о движении на сервер
  if (prevX !== player.x || prevZ !== player.z) {
    socket.emit('playerMove', {
      x: player.x,
      z: player.z,
      prevX,
      prevZ,
      rotation: camera.rotation.y
    });
  }
}

// Обработка выстрела
function handleShoot() {
  if (!players[playerId] || players[playerId].ammo <= 0) return;
  
  socket.emit('playerShoot', {
    rotation: camera.rotation.y
  });
  
  // Эффект отдачи
  camera.position.y -= 0.05;
  setTimeout(() => {
    camera.position.y += 0.05;
  }, 100);
  
  // Обновление интерфейса
  players[playerId].ammo--;
  updateHUD();
}

// Взаимодействие с дверью
function toggleDoor() {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(), camera);
  const intersects = raycaster.intersectObjects(scene.children);
  
  for (const intersect of intersects) {
    if (intersect.object.userData.type === 'door' && intersect.distance < 5) {
      socket.emit('toggleDoor', intersect.object.userData.index);
      break;
    }
  }
}

// Обновление интерфейса
function updateHUD() {
  const player = players[playerId];
  if (!player) return;
  
  healthElement.textContent = `Health: ${player.health}`;
  ammoElement.textContent = `Ammo: ${player.ammo}/30`;
  scoreElement.textContent = `Score: ${player.score}`;
  
  if (player.health <= 0) {
    healthElement.style.color = 'red';
  } else {
    healthElement.style.color = 'white';
  }
}

// Сетевые события
socket.on('playerJoined', (player) => {
  players[player.id] = player;
  createPlayerModel(player);
});

socket.on('playerLeft', (id) => {
  scene.children.forEach(obj => {
    if (obj.userData?.id === id) {
      scene.remove(obj);
    }
  });
  delete players[id];
});

socket.on('playerMoved', (data) => {
  if (players[data.id]) {
    players[data.id].x = data.x;
    players[data.id].z = data.z;
    players[data.id].rotation = data.rotation;
    
    scene.children.forEach(obj => {
      if (obj.userData?.id === data.id) {
        obj.position.set(data.x, 0, data.z);
        obj.rotation.y = data.rotation;
      }
    });
  }
});

socket.on('bulletFired', (bullet) => {
  bullets[bullet.id] = bullet;
  
  // Создание визуального представления пули
  const geometry = new THREE.SphereGeometry(0.1, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(bullet.x, 1, bullet.z);
  sphere.userData = { id: bullet.id };
  scene.add(sphere);
});

socket.on('bulletRemoved', (id) => {
  scene.children.forEach(obj => {
    if (obj.userData?.id === id) {
      scene.remove(obj);
    }
  });
  delete bullets[id];
});

socket.on('doorToggled', (data) => {
  doors[data.index].isOpen = data.isOpen;
  
  scene.children.forEach(obj => {
    if (obj.userData?.type === 'door' && obj.userData.index === data.index) {
      obj.material.opacity = data.isOpen ? 0.5 : 1;
      obj.userData.isOpen = data.isOpen;
    }
  });
});

socket.on('playerHealthUpdate', (data) => {
  if (players[data.id]) {
    players[data.id].health = data.health;
    if (data.id === playerId) updateHUD();
  }
});

socket.on('playerAmmoUpdate', (data) => {
  if (players[playerId]) {
    players[playerId].ammo = data.ammo;
    updateHUD();
  }
});

socket.on('playerDied', (data) => {
  if (players[data.killedId]) {
    players[data.killedId].health = 0;
    
    if (data.killedId === playerId) {
      setTimeout(() => {
        players[playerId].health = PLAYER_HEALTH;
        const pos = getRandomPosition();
        players[playerId].x = pos.x;
        players[playerId].z = pos.z;
        camera.position.set(pos.x, 1.5, pos.z);
        socket.emit('playerMove', {
          x: pos.x,
          z: pos.z,
          rotation: camera.rotation.y
        });
        updateHUD();
      }, 3000);
    }
  }
});

socket.on('chatMessage', (data) => {
  const messageElement = document.createElement('div');
  messageElement.textContent = `${data.playerId}: ${data.message}`;
  messagesElement.appendChild(messageElement);
  messagesElement.scrollTop = messagesElement.scrollHeight;
});

// Игровой цикл
function animate() {
  requestAnimationFrame(animate);
  
  handlePlayerMovement();
  
  // Обновление позиций пуль
  for (const id in bullets) {
    const bullet = bullets[id];
    bullet.x += Math.sin(bullet.rotation) * bullet.speed;
    bullet.z += Math.cos(bullet.rotation) * bullet.speed;
    
    scene.children.forEach(obj => {
      if (obj.userData?.id === id) {
        obj.position.set(bullet.x, 1, bullet.z);
      }
    });
  }
  
  renderer.render(scene, camera);
}

// Обработка изменения размера окна
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
