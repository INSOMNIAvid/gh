// Основные константы игры
export const MAP_SIZE = 200;
export const PLAYER_SPEED = 5.0;
export const PLAYER_HEALTH = 100;
export const RESPAWN_TIME = 3000;

// Настройки оружия
export const WEAPONS = {
  rifle: {
    damage: 10,
    ammo: 30,
    fireRate: 100,
    reloadTime: 2000,
    bulletSpeed: 50,
    spread: 0.01
  },
  pistol: {
    damage: 7,
    ammo: 15,
    fireRate: 300,
    reloadTime: 1500,
    bulletSpeed: 40,
    spread: 0.03
  }
};

// События Socket.io
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  GAME_INIT: 'gameInit',
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  PLAYER_MOVED: 'playerMoved',
  PLAYER_SHOOT: 'playerShoot',
  BULLET_FIRED: 'bulletFired',
  BULLET_REMOVED: 'bulletRemoved',
  PLAYER_HIT: 'playerHit',
  PLAYER_HEALTH_UPDATE: 'playerHealthUpdate',
  PLAYER_DIED: 'playerDied',
  PLAYER_RELOAD: 'playerReload',
  DOOR_TOGGLED: 'doorToggled',
  CHAT_MESSAGE: 'chatMessage'
};

// Типы объектов
export const OBJECT_TYPES = {
  PLAYER: 'player',
  BULLET: 'bullet',
  OBSTACLE: 'obstacle',
  DOOR: 'door'
};

// Команды
export const TEAMS = {
  RED: 'red',
  BLUE: 'blue'
};
