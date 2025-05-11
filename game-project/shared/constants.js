module.exports = {
  // Настройки игры
  MAP_SIZE: 200,
  PLAYER_SPEED: 0.2,
  PLAYER_HEALTH: 100,
  RESPAWN_TIME: 5000,
  
  // Настройки оружия
  WEAPONS: {
    rifle: {
      damage: 10,
      ammo: 30,
      bulletSpeed: 1.8,
      fireRate: 100,
      reloadTime: 2000
    },
    pistol: {
      damage: 7,
      ammo: 15,
      bulletSpeed: 1.2,
      fireRate: 300,
      reloadTime: 1500
    },
    shotgun: {
      damage: 5,
      ammo: 8,
      bulletSpeed: 1.0,
      fireRate: 800,
      reloadTime: 3000,
      pelletCount: 8,
      spreadAngle: 0.2
    }
  },
  
  // Типы препятствий
  OBSTACLE_TYPES: {
    WALL: 'wall',
    CRATE: 'crate',
    BUILDING: 'building'
  },
  
  // Команды
  TEAMS: {
    RED: 'red',
    BLUE: 'blue'
  },
  
  // События сокетов
  SOCKET_EVENTS: {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    GAME_INIT: 'gameInit',
    PLAYER_JOINED: 'playerJoined',
    PLAYER_LEFT: 'playerLeft',
    PLAYER_MOVED: 'playerMoved',
    PLAYER_SHOOT: 'playerShoot',
    PLAYER_HIT: 'playerHit',
    PLAYER_DIED: 'playerDied',
    PLAYER_RELOAD: 'playerReload',
    DOOR_TOGGLED: 'doorToggled',
    CHAT_MESSAGE: 'chatMessage'
  }
};
