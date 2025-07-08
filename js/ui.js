// UI 관리 시스템
class UIManager {
    constructor() {
        this.currentScreen = 'loading';
        this.screens = {};
        this.loadingStep = 0;
        this.loadingSteps = GAME_CONFIG.loadingSteps;
        this.roundResultTimer = null;
        this.init();
    }

    init() {
        // 모든 화면 요소 수집
        this.screens = {
            loading: document.getElementById('loading-screen'),
            nickname: document.getElementById('nickname-screen'),
            main: document.getElementById('main-screen'),
            waiting: document.getElementById('waiting-screen'),
            game: document.getElementById('game-screen'),
            roundResult: document.getElementById('round-result-screen'),
            gameEnd: document.getElementById('game-end-screen')
        };

        this.setupEventListeners();
        this.startLoadingSequence();
    }

    setupEventListeners() {
        // 닉네임 확인 버튼
        const nicknameConfirm = document.getElementById('nickname-confirm');
        const nicknameInput = document.getElementById('nickname-input');
        
        nicknameConfirm.addEventListener('click', () => this.handleNicknameConfirm());
        nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleNicknameConfirm();
            }
        });

        // 메인 화면 버튼들
        document.getElementById('join-game-btn').addEventListener('click', () => this.handleJoinGame());
        document.getElementById('ai-game-btn').addEventListener('click', () => this.handleAIGame());

        // 대기실 버튼들
        document.getElementById('start-game-btn').addEventListener('click', () => this.handleStartGame());
        document.getElementById('leave-waiting-btn').addEventListener('click', () => this.handleLeaveWaiting());

        // 게임 화면 선택 버튼들
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const choice = e.currentTarget.dataset.choice;
                this.handlePlayerChoice(choice);
            });
        });

        // 메인으로 돌아가기 버튼
        document.getElementById('return-main-btn').addEventListener('click', () => this.returnToMain());
    }

    // 로딩 시퀀스 시작
    async startLoadingSequence() {
        const loadingText = document.querySelector('.loading-text');
        const loadingFill = document.querySelector('.loading-fill');

        for (let i = 0; i < this.loadingSteps.length; i++) {
            loadingText.textContent = this.loadingSteps[i];
            loadingFill.style.width = `${((i + 1) / this.loadingSteps.length) * 100}%`;
            
            // 각 단계별 실제 검증
            switch (i) {
                case 0: // 인터넷 확인
                    await this.checkInternetConnection();
                    break;
                case 1: // 게임 불러오기
                    await this.loadGameResources();
                    break;
                case 2: // 게임 입장
                    await this.initializeGame();
                    break;
            }
            
            await this.delay(1000 + Math.random() * 1000); // 1-2초 대기
        }

        await this.delay(500);
        this.showScreen('nickname');
    }

    // 인터넷 연결 확인
    async checkInternetConnection() {
        try {
            if (githubAPI) {
                const connected = await githubAPI.testConnection();
                if (!connected) {
                    console.warn('GitHub API 연결 실패 - 오프라인 모드로 진행');
                }
            }
        } catch (error) {
            console.warn('연결 확인 중 오류:', error);
        }
        // 연결 실패해도 계속 진행
        return true;
    }

    // 게임 리소스 로드
    async loadGameResources() {
        try {
            if (githubAPI) {
                const repoExists = await githubAPI.checkRepository();
                if (!repoExists) {
                    console.warn('저장소 확인 실패 - 로컬 모드로 진행');
                }
            }
        } catch (error) {
            console.warn('리소스 로드 중 오류:', error);
        }
        // 실패해도 계속 진행
        return true;
    }

    // 게임 초기화
    async initializeGame() {
        // 게임 상태 초기화
        gameState.playerId = generateId();
        gameState.currentScreen = 'nickname';
    }

    // 화면 전환
    showScreen(screenName) {
        // 현재 화면 숨기기
        if (this.screens[this.currentScreen]) {
            this.screens[this.currentScreen].classList.remove('active');
        }

        // 새 화면 보이기
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            this.currentScreen = screenName;
            gameState.currentScreen = screenName;
        }
    }

    // 닉네임 확인 처리
    handleNicknameConfirm() {
        const nicknameInput = document.getElementById('nickname-input');
        const nickname = nicknameInput.value.trim();

        if (nickname.length < 2) {
            alert('닉네임은 2글자 이상 입력해주세요.');
            return;
        }

        if (nickname.length > 10) {
            alert('닉네임은 10글자 이하로 입력해주세요.');
            return;
        }

        gameState.playerName = nickname;
        this.showScreen('main');
    }

    // 게임 참여 처리
    async handleJoinGame() {
        try {
            this.showLoadingInButton('join-game-btn', '참여중...');
            
            const game = await gameMatchmaking.joinGame(gameState.playerName, gameState.playerId);
            gameState.gameId = game.id;
            gameState.isHost = game.host === gameState.playerId;
            
            this.updateWaitingRoom(game);
            this.showScreen('waiting');
            
            // 게임 상태 폴링 시작
            gameMatchmaking.startGamePolling(game.id, (updatedGame) => {
                this.handleGameUpdate(updatedGame);
            });
            
        } catch (error) {
            console.error('게임 참여 오류:', error);
            alert('게임 참여에 실패했습니다. 다시 시도해주세요.');
        } finally {
            this.resetButton('join-game-btn', '참여하기');
        }
    }

    // AI 게임 처리
    handleAIGame() {
        gameState.isAIMode = true;
        gameState.gameId = generateId();
        
        const players = [
            { id: gameState.playerId, name: gameState.playerName },
            { id: 'ai', name: 'AI' }
        ];
        
        mukjjippaGame.initGame(players, true);
        this.startGame(players);
    }

    // 게임 시작 처리
    async handleStartGame() {
        if (!gameState.isHost) return;

        try {
            this.showLoadingInButton('start-game-btn', '시작중...');
            
            const initialGameState = await gameMatchmaking.startGame(gameState.gameId, gameState.playerId);
            this.handleGameStart(initialGameState);
            
        } catch (error) {
            console.error('게임 시작 오류:', error);
            alert('게임 시작에 실패했습니다.');
        } finally {
            this.resetButton('start-game-btn', '게임 시작');
        }
    }

    // 대기실 나가기
    async handleLeaveWaiting() {
        try {
            await gameMatchmaking.leaveGame(gameState.playerId);
            gameMatchmaking.stopPolling();
            this.showScreen('main');
        } catch (error) {
            console.error('대기실 나가기 오류:', error);
        }
    }

    // 플레이어 선택 처리
    handlePlayerChoice(choice) {
        if (!mukjjippaGame || !gameState.gameStarted || gameState.roundInProgress) {
            return;
        }

        gameState.roundInProgress = true;
        
        // 선택 버튼 비활성화
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.disabled = true;
        });

        // 선택 표시
        this.displayPlayerChoice(gameState.playerId, choice);

        if (gameState.isAIMode) {
            // AI 모드
            const result = mukjjippaGame.submitChoice(gameState.playerId, choice);
            if (result) {
                this.handleRoundResult(result);
            }
        } else {
            // 멀티플레이어 모드 - GitHub API를 통해 선택 전송
            this.submitChoiceToServer(choice);
        }
    }

    // 서버에 선택 전송
    async submitChoiceToServer(choice) {
        try {
            const currentGameState = await githubAPI.loadGameState(gameState.gameId);
            if (currentGameState) {
                currentGameState.choices[gameState.playerId] = choice;
                await githubAPI.saveGameState(gameState.gameId, currentGameState);
            }
        } catch (error) {
            console.error('선택 전송 오류:', error);
        }
    }

    // 대기실 업데이트
    updateWaitingRoom(game) {
        const player1Name = document.getElementById('player1-name');
        const player2Name = document.getElementById('player2-name');
        const player1Status = document.getElementById('player1-status');
        const player2Status = document.getElementById('player2-status');
        const startBtn = document.getElementById('start-game-btn');

        // 플레이어 정보 업데이트
        if (game.players.length >= 1) {
            player1Name.textContent = game.players[0].name;
            player1Status.classList.add('ready');
        } else {
            player1Name.textContent = '대기중...';
            player1Status.classList.remove('ready');
        }

        if (game.players.length >= 2) {
            player2Name.textContent = game.players[1].name;
            player2Status.classList.add('ready');
            
            // 게임 시작 버튼 활성화 (호스트만)
            if (gameState.isHost) {
                startBtn.disabled = false;
            }
        } else {
            player2Name.textContent = '대기중...';
            player2Status.classList.remove('ready');
            startBtn.disabled = true;
        }
    }
    // 게임 상태 업데이트 처리
    handleGameStateUpdate(updatedGameState) {
        // 멀티플레이어 모드에서의 게임 상태 동기화
        if (Object.keys(updatedGameState.choices).length === 2) {
            // 모든 플레이어가 선택했을 때
            const result = this.processMultiplayerRound(updatedGameState);
            if (result) {
                this.handleRoundResult(result);
            }
        }
    }

    // 멀티플레이어 라운드 처리
    processMultiplayerRound(gameState) {
        const players = gameState.players;
        const choices = gameState.choices;
        
        // 게임 로직 처리 (mukjjippaGame과 동일한 로직)
        const player1 = players[0];
        const player2 = players[1];
        const choice1 = choices[player1.id];
        const choice2 = choices[player2.id];

        const result = this.determineWinner(choice1, choice2);
        
        let roundResult = {
            round: gameState.currentRound,
            choices: choices,
            result: result,
            gamePhase: gameState.gamePhase
        };

        // 결과에 따른 처리는 mukjjippaGame과 동일
        return roundResult;
    }

    // 승부 결과 판정 (game-logic.js와 동일)
    determineWinner(choice1, choice2) {
        if (choice1 === choice2) {
            return 'tie';
        }

        const winConditions = {
            'rock': 'scissors',
            'scissors': 'paper',
            'paper': 'rock'
        };

        if (winConditions[choice1] === choice2) {
            return 'player1';
        } else {
            return 'player2';
        }
    }/ 게임 시작 처리
    handleGameStart(initialGameState) {
        gameState.gameStarted = true;
        gameState.players = initialGameState.players;
        gameState.scores = initialGameState.scores;
        
        this.startGame(initialGameState.players);
    }

    // 게임 화면 시작
    startGame(players) {
        this.showScreen('game');
        
        // 플레이어 이름 설정
        document.getElementById('game-player1-name').textContent = players[0].name;
        document.getElementById('game-player2-name').textContent = players[1].name;
        
        // 점수 초기화
        document.getElementById('player1-score').textContent = '0';
        document.getElementById('player2-score').textContent = '0';
        
        // 게임 상태 초기화
        this.updateGameStatus(1, 'rock-paper-scissors', null, null);
        this.resetChoiceDisplay();
        this.enableChoiceButtons();
    }

    // 게임 상태 업데이트
    updateGameStatus(round, phase, attacker, defender) {
        document.getElementById('round-info').textContent = `라운드 ${round}`;
        
        if (phase === 'rock-paper-scissors') {
            document.getElementById('game-phase').textContent = '가위바위보';
            document.getElementById('attacker-info').textContent = '';
        } else {
            document.getElementById('game-phase').textContent = '묵찌빠';
            if (attacker && defender) {
                const attackerName = gameState.players.find(p => p.id === attacker)?.name || '';
                document.getElementById('attacker-info').textContent = `공격자: ${attackerName}`;
            }
        }
    }

    // 선택 표시
    displayPlayerChoice(playerId, choice) {
        const choiceEmoji = GAME_CONFIG.choices[choice].emoji;
        
        if (playerId === gameState.playerId) {
            document.getElementById('player1-choice').textContent = choiceEmoji;
        } else {
            document.getElementById('player2-choice').textContent = choiceEmoji;
        }
    }

    // 선택 표시 리셋
    resetChoiceDisplay() {
        document.getElementById('player1-choice').textContent = '?';
        document.getElementById('player2-choice').textContent = '?';
    }

    // 선택 버튼 활성화
    enableChoiceButtons() {
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.disabled = false;
        });
        gameState.roundInProgress = false;
    }

    // 라운드 결과 처리
    handleRoundResult(result) {
        // 라운드 결과 화면 표시
        this.showRoundResult(result);
        
        // 점수 업데이트
        if (result.scoreUpdate) {
            this.updateScores();
            
            // 사운드 재생
            if (result.winner === gameState.playerId) {
                const playerScore = gameState.scores[gameState.playerId] || 0;
                audioManager.playVictorySound(playerScore);
            } else {
                audioManager.playDefeatSound();
            }
        }
        
        // 게임 종료 확인
        if (result.gameFinished) {
            setTimeout(() => {
                this.showGameEnd(result.winner);
            }, GAME_CONFIG.roundResultDisplayTime);
        } else {
            setTimeout(() => {
                this.hideRoundResult();
                this.prepareNextRound(result);
            }, GAME_CONFIG.roundResultDisplayTime);
        }
    }

    // 라운드 결과 표시
    showRoundResult(result) {
        const players = gameState.players;
        const choices = result.choices;
        
        // 플레이어 이름 설정
        document.getElementById('result-player1-name').textContent = players[0].name;
        document.getElementById('result-player2-name').textContent = players[1].name;
        
        // 선택 표시
        document.getElementById('result-player1-choice').textContent = 
            GAME_CONFIG.choices[choices[players[0].id]].emoji;
        document.getElementById('result-player2-choice').textContent = 
            GAME_CONFIG.choices[choices[players[1].id]].emoji;
        
        // 결과 메시지
        document.getElementById('result-message').textContent = result.message;
        
        this.showScreen('roundResult');
    }

    // 라운드 결과 숨기기
    hideRoundResult() {
        this.showScreen('game');
    }

    // 다음 라운드 준비
    prepareNextRound(result) {
        // 게임 상태 업데이트
        const currentGame = mukjjippaGame.getGameState();
        this.updateGameStatus(
            currentGame.currentRound,
            currentGame.gamePhase,
            currentGame.attacker,
            currentGame.defender
        );
        
        this.resetChoiceDisplay();
        this.enableChoiceButtons();
    }

    // 점수 업데이트
    updateScores() {
        const players = gameState.players;
        const scores = mukjjippaGame.getGameState().scores;
        
        document.getElementById('player1-score').textContent = scores[players[0].id] || 0;
        document.getElementById('player2-score').textContent = scores[players[1].id] || 0;
    }

    // 게임 종료 화면
    showGameEnd(winnerId) {
        const winner = gameState.players.find(p => p.id === winnerId);
        const players = gameState.players;
        const scores = mukjjippaGame.getGameState().scores;
        
        // 플레이어 이름 및 점수 설정
        document.getElementById('final-player1-name').textContent = players[0].name;
        document.getElementById('final-player2-name').textContent = players[1].name;
        document.getElementById('final-player1-score').textContent = scores[players[0].id] || 0;
        document.getElementById('final-player2-score').textContent = scores[players[1].id] || 0;
        
        // 승자 메시지
        document.getElementById('winner-message').textContent = `${winner.name} 승리!`;
        
        // 사운드 재생
        if (winnerId === gameState.playerId) {
            audioManager.playGameVictorySound();
        } else {
            audioManager.playGameDefeatSound();
        }
        
        this.showScreen('gameEnd');
    }

    // 메인으로 돌아가기
    returnToMain() {
        // 게임 상태 리셋
        mukjjippaGame.resetGame();
        gameMatchmaking.stopPolling();
        
        gameState.gameStarted = false;
        gameState.roundInProgress = false;
        gameState.isAIMode = false;
        gameState.gameId = '';
        
        this.showScreen('main');
    }

    // 버튼 로딩 표시
    showLoadingInButton(buttonId, text) {
        const button = document.getElementById(buttonId);
        button.disabled = true;
        button.textContent = text;
    }

    // 버튼 리셋
    resetButton(buttonId, originalText) {
        const button = document.getElementById(buttonId);
        button.disabled = false;
        button.textContent = originalText;
    }

    // 지연 함수
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 전역 UI 매니저 인스턴스
let uiManager;

// UI 매니저 초기화
document.addEventListener('DOMContentLoaded', () => {
    uiManager = new UIManager();
});

