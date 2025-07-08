// 메인 애플리케이션 초기화 및 관리
class GameApp {
    constructor() {
        this.initialized = false;
        this.connectionCheckInterval = null;
        this.heartbeatInterval = null;
        this.init();
    }

    async init() {
        try {
            // DOM 로드 대기
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeApp());
            } else {
                this.initializeApp();
            }
        } catch (error) {
            console.error('앱 초기화 오류:', error);
            this.handleInitializationError(error);
        }
    }

    async initializeApp() {
        try {
            // 전역 이벤트 리스너 설정
            this.setupGlobalEventListeners();
            
            // 연결 상태 모니터링 시작
            this.startConnectionMonitoring();
            
            // 하트비트 시작 (플레이어 활성 상태 유지)
            this.startHeartbeat();
            
            // 페이지 가시성 변경 감지
            this.setupVisibilityChangeHandler();
            
            // 브라우저 종료 감지
            this.setupBeforeUnloadHandler();
            
            this.initialized = true;
            console.log('게임 앱 초기화 완료');
            
        } catch (error) {
            console.error('앱 초기화 중 오류:', error);
            this.handleInitializationError(error);
        }
    }

    setupGlobalEventListeners() {
        // 키보드 이벤트
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // 터치 이벤트 (모바일 최적화)
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        
        // 리사이즈 이벤트
        window.addEventListener('resize', () => this.handleResize());
        
        // 온라인/오프라인 상태 감지
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    handleKeyDown(e) {
        // ESC 키로 메인 화면으로 돌아가기
        if (e.key === 'Escape' && gameState.currentScreen !== 'loading' && gameState.currentScreen !== 'main') {
            if (confirm('메인 화면으로 돌아가시겠습니까?')) {
                if (uiManager) {
                    uiManager.returnToMain();
                }
            }
        }
        
        // 게임 중 숫자 키로 선택
        if (gameState.currentScreen === 'game' && !gameState.roundInProgress) {
            switch (e.key) {
                case '1':
                    if (uiManager) uiManager.handlePlayerChoice('rock');
                    break;
                case '2':
                    if (uiManager) uiManager.handlePlayerChoice('scissors');
                    break;
                case '3':
                    if (uiManager) uiManager.handlePlayerChoice('paper');
                    break;
            }
        }
    }

    handleTouchStart(e) {
        // 터치 피드백 (진동)
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }

    handleResize() {
        // 화면 크기 변경 시 UI 조정
        this.adjustUIForScreenSize();
    }

    adjustUIForScreenSize() {
        const isMobile = window.innerWidth <= 768;
        document.body.classList.toggle('mobile', isMobile);
        
        // 모바일에서 뷰포트 높이 조정
        if (isMobile) {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
    }

    handleOnline() {
        console.log('온라인 상태로 변경됨');
        if (gameState.currentScreen === 'game' && !gameState.isAIMode) {
            // 온라인 복구 시 게임 상태 동기화
            this.syncGameState();
        }
    }

    handleOffline() {
        console.log('오프라인 상태로 변경됨');
        if (gameState.currentScreen === 'game' && !gameState.isAIMode) {
            alert('인터넷 연결이 끊어졌습니다. AI 모드로 전환하거나 연결을 확인해주세요.');
        }
    }

    async syncGameState() {
        try {
            if (gameState.gameId && githubAPI) {
                const currentGameState = await githubAPI.loadGameState(gameState.gameId);
                if (currentGameState && uiManager) {
                    uiManager.handleGameUpdate(currentGameState);
                }
            }
        } catch (error) {
            console.error('게임 상태 동기화 오류:', error);
        }
    }

    startConnectionMonitoring() {
        this.connectionCheckInterval = setInterval(async () => {
            if (navigator.onLine && githubAPI) {
                try {
                    const connected = await githubAPI.testConnection();
                    if (!connected) {
                        console.warn('GitHub API 연결 불안정');
                    }
                } catch (error) {
                    console.warn('연결 확인 중 오류:', error);
                }
            }
        }, 30000); // 30초마다 확인
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(async () => {
            if (gameState.gameId && gameState.gameStarted && !gameState.isAIMode) {
                try {
                    // 플레이어 활성 상태 업데이트
                    await this.updatePlayerHeartbeat();
                } catch (error) {
                    console.warn('하트비트 업데이트 오류:', error);
                }
            }
        }, 10000); // 10초마다 하트비트
    }

    async updatePlayerHeartbeat() {
        try {
            if (githubAPI && gameState.gameId) {
                const currentGameState = await githubAPI.loadGameState(gameState.gameId);
                if (currentGameState) {
                    // 플레이어 마지막 활성 시간 업데이트
                    if (!currentGameState.playerHeartbeats) {
                        currentGameState.playerHeartbeats = {};
                    }
                    currentGameState.playerHeartbeats[gameState.playerId] = getCurrentTimestamp();
                    await githubAPI.saveGameState(gameState.gameId, currentGameState);
                }
            }
        } catch (error) {
            console.error('하트비트 업데이트 실패:', error);
        }
    }

    setupVisibilityChangeHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // 페이지가 숨겨짐 (다른 탭으로 이동, 최소화 등)
                this.handlePageHidden();
            } else {
                // 페이지가 다시 보임
                this.handlePageVisible();
            }
        });
    }

    handlePageHidden() {
        // 배경음악 일시정지 (선택사항)
        if (audioManager) {
            audioManager.setVolume('background', 0.1);
        }
    }

    handlePageVisible() {
        // 배경음악 복원
        if (audioManager) {
            audioManager.setVolume('background', 0.3);
        }
        
        // 게임 상태 동기화
        if (gameState.gameStarted && !gameState.isAIMode) {
            this.syncGameState();
        }
    }

    setupBeforeUnloadHandler() {
        window.addEventListener('beforeunload', (e) => {
            if (gameState.gameStarted && !gameState.isAIMode) {
                // 게임 중일 때 페이지 나가기 경고
                e.preventDefault();
                e.returnValue = '게임이 진행 중입니다. 정말 나가시겠습니까?';
                return e.returnValue;
            }
        });

        // 페이지 언로드 시 정리
        window.addEventListener('unload', () => {
            this.cleanup();
        });
    }

    async cleanup() {
        try {
            // 인터벌 정리
            if (this.connectionCheckInterval) {
                clearInterval(this.connectionCheckInterval);
            }
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }

            // 게임에서 나가기
            if (gameState.gameId && !gameState.isAIMode && gameMatchmaking) {
                await gameMatchmaking.leaveGame(gameState.playerId);
            }

            // 폴링 중지
            if (gameMatchmaking) {
                gameMatchmaking.stopPolling();
            }

            // 오디오 정리
            if (audioManager) {
                audioManager.stopBackgroundMusic();
            }
        } catch (error) {
            console.error('정리 중 오류:', error);
        }
    }

    handleInitializationError(error) {
        console.error('초기화 오류:', error);
        
        // 오류 화면 표시
        document.body.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                font-family: 'Noto Sans KR', sans-serif;
                text-align: center;
                padding: 2rem;
            ">
                <div>
                    <h1 style="font-size: 2rem; margin-bottom: 1rem;">게임 로드 실패</h1>
                    <p style="font-size: 1.1rem; margin-bottom: 2rem;">
                        게임을 불러오는 중 오류가 발생했습니다.<br>
                        페이지를 새로고침해주세요.
                    </p>
                    <button onclick="location.reload()" style="
                        padding: 1rem 2rem;
                        background: white;
                        color: #667eea;
                        border: none;
                        border-radius: 8px;
                        font-size: 1.1rem;
                        font-weight: 600;
                        cursor: pointer;
                    ">새로고침</button>
                </div>
            </div>
        `;
    }

    // 디버그 정보 출력
    getDebugInfo() {
        return {
            initialized: this.initialized,
            gameState: gameState,
            currentScreen: gameState.currentScreen,
            online: navigator.onLine,
            userAgent: navigator.userAgent,
            timestamp: getCurrentTimestamp()
        };
    }
}

// 전역 앱 인스턴스
let gameApp;

// 앱 시작
(() => {
    gameApp = new GameApp();
})();

// 전역 함수들 (디버깅용)
window.getGameState = () => gameState;
window.getDebugInfo = () => gameApp ? gameApp.getDebugInfo() : null;
window.resetGame = () => {
    if (confirm('게임을 리셋하시겠습니까?')) {
        location.reload();
    }
};

// 개발자 도구에서 사용할 수 있는 유틸리티
if (typeof window !== 'undefined') {
    window.GameUtils = {
        toggleAudio: () => audioManager ? audioManager.toggleAudio() : false,
        setAudioVolume: (type, volume) => audioManager ? audioManager.setVolume(type, volume) : false,
        getGameState: () => gameState,
        resetToMain: () => uiManager ? uiManager.returnToMain() : false,
        testConnection: () => githubAPI ? githubAPI.testConnection() : false
    };
}

