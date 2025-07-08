// GitHub API 통신 관리 시스템
class GitHubAPI {
    constructor() {
        this.config = GITHUB_CONFIG;
        this.baseUrl = `${this.config.apiUrl}/repos/${this.config.username}/${this.config.repository}/contents`;
        this.headers = {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        this.pollingInterval = null;
        this.lastUpdateTime = null;
    }

    // 파일 읽기
    async readFile(path) {
        try {
            const response = await fetch(`${this.baseUrl}/${path}`, {
                method: 'GET',
                headers: this.headers
            });

            if (response.status === 404) {
                return null; // 파일이 존재하지 않음
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const content = atob(data.content.replace(/\s/g, ''));
            return {
                content: JSON.parse(content),
                sha: data.sha
            };
        } catch (error) {
            console.error('파일 읽기 오류:', error);
            return null;
        }
    }

    // 파일 쓰기/업데이트
    async writeFile(path, content, sha = null) {
        try {
            const encodedContent = btoa(JSON.stringify(content, null, 2));
            
            const body = {
                message: `Update ${path}`,
                content: encodedContent,
                branch: this.config.branch
            };

            if (sha) {
                body.sha = sha;
            }

            const response = await fetch(`${this.baseUrl}/${path}`, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('파일 쓰기 오류:', error);
            throw error;
        }
    }

    // 파일 삭제
    async deleteFile(path, sha) {
        try {
            const response = await fetch(`${this.baseUrl}/${path}`, {
                method: 'DELETE',
                headers: this.headers,
                body: JSON.stringify({
                    message: `Delete ${path}`,
                    sha: sha,
                    branch: this.config.branch
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('파일 삭제 오류:', error);
            throw error;
        }
    }

    // 게임 상태 저장
    async saveGameState(gameId, gameData) {
        const path = `games/${gameId}.json`;
        const existingFile = await this.readFile(path);
        const sha = existingFile ? existingFile.sha : null;
        
        const gameState = {
            ...gameData,
            lastUpdate: getCurrentTimestamp()
        };

        return await this.writeFile(path, gameState, sha);
    }

    // 게임 상태 로드
    async loadGameState(gameId) {
        const path = `games/${gameId}.json`;
        const result = await this.readFile(path);
        return result ? result.content : null;
    }

    // 플레이어 목록 저장
    async savePlayerList(players) {
        const path = 'players.json';
        const existingFile = await this.readFile(path);
        const sha = existingFile ? existingFile.sha : null;
        
        const playerData = {
            players: players,
            lastUpdate: getCurrentTimestamp()
        };

        return await this.writeFile(path, playerData, sha);
    }

    // 플레이어 목록 로드
    async loadPlayerList() {
        const path = 'players.json';
        const result = await this.readFile(path);
        return result ? result.content.players : [];
    }

    // 게임 목록 저장
    async saveGameList(games) {
        const path = 'games.json';
        const existingFile = await this.readFile(path);
        const sha = existingFile ? existingFile.sha : null;
        
        const gameData = {
            games: games,
            lastUpdate: getCurrentTimestamp()
        };

        return await this.writeFile(path, gameData, sha);
    }

    // 게임 목록 로드
    async loadGameList() {
        const path = 'games.json';
        const result = await this.readFile(path);
        return result ? result.content.games : [];
    }

    // 실시간 폴링 시작
    startPolling(gameId, callback, interval = 2000) {
        this.stopPolling();
        
        this.pollingInterval = setInterval(async () => {
            try {
                const gameState = await this.loadGameState(gameId);
                if (gameState && gameState.lastUpdate !== this.lastUpdateTime) {
                    this.lastUpdateTime = gameState.lastUpdate;
                    callback(gameState);
                }
            } catch (error) {
                console.error('폴링 오류:', error);
            }
        }, interval);
    }

    // 폴링 중지
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // 연결 테스트
    async testConnection() {
        try {
            const response = await fetch(`${this.config.apiUrl}/user`, {
                headers: this.headers
            });
            return response.ok;
        } catch (error) {
            console.error('연결 테스트 실패:', error);
            return false;
        }
    }

    // 저장소 확인
    async checkRepository() {
        try {
            const response = await fetch(`${this.config.apiUrl}/repos/${this.config.username}/${this.config.repository}`, {
                headers: this.headers
            });
            return response.ok;
        } catch (error) {
            console.error('저장소 확인 실패:', error);
            return false;
        }
    }
}

// 게임 매칭 시스템
class GameMatchmaking {
    constructor(githubAPI) {
        this.api = githubAPI;
        this.currentGameId = null;
        this.isSearching = false;
    }

    // 게임 참여 (매칭)
    async joinGame(playerName, playerId) {
        try {
            this.isSearching = true;
            
            // 기존 게임 목록 확인
            const games = await this.api.loadGameList();
            
            // 대기 중인 게임 찾기
            let availableGame = games.find(game => 
                game.status === 'waiting' && 
                game.players.length < GAME_CONFIG.maxPlayers &&
                !game.players.some(p => p.id === playerId)
            );

            if (availableGame) {
                // 기존 게임에 참여
                availableGame.players.push({
                    id: playerId,
                    name: playerName,
                    joinTime: getCurrentTimestamp()
                });

                if (availableGame.players.length === GAME_CONFIG.maxPlayers) {
                    availableGame.status = 'ready';
                }

                await this.api.saveGameList(games);
                this.currentGameId = availableGame.id;
                return availableGame;
            } else {
                // 새 게임 생성
                const newGame = {
                    id: generateId(),
                    status: 'waiting',
                    players: [{
                        id: playerId,
                        name: playerName,
                        joinTime: getCurrentTimestamp()
                    }],
                    createdAt: getCurrentTimestamp(),
                    host: playerId
                };

                games.push(newGame);
                await this.api.saveGameList(games);
                this.currentGameId = newGame.id;
                return newGame;
            }
        } catch (error) {
            console.error('게임 참여 오류:', error);
            throw error;
        } finally {
            this.isSearching = false;
        }
    }

    // 게임 나가기
    async leaveGame(playerId) {
        if (!this.currentGameId) return;

        try {
            const games = await this.api.loadGameList();
            const gameIndex = games.findIndex(game => game.id === this.currentGameId);
            
            if (gameIndex !== -1) {
                const game = games[gameIndex];
                game.players = game.players.filter(p => p.id !== playerId);
                
                if (game.players.length === 0) {
                    // 게임 삭제
                    games.splice(gameIndex, 1);
                } else {
                    // 호스트 변경
                    if (game.host === playerId && game.players.length > 0) {
                        game.host = game.players[0].id;
                    }
                    game.status = 'waiting';
                }

                await this.api.saveGameList(games);
            }

            this.currentGameId = null;
        } catch (error) {
            console.error('게임 나가기 오류:', error);
            throw error;
        }
    }

    // 게임 시작
    async startGame(gameId, hostId) {
        try {
            const games = await this.api.loadGameList();
            const game = games.find(g => g.id === gameId);
            
            if (!game || game.host !== hostId || game.players.length < 2) {
                throw new Error('게임을 시작할 수 없습니다.');
            }

            game.status = 'playing';
            game.startedAt = getCurrentTimestamp();
            
            // 초기 게임 상태 생성
            const initialGameState = {
                gameId: gameId,
                players: game.players,
                scores: { [game.players[0].id]: 0, [game.players[1].id]: 0 },
                currentRound: 1,
                gamePhase: 'rock-paper-scissors',
                attacker: null,
                defender: null,
                choices: {},
                status: 'playing',
                lastUpdate: getCurrentTimestamp()
            };

            await this.api.saveGameList(games);
            await this.api.saveGameState(gameId, initialGameState);
            
            return initialGameState;
        } catch (error) {
            console.error('게임 시작 오류:', error);
            throw error;
        }
    }

    // 게임 상태 폴링 시작
    startGamePolling(gameId, callback) {
        this.api.startPolling(gameId, callback);
    }

    // 폴링 중지
    stopPolling() {
        this.api.stopPolling();
    }
}

// 전역 인스턴스
let githubAPI;
let gameMatchmaking;

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    githubAPI = new GitHubAPI();
    gameMatchmaking = new GameMatchmaking(githubAPI);
});

