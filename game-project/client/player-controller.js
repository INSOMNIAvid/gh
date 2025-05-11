import { PLAYER_SPEED } from '../shared/constants.js';

export default class PlayerController {
  constructor(camera, socket) {
    this.camera = camera;
    this.socket = socket;
    this.keys = {};
    this.setupControls();
    this.movement = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };
  }

  setupControls() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      this.updateMovementState();
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.updateMovementState();
    });
  }

  updateMovementState() {
    this.movement = {
      forward: this.keys['KeyW'] || false,
      backward: this.keys['KeyS'] || false,
      left: this.keys['KeyA'] || false,
      right: this.keys['KeyD'] || false
    };
  }

  update(playerState, deltaTime) {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const sideDirection = new THREE.Vector3();
    sideDirection.crossVectors(this.camera.up, direction).normalize();

    const prevX = playerState.x;
    const prevZ = playerState.z;
    const speed = PLAYER_SPEED * deltaTime;

    if (this.movement.forward) {
      playerState.x += direction.x * speed;
      playerState.z += direction.z * speed;
    }
    if (this.movement.backward) {
      playerState.x -= direction.x * speed;
      playerState.z -= direction.z * speed;
    }
    if (this.movement.left) {
      playerState.x += sideDirection.x * speed;
      playerState.z += sideDirection.z * speed;
    }
    if (this.movement.right) {
      playerState.x -= sideDirection.x * speed;
      playerState.z -= sideDirection.z * speed;
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
