import { SOCKET_EVENTS } from '../shared/constants.js';

export default class UIManager {
  constructor(socket) {
    this.socket = socket;
    this.initUI();
    this.initChat();
  }

  initUI() {
    // Элементы HUD
    this.healthElement = document.getElementById('health');
    this.ammoElement = document.getElementById('ammo');
    this.scoreElement = document.getElementById('score');
    this.weaponElement = document.getElementById('weapon');

    // Перекрестие
    this.crosshair = this.createCrosshair();
    
    // Экран смерти
    this.deathScreen = this.createDeathScreen();
  }

  createCrosshair() {
    const crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    crosshair.style.position = 'absolute';
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.width = '20px';
    crosshair.style.height = '20px';
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.border = '2px solid rgba(255, 255, 255, 0.8)';
    crosshair.style.borderRadius = '50%';
    crosshair.style.pointerEvents = 'none';
    crosshair.style.display = 'none';
    document.getElementById('game-container').appendChild(crosshair);
    return crosshair;
  }

  createDeathScreen() {
    const screen = document.createElement('div');
    screen.id = 'death-screen';
    screen.style.position = 'absolute';
    screen.style.top = '0';
    screen.style.left = '0';
    screen.style.width = '100%';
    screen.style.height = '100%';
    screen.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
    screen.style.display = 'flex';
    screen.style.justifyContent = 'center';
    screen.style.alignItems = 'center';
    screen.style.color = 'white';
    screen.style.fontSize = '24px';
    screen.style.pointerEvents = 'none';
    screen.style.display = 'none';
    
    const message = document.createElement('div');
    message.textContent = 'ВЫ УМЕРЛИ. Возрождение через 3 секунды...';
    screen.appendChild(message);
    
    document.getElementById('game-container').appendChild(screen);
    return screen;
  }

  initChat() {
    this.chatMessages = document.getElementById('messages');
    this.chatInput = document.getElementById('message-input');
    
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && this.chatInput.value.trim() !== '') {
        this.socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, this.chatInput.value.trim());
        this.chatInput.value = '';
      }
    });
  }

  updateHealth(health) {
    this.healthElement.textContent = `Health: ${health}`;
    this.healthElement.style.color = health > 30 ? 'white' : 'red';
  }

  updateAmmo(ammo, maxAmmo) {
    this.ammoElement.textContent = `Ammo: ${ammo}/${maxAmmo}`;
  }

  updateScore(score) {
    this.scoreElement.textContent = `Score: ${score}`;
  }

  updateWeapon(weaponName) {
    this.weaponElement.style.backgroundImage = `url('assets/textures/${weaponName}.png')`;
  }

  showCrosshair() {
    this.crosshair.style.display = 'block';
  }

  hideCrosshair() {
    this.crosshair.style.display = 'none';
  }

  showDeathScreen() {
    this.deathScreen.style.display = 'flex';
  }

  hideDeathScreen() {
    this.deathScreen.style.display = 'none';
  }

  addChatMessage(data) {
    const messageElement = document.createElement('div');
    messageElement.textContent = `${data.playerId}: ${data.message}`;
    this.chatMessages.appendChild(messageElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }
}
