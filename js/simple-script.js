// 간단한 게임 스크립트

// 전역 변수
let currentScreen = 'loading';
let playerNickname = '';
let gameData = null;

// 화면 전환 함수
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenId;
    }
}

// 로딩 시뮬레이션
async function simulateLoading() {
    const loadingFill = document.querySelector('.loading-fill');
    const loadingText = document.querySelector('.loading-text');
    
    if (!loadingFill || !loadingText) return;
    
    const steps = [
        { text: '인터넷 확인중...', progress: 33 },
        { text: '게임 불러오는중...', progress: 66 },
        { text: '게임 입장중...', progress: 100 }
    ];
    
    for (let i = 0; i < steps.length; i++) {
        loadingText.textContent = steps[i].text;
        loadingFill.style.width = steps[i].progress + '%';
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    showScreen('nickname-screen');
}

// 닉네임 설정
function setupNickname() {
    const nicknameInput = document.getElementById('nickname-input');
    const confirmBtn = document.getElementById('nickname-confirm');
    
    if (!nicknameInput || !confirmBtn) return;
    
    confirmBtn.addEventListener('click', () => {
        const nickname = nicknameInput.value.trim();
        if (nickname.length < 2) {
            alert('닉네임은 2글자 이상 입력해주세요.');
            return;
        }
        
        playerNickname = nickname;
        showScreen('main-screen');
    });
    
    nicknameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        }
    });
}

// 메인 화면 설정
function setupMainScreen() {
    const joinBtn = document.getElementById('join-game-btn');
    const aiBtn = document.getElementById('ai-game-btn');
    
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            showScreen('waiting-screen');
            // 임시로 플레이어 목록 업데이트
            updatePlayersList([{nickname: playerNickname}]);
        });
    }
    
    if (aiBtn) {
        aiBtn.addEventListener('click', () => {
            alert('AI 모드는 준비 중입니다!');
        });
    }
}

// 플레이어 목록 업데이트
function updatePlayersList(players) {
    const container = document.getElementById('players-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        playerDiv.innerHTML = `
            <div class="player-status"></div>
            <span>${player.nickname}</span>
        `;
        container.appendChild(playerDiv);
    });
}

// 대기실 설정
function setupWaitingScreen() {
    const startBtn = document.getElementById('start-game-btn');
    const leaveBtn = document.getElementById('leave-waiting-btn');
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // 임시로 게임 화면으로 이동
            showGameScreen();
        });
    }
    
    if (leaveBtn) {
        leaveBtn.addEventListener('click', () => {
            showScreen('main-screen');
        });
    }
}

// 게임 화면 표시
function showGameScreen() {
    showScreen('game-screen');
    
    // 임시 데이터로 화면 업데이트
    const player1Name = document.getElementById('player1-name');
    const player2Name = document.getElementById('player2-name');
    
    if (player1Name) player1Name.textContent = playerNickname;
    if (player2Name) player2Name.textContent = 'Player 2';
    
    startRoundTimer();
}

// 라운드 타이머 시작
function startRoundTimer() {
    let timeLeft = 15;
    const timerElement = document.getElementById('timer');
    
    const timer = setInterval(() => {
        if (timerElement) timerElement.textContent = timeLeft;
        timeLeft--;
        
        if (timeLeft < 0) {
            clearInterval(timer);
            // 시간 초과 시 라운드 결과 표시
            showRoundResult();
        }
    }, 1000);
}

// 라운드 결과 표시
function showRoundResult() {
    showScreen('round-result-screen');
    
    // 임시 결과 데이터
    const resultPlayer1Name = document.getElementById('result-player1-name');
    const resultPlayer2Name = document.getElementById('result-player2-name');
    const resultPlayer1Choice = document.getElementById('result-player1-choice');
    const resultPlayer2Choice = document.getElementById('result-player2-choice');
    const roundWinner = document.getElementById('round-winner');
    
    if (resultPlayer1Name) resultPlayer1Name.textContent = playerNickname;
    if (resultPlayer2Name) resultPlayer2Name.textContent = 'Player 2';
    if (resultPlayer1Choice) resultPlayer1Choice.textContent = '✊';
    if (resultPlayer2Choice) resultPlayer2Choice.textContent = '✌️';
    if (roundWinner) roundWinner.textContent = `${playerNickname} 승리!`;
    
    // 5초 후 게임 화면으로 돌아가기
    setTimeout(() => {
        showGameScreen();
    }, 5000);
}

// 게임 화면 설정
function setupGameScreen() {
    const choiceButtons = document.querySelectorAll('.choice-btn');
    
    choiceButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const choice = btn.dataset.choice;
            console.log('Choice made:', choice);
            // 선택 후 라운드 결과 표시
            setTimeout(() => {
                showRoundResult();
            }, 1000);
        });
    });
}

// 최종 결과 화면 설정
function setupFinalResultScreen() {
    const returnBtn = document.getElementById('return-main-btn');
    
    if (returnBtn) {
        returnBtn.addEventListener('click', () => {
            showScreen('main-screen');
        });
    }
}

// 터치 사운드 이벤트 추가
function addTouchSounds() {
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            console.log('Button clicked');
        }
    });
}

// 초기화
async function init() {
    console.log('Initializing game...');
    
    // 이벤트 리스너 설정
    setupNickname();
    setupMainScreen();
    setupWaitingScreen();
    setupGameScreen();
    setupFinalResultScreen();
    addTouchSounds();
    
    // 로딩 시작
    await simulateLoading();
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);

