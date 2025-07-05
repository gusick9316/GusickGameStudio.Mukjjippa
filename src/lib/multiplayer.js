// 멀티플레이어 시스템 (로컬 스토리지 기반)

export class MultiplayerManager {
  constructor() {
    this.gameRooms = new Map();
    this.currentRoom = null;
    this.playerId = this.generatePlayerId();
    this.eventListeners = new Map();
    
    // 스토리지 이벤트 리스너 등록
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // 주기적으로 방 상태 확인
    this.roomCheckInterval = setInterval(() => {
      this.checkRoomStatus();
    }, 1000);
  }

  generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateRoomId() {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  // 이벤트 리스너 등록
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  // 이벤트 발생
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => callback(data));
    }
  }

  // 방 생성
  createRoom(playerName) {
    const roomId = this.generateRoomId();
    const room = {
      id: roomId,
      players: [{
        id: this.playerId,
        name: playerName,
        ready: false,
        move: null
      }],
      gameState: 'waiting', // waiting, playing, finished
      currentRound: 0,
      maxRounds: 5,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.saveRoomToStorage(room);
    this.currentRoom = room;
    
    return roomId;
  }

  // 방 참가
  async joinRoom(roomId, playerName) {
    const room = this.loadRoomFromStorage(roomId);
    
    if (!room) {
      throw new Error('방을 찾을 수 없습니다.');
    }

    if (room.players.length >= 2) {
      throw new Error('방이 가득 찼습니다.');
    }

    if (room.gameState !== 'waiting') {
      throw new Error('게임이 이미 진행 중입니다.');
    }

    // 플레이어 추가
    room.players.push({
      id: this.playerId,
      name: playerName,
      ready: false,
      move: null
    });

    room.lastActivity = Date.now();
    this.saveRoomToStorage(room);
    this.currentRoom = room;

    this.emit('playerJoined', { room, playerId: this.playerId });
    return room;
  }

  // 방 목록 가져오기
  getAvailableRooms() {
    const rooms = [];
    const now = Date.now();
    
    // 로컬 스토리지에서 모든 방 검색
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('room_')) {
        try {
          const room = JSON.parse(localStorage.getItem(key));
          
          // 5분 이상 비활성 방은 제외
          if (now - room.lastActivity < 5 * 60 * 1000 && 
              room.gameState === 'waiting' && 
              room.players.length < 2) {
            rooms.push(room);
          }
        } catch (error) {
          console.error('Error parsing room data:', error);
        }
      }
    }
    
    return rooms.sort((a, b) => b.createdAt - a.createdAt);
  }

  // 플레이어 준비 상태 변경
  setPlayerReady(ready = true) {
    if (!this.currentRoom) return;

    const player = this.currentRoom.players.find(p => p.id === this.playerId);
    if (player) {
      player.ready = ready;
      this.currentRoom.lastActivity = Date.now();
      this.saveRoomToStorage(this.currentRoom);
      
      this.emit('playerReadyChanged', { room: this.currentRoom, playerId: this.playerId, ready });
      
      // 모든 플레이어가 준비되면 게임 시작
      if (this.currentRoom.players.length === 2 && this.currentRoom.players.every(p => p.ready)) {
        this.startGame();
      }
    }
  }

  // 게임 시작
  startGame() {
    if (!this.currentRoom || this.currentRoom.players.length !== 2) return;

    this.currentRoom.gameState = 'playing';
    this.currentRoom.currentRound = 1;
    this.currentRoom.gameData = {
      currentAttacker: null,
      scores: { [this.currentRoom.players[0].id]: 0, [this.currentRoom.players[1].id]: 0 },
      history: []
    };
    
    // 플레이어 움직임 초기화
    this.currentRoom.players.forEach(player => {
      player.move = null;
    });

    this.currentRoom.lastActivity = Date.now();
    this.saveRoomToStorage(this.currentRoom);
    
    this.emit('gameStarted', { room: this.currentRoom });
  }

  // 움직임 제출
  submitMove(move) {
    if (!this.currentRoom || this.currentRoom.gameState !== 'playing') return;

    const player = this.currentRoom.players.find(p => p.id === this.playerId);
    if (player) {
      player.move = move;
      this.currentRoom.lastActivity = Date.now();
      this.saveRoomToStorage(this.currentRoom);
      
      this.emit('moveSubmitted', { room: this.currentRoom, playerId: this.playerId, move });
      
      // 모든 플레이어가 움직임을 제출했으면 라운드 처리
      if (this.currentRoom.players.every(p => p.move !== null)) {
        this.processRound();
      }
    }
  }

  // 라운드 처리
  processRound() {
    if (!this.currentRoom) return;

    const [player1, player2] = this.currentRoom.players;
    const move1 = player1.move;
    const move2 = player2.move;

    // 게임 로직 적용 (기존 MukjjipaGame 로직 사용)
    const roundResult = this.calculateRoundResult(move1, move2, player1, player2);
    
    this.currentRoom.gameData.history.push(roundResult);
    
    // 플레이어 움직임 초기화
    this.currentRoom.players.forEach(player => {
      player.move = null;
    });

    this.currentRoom.lastActivity = Date.now();
    this.saveRoomToStorage(this.currentRoom);
    
    this.emit('roundCompleted', { room: this.currentRoom, result: roundResult });

    // 게임 종료 확인
    if (roundResult.gameFinished) {
      this.endGame();
    }
  }

  // 라운드 결과 계산
  calculateRoundResult(move1, move2, player1, player2) {
    const result = {
      round: this.currentRoom.currentRound,
      player1: { id: player1.id, name: player1.name, move: move1 },
      player2: { id: player2.id, name: player2.name, move: move2 },
      timestamp: new Date().toISOString()
    };

    if (this.currentRoom.gameData.currentAttacker === null) {
      // 가위바위보 단계
      if (move1 === move2) {
        result.result = 'tie';
        result.message = '무승부! 다시 가위바위보!';
      } else {
        const winner = this.determineWinner(move1, move2);
        this.currentRoom.gameData.currentAttacker = winner === 'player1' ? player1.id : player2.id;
        result.result = 'attacker_decided';
        result.attacker = this.currentRoom.gameData.currentAttacker;
        result.message = `${winner === 'player1' ? player1.name : player2.name}이(가) 공격자가 되었습니다!`;
      }
    } else {
      // 묵찌빠 단계
      if (move1 === move2) {
        // 같은 손 모양이면 공격자 승리
        const winnerId = this.currentRoom.gameData.currentAttacker;
        this.currentRoom.gameData.scores[winnerId]++;
        
        result.result = winnerId === player1.id ? 'player1_wins' : 'player2_wins';
        result.winner = winnerId;
        result.message = `${winnerId === player1.id ? player1.name : player2.name} 승리!`;
        
        // 라운드 종료, 다음 라운드 준비
        this.currentRoom.gameData.currentAttacker = null;
        this.currentRoom.currentRound++;
        
        if (this.currentRoom.currentRound > this.currentRoom.maxRounds) {
          result.gameFinished = true;
          result.finalWinner = this.getFinalWinner();
        }
      } else {
        // 다른 손 모양이면 공격자 변경
        const winner = this.determineWinner(move1, move2);
        this.currentRoom.gameData.currentAttacker = winner === 'player1' ? player1.id : player2.id;
        result.result = 'attacker_changed';
        result.attacker = this.currentRoom.gameData.currentAttacker;
        result.message = `공격자가 ${this.currentRoom.gameData.currentAttacker === player1.id ? player1.name : player2.name}(으)로 바뀌었습니다!`;
      }
    }

    return result;
  }

  // 승자 결정 (가위바위보)
  determineWinner(move1, move2) {
    if (move1 === move2) return 'tie';
    
    if (
      (move1 === 'rock' && move2 === 'scissors') ||
      (move1 === 'scissors' && move2 === 'paper') ||
      (move1 === 'paper' && move2 === 'rock')
    ) {
      return 'player1';
    }
    
    return 'player2';
  }

  // 최종 승자 결정
  getFinalWinner() {
    const scores = this.currentRoom.gameData.scores;
    const [player1, player2] = this.currentRoom.players;
    
    if (scores[player1.id] > scores[player2.id]) {
      return { winner: player1.name, winnerId: player1.id, score: `${scores[player1.id]} : ${scores[player2.id]}` };
    } else if (scores[player2.id] > scores[player1.id]) {
      return { winner: player2.name, winnerId: player2.id, score: `${scores[player1.id]} : ${scores[player2.id]}` };
    } else {
      return { winner: 'tie', winnerId: null, score: `${scores[player1.id]} : ${scores[player2.id]}` };
    }
  }

  // 게임 종료
  endGame() {
    if (!this.currentRoom) return;

    this.currentRoom.gameState = 'finished';
    this.currentRoom.lastActivity = Date.now();
    this.saveRoomToStorage(this.currentRoom);
    
    this.emit('gameEnded', { room: this.currentRoom });
  }

  // 방 나가기
  leaveRoom() {
    if (!this.currentRoom) return;

    // 플레이어 제거
    this.currentRoom.players = this.currentRoom.players.filter(p => p.id !== this.playerId);
    
    if (this.currentRoom.players.length === 0) {
      // 방이 비어있으면 삭제
      localStorage.removeItem(`room_${this.currentRoom.id}`);
    } else {
      this.currentRoom.lastActivity = Date.now();
      this.saveRoomToStorage(this.currentRoom);
    }

    this.emit('playerLeft', { roomId: this.currentRoom.id, playerId: this.playerId });
    this.currentRoom = null;
  }

  // 스토리지에 방 저장
  saveRoomToStorage(room) {
    localStorage.setItem(`room_${room.id}`, JSON.stringify(room));
  }

  // 스토리지에서 방 로드
  loadRoomFromStorage(roomId) {
    try {
      const data = localStorage.getItem(`room_${roomId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading room from storage:', error);
      return null;
    }
  }

  // 스토리지 변경 이벤트 처리
  handleStorageChange(event) {
    if (!this.currentRoom || !event.key || !event.key.startsWith('room_')) return;

    const roomId = event.key.replace('room_', '');
    if (roomId === this.currentRoom.id) {
      // 현재 방 데이터 업데이트
      const updatedRoom = this.loadRoomFromStorage(roomId);
      if (updatedRoom) {
        this.currentRoom = updatedRoom;
        this.emit('roomUpdated', { room: updatedRoom });
      }
    }
  }

  // 방 상태 확인
  checkRoomStatus() {
    if (!this.currentRoom) return;

    const updatedRoom = this.loadRoomFromStorage(this.currentRoom.id);
    if (!updatedRoom) {
      // 방이 삭제됨
      this.emit('roomDeleted', { roomId: this.currentRoom.id });
      this.currentRoom = null;
      return;
    }

    // 방 데이터 업데이트
    if (JSON.stringify(updatedRoom) !== JSON.stringify(this.currentRoom)) {
      this.currentRoom = updatedRoom;
      this.emit('roomUpdated', { room: updatedRoom });
    }
  }

  // 정리
  destroy() {
    if (this.roomCheckInterval) {
      clearInterval(this.roomCheckInterval);
    }
    
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
    
    if (this.currentRoom) {
      this.leaveRoom();
    }
  }
}

