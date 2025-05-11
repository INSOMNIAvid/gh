class UIManager {
  constructor(socket) {
    this.socket = socket;
    this.initUI();
    this.initChat();
  }

  initUI() {
    this.healthElement = document.getElementById('health');
    this.ammoElement = document.getElementById('ammo');
    this.scoreElement = document.getElementById('score');
    this.crosshair = this.createCrosshair();
  }

  createCrosshair() {
    const crosshair = document.createElement('div');
    crosshair.style.position = 'absolute';
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.width = '20px';
    crosshair.style.height = '20px';
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.border = '2px solid white';
    crosshair.style.borderRadius = '50%';
    crosshair.style.pointerEvents = 'none';
    crosshair.style.display = 'none';
    document.getElementById('game-container').appendChild(crosshair);
    return crosshair;
  }

  showCrosshair() {
    this.crosshair.style.display = 'block';
  }

  hideCrosshair() {
    this.crosshair.style.display = 'none';
  }

  updateHealth(health) {
    this.healthElement.textContent = `Health: ${health}`;
    this.healthElement.style.color = health > 30 ? 'white' : 'red';
  }

  updateAmmo(ammo) {
    this.ammoElement.textContent = `Ammo: ${ammo}/${WEAPONS[this.currentWeapon].ammo}`;
  }

  updateScore(score) {
    this.scoreElement.textContent = `Score: ${score}`;
  }

  initChat() {
    this.chatMessages = document.getElementById('messages');
    this.chatInput = document.getElementById('message-input');
    
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && this.chatInput.value.trim() !== '') {
        this.socket.emit('chatMessage', this.chatInput.value.trim());
        this.chatInput.value = '';
      }
    });
  }

  addChatMessage(data) {
    const messageElement = document.createElement('div');
    messageElement.textContent = `${data.playerId}: ${data.message}`;
    this.chatMessages.appendChild(messageElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  showDeathScreen() {
    // Реализация экрана смерти
  }

  hideDeathScreen() {
    // Скрытие экрана смерти
  }
}

export default UIManager;
