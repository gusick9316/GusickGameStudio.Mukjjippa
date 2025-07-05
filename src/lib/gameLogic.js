// 묵찌빠 게임 로직

export const MOVES = {
  ROCK: 'rock',      // 묵
  SCISSORS: 'scissors', // 찌
  PAPER: 'paper'     // 빠
};

export const MOVE_NAMES = {
  [MOVES.ROCK]: '묵',
  [MOVES.SCISSORS]: '찌',
  [MOVES.PAPER]: '빠'
};

export const MOVE_EMOJIS = {
  [MOVES.ROCK]: '✊',
  [MOVES.SCISSORS]: '✌️',
  [MOVES.PAPER]: '✋'
};

// 가위바위보 승부 판정
export const determineWinner = (move1, move2) => {
  if (move1 === move2) return 'tie';
  
  if (
    (move1 === MOVES.ROCK && move2 === MOVES.SCISSORS) ||
    (move1 === MOVES.SCISSORS && move2 === MOVES.PAPER) ||
    (move1 === MOVES.PAPER && move2 === MOVES.ROCK)
  ) {
    return 'player1';
  }
  
  return 'player2';
};

// 묵찌빠 게임 상태 관리
export class MukjjipaGame {
  constructor(player1Name, player2Name, isAI = false) {
    this.player1 = { name: player1Name, score: 0 };
    this.player2 = { name: player2Name, score: 0, isAI };
    this.currentAttacker = null; // 현재 공격자 (null이면 가위바위보 단계)
    this.gameHistory = [];
    this.gameState = 'waiting'; // waiting, playing, finished
    this.currentRound = 0;
    this.maxRounds = 5; // 최대 라운드 수
  }

  // 게임 시작
  startGame() {
    this.gameState = 'playing';
    this.currentRound = 1;
    this.currentAttacker = null;
  }

  // AI의 움직임 생성
  generateAIMove() {
    const moves = Object.values(MOVES);
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // 라운드 플레이
  playRound(player1Move, player2Move = null) {
    if (this.gameState !== 'playing') {
      throw new Error('Game is not in playing state');
    }

    // AI 플레이어인 경우 자동으로 움직임 생성
    if (this.player2.isAI && !player2Move) {
      player2Move = this.generateAIMove();
    }

    const roundResult = {
      round: this.currentRound,
      player1Move,
      player2Move,
      timestamp: new Date().toISOString()
    };

    if (this.currentAttacker === null) {
      // 가위바위보 단계
      const winner = determineWinner(player1Move, player2Move);
      
      if (winner === 'tie') {
        roundResult.result = 'tie';
        roundResult.message = '무승부! 다시 가위바위보!';
      } else {
        this.currentAttacker = winner === 'player1' ? 1 : 2;
        roundResult.result = 'attacker_decided';
        roundResult.attacker = this.currentAttacker;
        roundResult.message = `${this.currentAttacker === 1 ? this.player1.name : this.player2.name}이(가) 공격자가 되었습니다!`;
      }
    } else {
      // 묵찌빠 단계
      if (player1Move === player2Move) {
        // 같은 손 모양이면 공격자 승리
        const winner = this.currentAttacker;
        if (winner === 1) {
          this.player1.score++;
          roundResult.result = 'player1_wins';
          roundResult.message = `${this.player1.name} 승리!`;
        } else {
          this.player2.score++;
          roundResult.result = 'player2_wins';
          roundResult.message = `${this.player2.name} 승리!`;
        }
        
        // 라운드 종료, 다음 라운드 준비
        this.currentAttacker = null;
        this.currentRound++;
        
        if (this.currentRound > this.maxRounds) {
          this.gameState = 'finished';
          roundResult.gameFinished = true;
          roundResult.finalWinner = this.getFinalWinner();
        }
      } else {
        // 다른 손 모양이면 공격자 변경
        const winner = determineWinner(player1Move, player2Move);
        this.currentAttacker = winner === 'player1' ? 1 : 2;
        roundResult.result = 'attacker_changed';
        roundResult.attacker = this.currentAttacker;
        roundResult.message = `공격자가 ${this.currentAttacker === 1 ? this.player1.name : this.player2.name}(으)로 바뀌었습니다!`;
      }
    }

    this.gameHistory.push(roundResult);
    return roundResult;
  }

  // 최종 승자 결정
  getFinalWinner() {
    if (this.player1.score > this.player2.score) {
      return { winner: this.player1.name, score: `${this.player1.score} : ${this.player2.score}` };
    } else if (this.player2.score > this.player1.score) {
      return { winner: this.player2.name, score: `${this.player1.score} : ${this.player2.score}` };
    } else {
      return { winner: 'tie', score: `${this.player1.score} : ${this.player2.score}` };
    }
  }

  // 게임 상태 반환
  getGameState() {
    return {
      player1: this.player1,
      player2: this.player2,
      currentAttacker: this.currentAttacker,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      gameState: this.gameState,
      gameHistory: this.gameHistory
    };
  }

  // 게임 리셋
  reset() {
    this.player1.score = 0;
    this.player2.score = 0;
    this.currentAttacker = null;
    this.gameHistory = [];
    this.gameState = 'waiting';
    this.currentRound = 0;
  }
}

// 게임 ID 생성
export const generateGameId = () => {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 사용자 통계 업데이트
export const updateUserStats = (userData, gameResult) => {
  if (!userData.stats) {
    userData.stats = {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesTied: 0,
      totalScore: 0
    };
  }

  userData.stats.gamesPlayed++;
  
  if (gameResult.winner === userData.username) {
    userData.stats.gamesWon++;
  } else if (gameResult.winner === 'tie') {
    userData.stats.gamesTied++;
  } else {
    userData.stats.gamesLost++;
  }

  userData.stats.totalScore += gameResult.userScore || 0;
  userData.lastPlayed = new Date().toISOString();
  
  return userData;
};

