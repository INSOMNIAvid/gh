const { PLAYER_HEALTH, BULLET_SPEED, MAP_SIZE } = require('../shared/constants');

class GameManager {
  constructor() {
    this.players = {};
    this.bullets = [];
    this.obstacles = this.generateObstacles();
    this.doors = this.generateDoors();
  }

  generateObstacles() {
    return [
      { x: 10, y: 10, width: 5, height: 5, type: 'wall' },
      { x: 30, y: 20, width: 8, height: 3, type: 'crate' },
      { x: 50, y: 50, width: 10, height: 10, type: 'building' }
    ];
  }

  generateDoors() {
    return [
      { x: 20, y: 20, width: 2, height: 4, isOpen: false }
    ];
  }

  addPlayer(socket) {
    const spawnPoint = this.getSpawnPoint();
    this.players[socket.id] = {
      id: socket.id,
      ...spawnPoint,
      rotation: 0,
      health: PLAYER_HEALTH,
      weapon: 'rifle',
      ammo: 30,
      score: 0,
      team: this.assignTeam()
    };
    return this.players[socket.id];
  }

  getSpawnPoint() {
    // Логика безопасного спавна
    return {
      x: Math.random() * MAP_SIZE,
      y: 0,
      z: Math.random() * MAP_SIZE
    };
  }

  assignTeam() {
    const teamCounts = { red: 0, blue: 0 };
    Object.values(this.players).forEach(player => {
      teamCounts[player.team]++;
    });
    return teamCounts.red <= teamCounts.blue ? 'red' : 'blue';
  }

  updateBullets() {
    // Логика обновления пуль
  }

  checkCollisions() {
    // Логика проверки столкновений
  }
}

module.exports = GameManager;
