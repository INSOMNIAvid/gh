class NetworkManager {
  constructor(game) {
    this.socket = io();
    this.game = game;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on('gameInit', (data) => this.game.init(data));
    this.socket.on('playerJoined', (player) => this.game.addPlayer(player));
    this.socket.on('playerLeft', (id) => this.game.removePlayer(id));
    // Другие сетевые события...
  }

  sendPlayerMove(data) {
    this.socket.emit('playerMove', data);
  }

  sendPlayerShoot(data) {
    this.socket.emit('playerShoot', data);
  }
}

export default NetworkManager;
