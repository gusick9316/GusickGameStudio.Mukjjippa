// 오디오 관리 시스템

class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.backgroundMusic = null;
    this.isMuted = false;
    this.volume = 0.7;
    
    // 로컬 스토리지에서 설정 로드
    this.loadSettings();
    
    // 오디오 파일 미리 로드
    this.preloadSounds();
  }

  // 설정 로드
  loadSettings() {
    const settings = localStorage.getItem('audioSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      this.isMuted = parsed.isMuted || false;
      this.volume = parsed.volume || 0.7;
    }
  }

  // 설정 저장
  saveSettings() {
    localStorage.setItem('audioSettings', JSON.stringify({
      isMuted: this.isMuted,
      volume: this.volume
    }));
  }

  // 오디오 파일 미리 로드
  preloadSounds() {
    const soundFiles = {
      'game-start': '/sounds/game-start.wav',
      'victory': '/sounds/victory.wav',
      'button-click': this.generateButtonClickSound(),
      'move-select': this.generateMoveSelectSound(),
      'round-complete': this.generateRoundCompleteSound(),
      'game-over': this.generateGameOverSound()
    };

    Object.entries(soundFiles).forEach(([name, src]) => {
      if (typeof src === 'string') {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.volume = this.volume;
        this.sounds.set(name, audio);
      } else {
        // 생성된 오디오 컨텍스트 사운드
        this.sounds.set(name, src);
      }
    });
  }

  // 버튼 클릭 사운드 생성 (Web Audio API 사용)
  generateButtonClickSound() {
    return () => {
      if (this.isMuted) return;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(this.volume * 0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    };
  }

  // 움직임 선택 사운드 생성
  generateMoveSelectSound() {
    return () => {
      if (this.isMuted) return;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.05);
      
      gainNode.gain.setValueAtTime(this.volume * 0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    };
  }

  // 라운드 완료 사운드 생성
  generateRoundCompleteSound() {
    return () => {
      if (this.isMuted) return;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // 첫 번째 톤
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      
      osc1.frequency.setValueAtTime(523, audioContext.currentTime); // C5
      gain1.gain.setValueAtTime(this.volume * 0.3, audioContext.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      osc1.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.2);
      
      // 두 번째 톤
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      
      osc2.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
      gain2.gain.setValueAtTime(this.volume * 0.3, audioContext.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      osc2.start(audioContext.currentTime + 0.1);
      osc2.stop(audioContext.currentTime + 0.3);
    };
  }

  // 게임 오버 사운드 생성
  generateGameOverSound() {
    return () => {
      if (this.isMuted) return;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // 하강하는 톤들
      const frequencies = [523, 466, 415, 370, 330];
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        const startTime = audioContext.currentTime + (index * 0.15);
        oscillator.frequency.setValueAtTime(freq, startTime);
        
        gainNode.gain.setValueAtTime(this.volume * 0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
      });
    };
  }

  // 사운드 재생
  playSound(soundName) {
    if (this.isMuted) return;
    
    const sound = this.sounds.get(soundName);
    if (!sound) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }

    try {
      if (typeof sound === 'function') {
        // 생성된 사운드 함수 실행
        sound();
      } else {
        // 오디오 파일 재생
        sound.currentTime = 0;
        sound.volume = this.volume;
        sound.play().catch(error => {
          console.warn('Failed to play sound:', error);
        });
      }
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }

  // 배경음악 재생
  playBackgroundMusic(src, loop = true) {
    if (this.isMuted) return;
    
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
    }
    
    this.backgroundMusic = new Audio(src);
    this.backgroundMusic.loop = loop;
    this.backgroundMusic.volume = this.volume * 0.3; // 배경음악은 더 작게
    
    this.backgroundMusic.play().catch(error => {
      console.warn('Failed to play background music:', error);
    });
  }

  // 배경음악 정지
  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic = null;
    }
  }

  // 음소거 토글
  toggleMute() {
    this.isMuted = !this.isMuted;
    this.saveSettings();
    
    if (this.backgroundMusic) {
      this.backgroundMusic.muted = this.isMuted;
    }
    
    return this.isMuted;
  }

  // 볼륨 설정
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    
    // 모든 사운드 볼륨 업데이트
    this.sounds.forEach(sound => {
      if (sound && typeof sound !== 'function') {
        sound.volume = this.volume;
      }
    });
    
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.volume * 0.3;
    }
  }

  // 현재 설정 가져오기
  getSettings() {
    return {
      isMuted: this.isMuted,
      volume: this.volume
    };
  }

  // 정리
  destroy() {
    this.stopBackgroundMusic();
    this.sounds.clear();
  }
}

// 싱글톤 인스턴스
export const audioManager = new AudioManager();

// 편의 함수들
export const playSound = (soundName) => audioManager.playSound(soundName);
export const playBackgroundMusic = (src, loop) => audioManager.playBackgroundMusic(src, loop);
export const stopBackgroundMusic = () => audioManager.stopBackgroundMusic();
export const toggleMute = () => audioManager.toggleMute();
export const setVolume = (volume) => audioManager.setVolume(volume);
export const getAudioSettings = () => audioManager.getSettings();

