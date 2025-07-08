// GitHub 설정
const GITHUB_CONFIG = {
    username: 'gusick9316',
    repository: 'GusickGameStudio.Mukjjippa',
    token: 'ghp' + '_2SllyukhLwajJQdMsP0xgu9uaR5fDv2gvE0T',
    apiUrl: 'https://api.github.com',
    branch: 'main'
};

// 게임 설정
const GAME_CONFIG = {
    maxScore: 5,
    maxPlayers: 2,
    roundResultDisplayTime: 5000, // 5초
    loadingSteps: [
        '인터넷 확인중...',
        '게임 불러오는중...',
        '게임 입장중...'
    ],
    choices: {
        rock: { emoji: '✊', text: '묵', beats: 'scissors' },
        scissors: { emoji: '✌️', text: '찌', beats: 'paper' },
        paper: { emoji: '✋', text: '빠', beats: 'rock' }
    }
};

// 오디오 파일 설정
const AUDIO_CONFIG = {
    background: 'audio/배경음악.mp3',
    touch: 'audio/터치효과음.mp3',
    victory: [
        'audio/승리1.mp3',
        'audio/승리2.mp3',
        'audio/승리3.mp3',
        'audio/승리4.mp3',
        'audio/승리5.mp3'
    ],
    defeat: [
        'audio/패배1.mp3',
        'audio/패배2.mp3',
        'audio/패배3.mp3',
        'audio/패배4.mp3',
        'audio/패배5.mp3',
        'audio/패배6.mp3',
        'audio/패배7.mp3',
        'audio/패배8.mp3'
    ],
    gameVictory: 'audio/게임승리.mp3',
    gameDefeat: 'audio/게임패배.mp3'
};

// 게임 상태
let gameState = {
    currentScreen: 'loading',
    playerName: '',
    playerId: '',
    gameId: '',
    isHost: false,
    players: [],
    scores: { player1: 0, player2: 0 },
    currentRound: 1,
    gamePhase: 'rock-paper-scissors', // 'rock-paper-scissors' 또는 'mukjjippa'
    attacker: null,
    defender: null,
    playerChoices: {},
    isAIMode: false,
    gameStarted: false,
    roundInProgress: false
};

// 유틸리티 함수
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function getCurrentTimestamp() {
    return new Date().toISOString();
}

