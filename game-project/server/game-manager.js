const { MAP_SIZE, PLAYER_HEALTH, WEAPONS } = require('../shared/constants');

class GameManager {
  constructor() {
    this.players = {};
    this.bullets = [];
    this.obstacles = this.generateObstacles();
    this.doors = this.generateDoors();
    this.gameTime = 0;
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
    let x, z;
    let validPosition = false;
    let attempts = 0;
    
    while (!validPosition && attempts < 100) {
      x = Math.random() * MAP_SIZE;
      z = Math.random() * MAP_SIZE;
      validPosition = true;
      
      // Проверка столкновений с препятствиями
      for (const obstacle of this.obstacles) {
        if (this.checkCollision(
          { x, z, width: 1, height: 1 },
          obstacle
        )) {
          validPosition = false;
          break;
        }
      }
      
      attempts++;
    }
    
    return { x: x || 10, y: 0, z: z || 10 };
  }

  assignTeam() {
    const teamCounts = { red: 0, blue: 0 };
    Object.values(this.players).forEach(player => {
      teamCounts[player.team]++;
    });
    return teamCounts.red <= teamCounts.blue ? 'red' : 'blue';
  }

  updatePlayerPosition(playerId, positionData) {
    const player = this.players[playerId];
    if (player) {
      player.x = positionData.x;
      player.z = positionData.z;
      player.rotation = positionData.rotation;
    }
  }

  addBullet(bulletData) {
    const player = this.players[bulletData.owner];
    if (!player || player.ammo <= 0) return null;
    
    player.ammo--;
    
    const bullet = {
      id: Math.random().toString(36).substr(2, 9),
      x: player.x,
      z: player.z,
      rotation: bulletData.rotation,
      speed: WEAPONS[player.weapon].bulletSpeed,
      owner: player.id,
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
      target.health -= damage;
      
      if (target.health <= 0) {
        target.health = 0;
        target.deaths++;
        shooter.kills++;
        shooter.score += 100;
        
        // Респавн игрока через 5 секунд
        setTimeout(() => {
          if (this.players[targetId]) {
            const spawnPoint = this.getSpawnPoint();
            target.x = spawnPoint.x;
            target.z = spawnPoint.z;
            target.health = PLAYER_HEALTH;
            target.ammo = WEAPONS[target.weapon].ammo;
          }
        }, 5000);
      }
    }
  }

  checkCollisions(obj1, obj2) {
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
    setInterval(() => {
      this.gameTime += 16;
      this.checkCollisions();
    }, 16);
  }
}

module.exports = GameManager;
