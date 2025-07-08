// 묵찌빠 게임 로직
class MukjjippaGame {
    constructor() {
        this.gameState = null;
        this.isAIMode = false;
        this.aiDifficulty = 'normal';
        this.playerChoices = {};
        this.roundTimer = null;
    }

    // 게임 초기화
    initGame(players, isAIMode = false) {
        this.isAIMode = isAIMode;
        this.gameState = {
            players: players,
            scores: {},
            currentRound: 1,
            gamePhase: 'rock-paper-scissors', // 'rock-paper-scissors' 또는 'mukjjippa'
            attacker: null,
            defender: null,
            choices: {},
            status: 'playing',
            winner: null
        };

        // 점수 초기화
        players.forEach(player => {
            this.gameState.scores[player.id] = 0;
        });

        return this.gameState;
    }

    // 선택 제출
    submitChoice(playerId, choice) {
        if (!this.gameState || this.gameState.status !== 'playing') {
            return false;
        }

        this.gameState.choices[playerId] = choice;
        
        // AI 모드에서 AI 선택 생성
        if (this.isAIMode && Object.keys(this.gameState.choices).length === 1) {
            const aiPlayer = this.gameState.players.find(p => p.id !== playerId);
            if (aiPlayer) {
                this.gameState.choices[aiPlayer.id] = this.generateAIChoice();
            }
        }

        // 모든 플레이어가 선택했는지 확인
        if (Object.keys(this.gameState.choices).length === this.gameState.players.length) {
            return this.processRound();
        }

        return false;
    }

    // AI 선택 생성
    generateAIChoice() {
        const choices = ['rock', 'scissors', 'paper'];
        
        switch (this.aiDifficulty) {
            case 'easy':
                // 완전 랜덤
                return choices[Math.floor(Math.random() * choices.length)];
            
            case 'normal':
                // 약간의 패턴 (70% 랜덤, 30% 전략적)
                if (Math.random() < 0.7) {
                    return choices[Math.floor(Math.random() * choices.length)];
                } else {
                    // 이전 라운드 결과를 고려한 전략적 선택
                    return this.getStrategicChoice();
                }
            
            case 'hard':
                // 더 전략적 (50% 랜덤, 50% 전략적)
                if (Math.random() < 0.5) {
                    return choices[Math.floor(Math.random() * choices.length)];
                } else {
                    return this.getStrategicChoice();
                }
            
            default:
                return choices[Math.floor(Math.random() * choices.length)];
        }
    }

    // 전략적 선택 생성
    getStrategicChoice() {
        const choices = ['rock', 'scissors', 'paper'];
        
        // 현재 게임 상황에 따른 전략적 선택
        if (this.gameState.gamePhase === 'mukjjippa') {
            if (this.gameState.attacker) {
                // 공격자일 때는 같은 것을 내거나 이기는 것을 냄
                const lastChoice = this.getLastPlayerChoice();
                if (lastChoice) {
                    if (Math.random() < 0.6) {
                        return lastChoice; // 같은 것
                    } else {
                        return this.getWinningChoice(lastChoice); // 이기는 것
                    }
                }
            } else {
                // 수비자일 때는 이기는 것을 내려고 함
                const lastChoice = this.getLastPlayerChoice();
                if (lastChoice) {
                    return this.getWinningChoice(lastChoice);
                }
            }
        }
        
        return choices[Math.floor(Math.random() * choices.length)];
    }

    // 마지막 플레이어 선택 가져오기
    getLastPlayerChoice() {
        // 구현 필요: 이전 라운드의 플레이어 선택을 추적
        return null;
    }

    // 이기는 선택 반환
    getWinningChoice(choice) {
        const winMap = {
            'rock': 'paper',
            'scissors': 'rock',
            'paper': 'scissors'
        };
        return winMap[choice];
    }

    // 라운드 처리
    processRound() {
        const players = this.gameState.players;
        const choices = this.gameState.choices;
        
        const player1 = players[0];
        const player2 = players[1];
        const choice1 = choices[player1.id];
        const choice2 = choices[player2.id];

        // 승부 결과 계산
        const result = this.determineWinner(choice1, choice2);
        
        let roundResult = {
            round: this.gameState.currentRound,
            choices: {
                [player1.id]: choice1,
                [player2.id]: choice2
            },
            result: result,
            gamePhase: this.gameState.gamePhase
        };

        if (this.gameState.gamePhase === 'rock-paper-scissors') {
            // 첫 번째 가위바위보 단계
            if (result === 'tie') {
                // 비김 - 다시
                roundResult.message = '비겼습니다! 다시 해주세요.';
            } else {
                // 승부 결정 - 묵찌빠 단계로 전환
                const winner = result === 'player1' ? player1 : player2;
                const loser = result === 'player1' ? player2 : player1;
                
                this.gameState.attacker = winner.id;
                this.gameState.defender = loser.id;
                this.gameState.gamePhase = 'mukjjippa';
                
                roundResult.message = `${winner.name}이(가) 공격자가 되었습니다!`;
                roundResult.attacker = winner.id;
                roundResult.defender = loser.id;
            }
        } else {
            // 묵찌빠 단계
            if (result === 'tie') {
                // 비김 - 공격자 승리
                const attackerId = this.gameState.attacker;
                const attacker = players.find(p => p.id === attackerId);
                
                this.gameState.scores[attackerId]++;
                roundResult.message = `${attacker.name} 승리! (비김)`;
                roundResult.winner = attackerId;
                roundResult.scoreUpdate = true;
                
                // 게임 종료 확인
                if (this.gameState.scores[attackerId] >= GAME_CONFIG.maxScore) {
                    this.gameState.status = 'finished';
                    this.gameState.winner = attackerId;
                    roundResult.gameFinished = true;
                } else {
                    // 다음 라운드를 위해 가위바위보로 리셋
                    this.gameState.gamePhase = 'rock-paper-scissors';
                    this.gameState.attacker = null;
                    this.gameState.defender = null;
                }
            } else {
                // 승부 결정
                const winnerId = result === 'player1' ? player1.id : player2.id;
                const winner = players.find(p => p.id === winnerId);
                
                if (winnerId === this.gameState.attacker) {
                    // 공격자 승리 - 점수 획득
                    this.gameState.scores[winnerId]++;
                    roundResult.message = `${winner.name} 승리!`;
                    roundResult.winner = winnerId;
                    roundResult.scoreUpdate = true;
                    
                    // 게임 종료 확인
                    if (this.gameState.scores[winnerId] >= GAME_CONFIG.maxScore) {
                        this.gameState.status = 'finished';
                        this.gameState.winner = winnerId;
                        roundResult.gameFinished = true;
                    } else {
                        // 다음 라운드를 위해 가위바위보로 리셋
                        this.gameState.gamePhase = 'rock-paper-scissors';
                        this.gameState.attacker = null;
                        this.gameState.defender = null;
                    }
                } else {
                    // 수비자 승리 - 공격/수비 역할 교체
                    const oldAttacker = this.gameState.attacker;
                    this.gameState.attacker = winnerId;
                    this.gameState.defender = oldAttacker;
                    
                    roundResult.message = `${winner.name}이(가) 새로운 공격자가 되었습니다!`;
                    roundResult.attacker = winnerId;
                    roundResult.defender = oldAttacker;
                }
            }
        }

        // 라운드 완료 처리
        this.gameState.currentRound++;
        this.gameState.choices = {};
        
        return roundResult;
    }

    // 승부 결과 판정
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
    }

    // 게임 상태 가져오기
    getGameState() {
        return this.gameState;
    }

    // 게임 리셋
    resetGame() {
        this.gameState = null;
        this.playerChoices = {};
        if (this.roundTimer) {
            clearTimeout(this.roundTimer);
            this.roundTimer = null;
        }
    }

    // 플레이어 연결 상태 확인
    checkPlayerConnection(playerId) {
        // 실제 구현에서는 GitHub API를 통해 플레이어 활성 상태를 확인
        return true;
    }

    // 게임 중단 (플레이어 나감)
    handlePlayerDisconnect(playerId) {
        if (this.gameState && this.gameState.status === 'playing') {
            this.gameState.status = 'abandoned';
            this.gameState.disconnectedPlayer = playerId;
            
            // 남은 플레이어를 승자로 설정
            const remainingPlayer = this.gameState.players.find(p => p.id !== playerId);
            if (remainingPlayer) {
                this.gameState.winner = remainingPlayer.id;
            }
        }
    }

    // AI 난이도 설정
    setAIDifficulty(difficulty) {
        this.aiDifficulty = difficulty;
    }
}

// 전역 게임 인스턴스
let mukjjippaGame;

// 게임 초기화
document.addEventListener('DOMContentLoaded', () => {
    mukjjippaGame = new MukjjippaGame();
});

