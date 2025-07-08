// 오디오 관리 시스템
class AudioManager {
    constructor() {
        this.audioElements = {};
        this.isEnabled = true;
        this.backgroundMusic = null;
        this.currentVictoryIndex = 0;
        this.init();
    }

    init() {
        // 배경음악 초기화
        this.backgroundMusic = document.getElementById('bg-music');
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = 0.3;
            this.backgroundMusic.loop = true;
        }

        // 터치 효과음 초기화
        this.audioElements.touch = document.getElementById('touch-sound');
        if (this.audioElements.touch) {
            this.audioElements.touch.volume = 0.5;
        }

        // 게임 승리/패배 사운드 초기화
        this.audioElements.gameVictory = document.getElementById('game-victory-sound');
        this.audioElements.gameDefeat = document.getElementById('game-defeat-sound');
        if (this.audioElements.gameVictory) this.audioElements.gameVictory.volume = 0.7;
        if (this.audioElements.gameDefeat) this.audioElements.gameDefeat.volume = 0.7;

        // 승리 사운드 배열 생성
        this.victoryAudios = [];
        for (let i = 1; i <= 5; i++) {
            const audio = new Audio(`audio/승리${i}.mp3`);
            audio.volume = 0.6;
            this.victoryAudios.push(audio);
        }

        // 패배 사운드 배열 생성
        this.defeatAudios = [];
        for (let i = 1; i <= 8; i++) {
            const audio = new Audio(`audio/패배${i}.mp3`);
            audio.volume = 0.6;
            this.defeatAudios.push(audio);
        }

        // 사용자 상호작용 후 오디오 활성화
        this.setupUserInteractionHandler();
    }

    setupUserInteractionHandler() {
        const enableAudio = () => {
            this.startBackgroundMusic();
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('touchstart', enableAudio);
        };

        document.addEventListener('click', enableAudio);
        document.addEventListener('touchstart', enableAudio);
    }

    startBackgroundMusic() {
        if (this.backgroundMusic && this.isEnabled) {
            this.backgroundMusic.play().catch(e => {
                console.log('배경음악 재생 실패:', e);
            });
        }
    }

    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
    }

    playTouchSound() {
        if (this.audioElements.touch && this.isEnabled) {
            this.audioElements.touch.currentTime = 0;
            this.audioElements.touch.play().catch(e => {
                console.log('터치 효과음 재생 실패:', e);
            });
        }
    }

    playVictorySound(roundNumber) {
        if (!this.isEnabled) return;
        
        // 라운드 번호에 따라 승리 사운드 선택 (1-5)
        const soundIndex = Math.min(roundNumber - 1, 4);
        const victoryAudio = this.victoryAudios[soundIndex];
        
        if (victoryAudio) {
            victoryAudio.currentTime = 0;
            victoryAudio.play().catch(e => {
                console.log('승리 효과음 재생 실패:', e);
            });
        }
    }

    playDefeatSound() {
        if (!this.isEnabled) return;
        
        // 패배 사운드 랜덤 선택 (1-8)
        const randomIndex = Math.floor(Math.random() * this.defeatAudios.length);
        const defeatAudio = this.defeatAudios[randomIndex];
        
        if (defeatAudio) {
            defeatAudio.currentTime = 0;
            defeatAudio.play().catch(e => {
                console.log('패배 효과음 재생 실패:', e);
            });
        }
    }

    playGameVictorySound() {
        if (this.audioElements.gameVictory && this.isEnabled) {
            this.audioElements.gameVictory.currentTime = 0;
            this.audioElements.gameVictory.play().catch(e => {
                console.log('게임 승리 효과음 재생 실패:', e);
            });
        }
    }

    playGameDefeatSound() {
        if (this.audioElements.gameDefeat && this.isEnabled) {
            this.audioElements.gameDefeat.currentTime = 0;
            this.audioElements.gameDefeat.play().catch(e => {
                console.log('게임 패배 효과음 재생 실패:', e);
            });
        }
    }

    toggleAudio() {
        this.isEnabled = !this.isEnabled;
        if (!this.isEnabled) {
            this.stopBackgroundMusic();
        } else {
            this.startBackgroundMusic();
        }
        return this.isEnabled;
    }

    setVolume(type, volume) {
        volume = Math.max(0, Math.min(1, volume));
        
        switch (type) {
            case 'background':
                if (this.backgroundMusic) {
                    this.backgroundMusic.volume = volume;
                }
                break;
            case 'effects':
                if (this.audioElements.touch) {
                    this.audioElements.touch.volume = volume;
                }
                this.victoryAudios.forEach(audio => audio.volume = volume);
                this.defeatAudios.forEach(audio => audio.volume = volume);
                break;
            case 'game':
                if (this.audioElements.gameVictory) {
                    this.audioElements.gameVictory.volume = volume;
                }
                if (this.audioElements.gameDefeat) {
                    this.audioElements.gameDefeat.volume = volume;
                }
                break;
        }
    }
}

// 전역 오디오 매니저 인스턴스
let audioManager;

// 오디오 매니저 초기화
document.addEventListener('DOMContentLoaded', () => {
    audioManager = new AudioManager();
});

// 터치 이벤트 리스너 추가
document.addEventListener('click', (e) => {
    if (audioManager) {
        audioManager.playTouchSound();
    }
});

document.addEventListener('touchstart', (e) => {
    if (audioManager) {
        audioManager.playTouchSound();
    }
});

