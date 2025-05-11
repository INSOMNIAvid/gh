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
const BULLET_SPEED = 1.5;
const PLAYER_HEALTH = 100;

// Состояние игры
const players = {};
const bullets = [];
const obstacles = [
  { x: 10, y: 10, width: 5, height: 5 },
  { x: 30, y: 20, width: 8, height: 3 },
  { x: 50, y: 50, width: 10, height: 10 }
];
const doors = [
  { x: 20, y: 20, width: 2, height: 4, isOpen: false }
];

// Генерация случайной позиции
function getRandomPosition() {
  return {
    x: Math.random() * MAP_SIZE,
    y: 0,
    z: Math.random() * MAP_SIZE
  };
}

// Проверка столкновений
function checkCollision(obj1, obj2) {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.z < obj2.z + obj2.height &&
    obj1.z + obj1.height > obj2.z
  );
}

io.on('connection', (socket) => {
  console.log('New player connected:', socket.id);
  
  // Создание нового игрока
  players[socket.id] = {
    id: socket.id,
    ...getRandomPosition(),
    rotation: 0,
    health: PLAYER_HEALTH,
    weapon: 'rifle',
    ammo: 30,
    score: 0,
    team: Math.random() > 0.5 ? 'red' : 'blue'
  };
  
  // Отправка начального состояния игры
  socket.emit('gameInit', {
    playerId: socket.id,
    players,
    obstacles,
    doors,
    mapSize: MAP_SIZE
  });
  
  // Оповещение других игроков о новом игроке
  socket.broadcast.emit('playerJoined', players[socket.id]);
  
  // Обработка движения игрока
  socket.on('playerMove', (data) => {
    const player = players[socket.id];
    if (!player || player.health <= 0) return;
    
    // Обновление позиции
    player.x = data.x;
    player.z = data.z;
    player.rotation = data.rotation;
    
    // Проверка столкновений с препятствиями
    for (const obstacle of obstacles) {
      if (checkCollision({ ...player, width: 1, height: 1 }, obstacle)) {
        // Откат позиции при столкновении
        player.x = data.prevX;
        player.z = data.prevZ;
        break;
      }
    }
    
    // Отправка обновленной позиции всем игрокам
    socket.broadcast.emit('playerMoved', {
      id: socket.id,
      x: player.x,
      z: player.z,
      rotation: player.rotation
    });
  });
  
  // Обработка выстрела
  socket.on('playerShoot', (data) => {
    const player = players[socket.id];
    if (!player || player.health <= 0 || player.ammo <= 0) return;
    
    player.ammo--;
    
    const bullet = {
      id: Math.random().toString(36).substr(2, 9),
      x: player.x,
      z: player.z,
      rotation: data.rotation,
      speed: BULLET_SPEED,
      owner: socket.id,
      damage: 10
    };
    
    bullets.push(bullet);
    io.emit('bulletFired', bullet);
  });
  
  // Обработка взаимодействия с дверью
  socket.on('toggleDoor', (doorIndex) => {
    if (doorIndex >= 0 && doorIndex < doors.length) {
      doors[doorIndex].isOpen = !doors[doorIndex].isOpen;
      io.emit('doorToggled', { index: doorIndex, isOpen: doors[doorIndex].isOpen });
    }
  });
  
  // Обработка получения урона
  socket.on('playerHit', (data) => {
    const targetPlayer = players[data.targetId];
    if (targetPlayer) {
      targetPlayer.health -= data.damage;
      if (targetPlayer.health <= 0) {
        targetPlayer.health = 0;
        players[data.shooterId].score += 1;
        io.emit('playerDied', { 
          killedId: data.targetId, 
          killerId: data.shooterId 
        });
      }
      io.emit('playerHealthUpdate', {
        id: data.targetId,
        health: targetPlayer.health
      });
    }
  });
  
  // Обработка перезарядки
  socket.on('playerReload', () => {
    const player = players[socket.id];
    if (player) {
      player.ammo = 30;
      socket.emit('playerAmmoUpdate', { ammo: player.ammo });
    }
  });
  
  // Обработка отключения игрока
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

// Игровой цикл
setInterval(() => {
  // Обновление позиций пуль
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.x += Math.sin(bullet.rotation) * bullet.speed;
    bullet.z += Math.cos(bullet.rotation) * bullet.speed;
    
    // Проверка выхода за границы карты
    if (bullet.x < 0 || bullet.x > MAP_SIZE || bullet.z < 0 || bullet.z > MAP_SIZE) {
      bullets.splice(i, 1);
      io.emit('bulletRemoved', bullet.id);
      continue;
    }
    
    // Проверка столкновений с препятствиями
    for (const obstacle of obstacles) {
      if (checkCollision({ ...bullet, width: 0.2, height: 0.2 }, obstacle)) {
        bullets.splice(i, 1);
        io.emit('bulletRemoved', bullet.id);
        break;
      }
    }
    
    // Проверка попадания в игроков
    for (const playerId in players) {
      if (playerId !== bullet.owner && players[playerId].health > 0) {
        const player = players[playerId];
        if (checkCollision({ ...bullet, width: 0.2, height: 0.2 }, { ...player, width: 1, height: 1 })) {
          bullets.splice(i, 1);
          io.emit('bulletRemoved', bullet.id);
          io.emit('playerHitEffect', { playerId, hitPosition: { x: bullet.x, z: bullet.z } });
          socket.to(playerId).emit('playerHit', {
            targetId: playerId,
            shooterId: bullet.owner,
            damage: bullet.damage
          });
          break;
        }
      }
    }
  }
}, 16);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
