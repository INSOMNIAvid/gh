import { 
  MAP_SIZE, 
  PLAYER_HEALTH, 
  WEAPONS, 
  SOCKET_EVENTS,
  TEAMS
} from '../shared/constants.js';

export default class GameManager {
  constructor() {
    this.players = {};
    this.bullets = [];
    this.obstacles = this.generateObstacles();
    this.doors = this.generateDoors();
    this.lastUpdateTime = Date.now();
    this.gameLoop();
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
      { x: 20, y: 20, width: 2, height: 4, isOpen: false, locked: false }
    ];
  }

  addPlayer(socket) {
    const spawnPoint = this.getSpawnPoint();
    const player = {
      id: socket.id,
      ...spawnPoint,
      rotation: 0,
      health: PLAYER_HEALTH,
      weapon: 'rifle',
      ammo: WEAPONS.rifle.ammo,
      score: 0,
      team: this.assignTeam(),
      kills: 0,
      deaths: 0
    };
    
    this.players[socket.id] = player;
    return player;
  }

  getSpawnPoint() {
    // Логика безопасного спавна (упрощенная версия)
    return {
      x: 10 + Math.random() * (MAP_SIZE - 20),
      y: 0,
      z: 10 + Math.random() * (MAP_SIZE - 20)
    };
  }

  assignTeam() {
    const teamCounts = { [TEAMS.RED]: 0, [TEAMS.BLUE]: 0 };
    
    Object.values(this.players).forEach(player => {
      teamCounts[player.team]++;
    });
    
    return teamCounts[TEAMS.RED] <= teamCounts[TEAMS.BLUE] ? TEAMS.RED : TEAMS.BLUE;
  }

  updatePlayerPosition(playerId, positionData) {
    const player = this.players[playerId];
    if (player) {
      player.x = positionData.x;
      player.z = positionData.z;
      player.rotation = positionData.rotation;
    }
  }

  handlePlayerShoot(playerId, shootData) {
    const player = this.players[playerId];
    if (!player || player.ammo <= 0) return null;
    
    player.ammo--;
    
    const bullet = {
      id: Math.random().toString(36).substr(2, 9),
      x: player.x,
      z: player.z,
      rotation: shootData.rotation,
      speed: WEAPONS[player.weapon].bulletSpeed,
      owner: playerId,
      damage: WEAPONS[player.weapon].damage,
      lifetime: 2000 // 2 секунды
    };
    
    this.bullets.push(bullet);
    return bullet;
  }

  checkCollisions() {
    // Проверка столкновений пуль
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      // Проверка времени жизни
      bullet.lifetime -= 16;
      if (bullet.lifetime <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }
      
      // Проверка столкновений с препятствиями
      for (const obstacle of this.obstacles) {
        if (this.checkCollision(
          { ...bullet, width: 0.2, height: 0.2 },
          obstacle
        )) {
          this.bullets.splice(i, 1);
          break;
        }
      }
      
      // Проверка попадания в игроков
      for (const playerId in this.players) {
        const player = this.players[playerId];
        if (playerId !== bullet.owner && player.health > 0) {
          if (this.checkCollision(
            { ...bullet, width: 0.2, height: 0.2 },
            { ...player, width: 1, height: 1 }
          )) {
            this.bullets.splice(i, 1);
            this.handlePlayerHit(playerId, bullet.owner, bullet.damage);
            break;
          }
        }
      }
    }
  }

  handlePlayerHit(targetId, shooterId, damage) {
    const target = this.players[targetId];
    const shooter = this.players[shooterId];
    
    if (target && shooter) {
      target.health = Math.max(0, target.health - damage);
      
      if (target.health <= 0) {
        target.deaths++;
        shooter.kills++;
        shooter.score += 100;
      }
    }
  }

  checkCollision(obj1, obj2) {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.z < obj2.z + obj2.height &&
      obj1.z + obj1.height > obj2.z
    );
  }

  toggleDoor(doorIndex) {
    if (doorIndex >= 0 && doorIndex < this.doors.length && !this.doors[doorIndex].locked) {
      this.doors[doorIndex].isOpen = !this.doors[doorIndex].isOpen;
      return this.doors[doorIndex];
    }
    return null;
  }

  gameLoop() {
    const now = Date.now();
    const deltaTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;
    
    this.checkCollisions();
    
    // Обновление позиций пуль
    this.bullets.forEach(bullet => {
      bullet.x += Math.sin(bullet.rotation) * bullet.speed * deltaTime / 1000;
      bullet.z += Math.cos(bullet.rotation) * bullet.speed * deltaTime / 1000;
    });
    
    // Планирование следующего обновления
    setTimeout(() => this.gameLoop(), 16);
  }
}
