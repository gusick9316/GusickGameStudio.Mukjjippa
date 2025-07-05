// 로컬 스토리지를 사용한 임시 데이터 저장 시스템 (개발용)

// 사용자 데이터 저장
export const saveUserData = async (username, userData) => {
  try {
    localStorage.setItem(`user_${username}`, JSON.stringify(userData));
    return { success: true };
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

// 사용자 데이터 읽기
export const getUserData = async (username) => {
  try {
    const data = localStorage.getItem(`user_${username}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading user data:', error);
    throw error;
  }
};

// 게임 기록 저장
export const saveGameRecord = async (gameId, gameData) => {
  try {
    localStorage.setItem(`game_${gameId}`, JSON.stringify(gameData));
    return { success: true };
  } catch (error) {
    console.error('Error saving game record:', error);
    throw error;
  }
};

// 게임 기록 읽기
export const getGameRecord = async (gameId) => {
  try {
    const data = localStorage.getItem(`game_${gameId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading game record:', error);
    throw error;
  }
};

// 리더보드 데이터 저장
export const saveLeaderboard = async (leaderboardData) => {
  try {
    localStorage.setItem('leaderboard', JSON.stringify(leaderboardData));
    return { success: true };
  } catch (error) {
    console.error('Error saving leaderboard:', error);
    throw error;
  }
};

// 리더보드 데이터 읽기
export const getLeaderboard = async () => {
  try {
    const data = localStorage.getItem('leaderboard');
    return data ? JSON.parse(data) : { players: [] };
  } catch (error) {
    console.error('Error reading leaderboard:', error);
    return { players: [] };
  }
};

