const express = require('express');
const socketio = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Конфигурация игры
const MAP_SIZE = 100;
const PLAYER_SPEED = 0.2;
const BULLET_SPEED = 1;
const PLAYER_HEALTH = 100;

// Игровое состояние
const state = {
  players: {},
  bullets: {},
  obstacles: [
    { id: 'wall1', x: 10, y: 0, z: 0, width: 2, height: 5, depth: 20, type: 'wall' },
    { id: 'wall2', x: -10, y: 0, z: 0, width: 2, height: 5, depth: 20, type: 'wall' },
    { id: 'door1', x: 0, y: 0, z: 10, width: 5, height: 5, depth: 2, type: 'door', open: false },
    { id: 'box1', x: 5, y: 0, z: 5, width: 3, height: 3, depth: 3, type: 'box' }
  ],
  weapons: [
    { id: 'weapon1', x: 15, y: 0, z: 0, type: 'rifle' },
    { id: 'weapon2', x: -15, y: 0, z: 0, type: 'shotgun' }
  ]
};

// Проверка столкновений
function checkCollision(object1, object2) {
  return (
    object1.x < object2.x + object2.width &&
    object1.x + object1.width > object2.x &&
    object1.y < object2.y + object2.height &&
    object1.y + object1.height > object2.y &&
    object1.z < object2.z + object2.depth &&
    object1.z + object1.depth > object2.z
  );
}

// Основной игровой цикл
setInterval(() => {
  // Обновление позиций пуль
  Object.values(state.bullets).forEach(bullet => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    bullet.z += bullet.vz;
    
    // Проверка столкновений с препятствиями
    for (const obstacle of state.obstacles) {
      if (obstacle.type === 'door' && obstacle.open) continue;
      
      if (checkCollision(bullet, obstacle)) {
        delete state.bullets[bullet.id];
        break;
      }
    }
    
    // Проверка столкновений с игроками
    for (const playerId in state.players) {
      const player = state.players[playerId];
      if (playerId !== bullet.playerId && checkCollision(bullet, player)) {
        player.health -= bullet.damage;
        delete state.bullets[bullet.id];
        
        if (player.health <= 0) {
          // Респавн игрока
          player.health = PLAYER_HEALTH;
          player.x = Math.random() * MAP_SIZE - MAP_SIZE/2;
          player.y = 0;
          player.z = Math.random() * MAP_SIZE - MAP_SIZE/2;
        }
        break;
      }
    }
    
    // Удаление пуль за пределами карты
    if (Math.abs(bullet.x) > MAP_SIZE || Math.abs(bullet.y) > MAP_SIZE || Math.abs(bullet.z) > MAP_SIZE) {
      delete state.bullets[bullet.id];
    }
  });
  
  // Отправка обновленного состояния всем клиентам
  io.emit('gameState', state);
}, 1000 / 60);

// Обработка подключений
io.on('connection', socket => {
  console.log('New player connected:', socket.id);
  
  // Создание нового игрока
  state.players[socket.id] = {
    id: socket.id,
    x: Math.random() * MAP_SIZE - MAP_SIZE/2,
    y: 0,
    z: Math.random() * MAP_SIZE - MAP_SIZE/2,
    rotation: 0,
    health: PLAYER_HEALTH,
    weapon: 'pistol',
    width: 1,
    height: 2,
    depth: 1
  };
  
  // Обработка движения игрока
  socket.on('move', data => {
    const player = state.players[socket.id];
    if (!player) return;
    
    // Обновление позиции с учетом столкновений
    const newX = player.x + data.x * PLAYER_SPEED;
    const newZ = player.z + data.z * PLAYER_SPEED;
    
    let canMoveX = true;
    let canMoveZ = true;
    
    // Проверка столкновений с препятствиями
    for (const obstacle of state.obstacles) {
      if (obstacle.type === 'door' && obstacle.open) continue;
      
      const tempPlayer = {
        ...player,
        x: newX,
        z: player.z
      };
      
      if (checkCollision(tempPlayer, obstacle)) {
        canMoveX = false;
      }
      
      tempPlayer.x = player.x;
      tempPlayer.z = newZ;
      
      if (checkCollision(tempPlayer, obstacle)) {
        canMoveZ = false;
      }
    }
    
    if (canMoveX) player.x = newX;
    if (canMoveZ) player.z = newZ;
    if (data.rotation !== undefined) player.rotation = data.rotation;
  });
  
  // Обработка действий с дверью
  socket.on('interactDoor', doorId => {
    const door = state.obstacles.find(o => o.id === doorId && o.type === 'door');
    if (door) {
      door.open = !door.open;
    }
  });
  
  // Обработка выстрела
  socket.on('shoot', direction => {
    const player = state.players[socket.id];
    if (!player || player.health <= 0) return;
    
    const bulletId = Math.random().toString(36).substr(2, 9);
    state.bullets[bulletId] = {
      id: bulletId,
      x: player.x,
      y: player.y + 1,
      z: player.z,
      vx: direction.x * BULLET_SPEED,
      vy: direction.y * BULLET_SPEED,
      vz: direction.z * BULLET_SPEED,
      playerId: socket.id,
      damage: player.weapon === 'pistol' ? 10 : player.weapon === 'rifle' ? 15 : 20,
      width: 0.1,
      height: 0.1,
      depth: 0.1
    };
  });
  
  // Обработка подбора оружия
  socket.on('pickupWeapon', weaponId => {
    const weapon = state.weapons.find(w => w.id === weaponId);
    if (weapon) {
      const player = state.players[socket.id];
      if (player && !player.weapons.includes(weapon.type)) {
        player.weapon = weapon.type;
        state.weapons = state.weapons.filter(w => w.id !== weaponId);
      }
    }
  });
  
  // Обработка отключения игрока
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete state.players[socket.id];
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
