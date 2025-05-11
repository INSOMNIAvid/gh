import { PLAYER_SPEED } from '../shared/constants';

class PlayerController {
  constructor(camera, socket) {
    this.camera = camera;
    this.socket = socket;
    this.keys = {};
    this.setupControls();
  }

  setupControls() {
    document.addEventListener('keydown', (e) => this.keys[e.code] = true);
    document.addEventListener('keyup', (e) => this.keys[e.code] = false);
  }

  update(playerState) {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    
    const prevX = playerState.x;
    const prevZ = playerState.z;
    
    if (this.keys['KeyW']) {
      playerState.x += direction.x * PLAYER_SPEED;
      playerState.z += direction.z * PLAYER_SPEED;
    }
    if (this.keys['KeyS']) {
      playerState.x -= direction.x * PLAYER_SPEED;
      playerState.z -= direction.z * PLAYER_SPEED;
    }
    if (this.keys['KeyA']) {
      playerState.x -= direction.z * PLAYER_SPEED;
      playerState.z += direction.x * PLAYER_SPEED;
    }
    if (this.keys['KeyD']) {
      playerState.x += direction.z * PLAYER_SPEED;
      playerState.z -= direction.x * PLAYER_SPEED;
    }

    if (prevX !== playerState.x || prevZ !== playerState.z) {
      this.socket.emit('playerMove', {
        x: playerState.x,
        z: playerState.z,
        prevX,
        prevZ,
        rotation: this.camera.rotation.y
      });
    }
  }
}

export default PlayerController;
