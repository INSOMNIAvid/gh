class SoundManager {
  constructor() {
    this.sounds = {};
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.loadSounds();
  }

  async loadSounds() {
    this.sounds = {
      shoot: await this.loadSound('assets/sounds/shoot.mp3'),
      reload: await this.loadSound('assets/sounds/reload.mp3'),
      hit: await this.loadSound('assets/sounds/hit.mp3'),
      empty: await this.loadSound('assets/sounds/empty.mp3'),
      weaponSwitch: await this.loadSound('assets/sounds/switch.mp3')
    };
  }

  async loadSound(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  }

  play(soundName) {
    if (this.sounds[soundName]) {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.sounds[soundName];
      source.connect(this.audioContext.destination);
      source.start(0);
    }
  }
}

export default SoundManager;
