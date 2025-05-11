import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import GameManager from './game-manager.js';
import { SOCKET_EVENTS } from '../shared/constants.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const gameManager = new GameManager();

io.on(SOCKET_EVENTS.CONNECT, (socket) => {
  console.log('Player connected:', socket.id);
  
  // Добавление игрока в игру
  const player = gameManager.addPlayer(socket);
  
  // Отправка начального состояния игры
  socket.emit(SOCKET_EVENTS.GAME_INIT, {
    player,
    players: gameManager.players,
    obstacles: gameManager.obstacles,
    doors: gameManager.doors,
    mapSize: MAP_SIZE
  });
  
  // Уведомление других игроков
  socket.broadcast.emit(SOCKET_EVENTS.PLAYER_JOINED, player);
  
  // Обработчики событий
  socket.on(SOCKET_EVENTS.PLAYER_MOVED, (data) => {
    gameManager.updatePlayerPosition(socket.id, data);
    socket.broadcast.emit(SOCKET_EVENTS.PLAYER_MOVED, {
      id: socket.id,
      ...data
    });
  });
  
  socket.on(SOCKET_EVENTS.PLAYER_SHOOT, (data) => {
    const bullet = gameManager.handlePlayerShoot(socket.id, data);
    if (bullet) {
      io.emit(SOCKET_EVENTS.BULLET_FIRED, bullet);
    }
  });
  
  socket.on(SOCKET_EVENTS.DOOR_TOGGLED, (doorIndex) => {
    const door = gameManager.toggleDoor(doorIndex);
    if (door) {
      io.emit(SOCKET_EVENTS.DOOR_TOGGLED, {
        index: doorIndex,
        isOpen: door.isOpen
      });
    }
  });
  
  socket.on(SOCKET_EVENTS.PLAYER_RELOAD, () => {
    const player = gameManager.players[socket.id];
    if (player) {
      player.ammo = WEAPONS[player.weapon].ammo;
      socket.emit(SOCKET_EVENTS.PLAYER_AMMO_UPDATE, {
        ammo: player.ammo
      });
    }
  });
  
  socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (message) => {
    io.emit(SOCKET_EVENTS.CHAT_MESSAGE, {
      playerId: socket.id,
      message
    });
  });
  
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    console.log('Player disconnected:', socket.id);
    delete gameManager.players[socket.id];
    io.emit(SOCKET_EVENTS.PLAYER_LEFT, socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
