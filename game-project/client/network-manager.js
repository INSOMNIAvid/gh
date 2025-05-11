import { SOCKET_EVENTS } from '../shared/constants.js';

export default class NetworkManager {
  constructor(game) {
    this.game = game;
    this.socket = io();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on(SOCKET_EVENTS.GAME_INIT, (data) => {
      this.game.onGameInit(data);
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_JOINED, (player) => {
      this.game.onPlayerJoined(player);
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_LEFT, (id) => {
      this.game.onPlayerLeft(id);
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_MOVED, (data) => {
      this.game.onPlayerMoved(data);
    });

    this.socket.on(SOCKET_EVENTS.BULLET_FIRED, (bullet) => {
      this.game.onBulletFired(bullet);
    });

    this.socket.on(SOCKET_EVENTS.BULLET_REMOVED, (id) => {
      this.game.onBulletRemoved(id);
    });

    this.socket.on(SOCKET_EVENTS.DOOR_TOGGLED, (data) => {
      this.game.onDoorToggled(data);
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_HEALTH_UPDATE, (data) => {
      this.game.onPlayerHealthUpdate(data);
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_DIED, (data) => {
      this.game.onPlayerDied(data);
    });

    this.socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (data) => {
      this.game.onChatMessage(data);
    });
  }

  sendPlayerMove(data) {
    this.socket.emit(SOCKET_EVENTS.PLAYER_MOVED, data);
  }

  sendPlayerShoot(data) {
    this.socket.emit(SOCKET_EVENTS.PLAYER_SHOOT, data);
  }

  sendToggleDoor(doorIndex) {
    this.socket.emit(SOCKET_EVENTS.DOOR_TOGGLED, doorIndex);
  }

  sendChatMessage(message) {
    this.socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, message);
  }

  sendPlayerReload() {
    this.socket.emit(SOCKET_EVENTS.PLAYER_RELOAD);
  }
}
