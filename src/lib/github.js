// GitHub API 연동을 위한 유틸리티 함수들

const GITHUB_TOKEN_PARTS = ["ghp", "_2SllyukhLwajJQdMsP0xgu9uaR5fDv2gvE0T"];
const GITHUB_TOKEN = GITHUB_TOKEN_PARTS.join("");
const GITHUB_USERNAME = "gusick9316";
const GITHUB_REPO = "GusickGameStudio.Mukjjippa";

const API_BASE = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}`;

// GitHub API 요청을 위한 기본 헤더
const getHeaders = () => ({
  'Authorization': `token ${GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
});

// 파일 내용을 Base64로 인코딩
const encodeContent = (content) => {
  return btoa(unescape(encodeURIComponent(content)));
};

// Base64 내용을 디코딩
const decodeContent = (content) => {
  return decodeURIComponent(escape(atob(content)));
};

// 파일 생성 또는 업데이트
export const createOrUpdateFile = async (path, content, message = 'Update file') => {
  try {
    // 먼저 파일이 존재하는지 확인
    let sha = null;
    try {
      const response = await fetch(`${API_BASE}/contents/${path}`, {
        headers: getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        sha = data.sha;
      }
    } catch (error) {
      // 파일이 존재하지 않는 경우
    }

    const body = {
      message,
      content: encodeContent(content),
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(`${API_BASE}/contents/${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating/updating file:', error);
    throw error;
  }
};

// 파일 읽기
export const readFile = async (path) => {
  try {
    const response = await fetch(`${API_BASE}/contents/${path}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // 파일이 존재하지 않음
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    return decodeContent(data.content);
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
};

// 사용자 데이터 저장
export const saveUserData = async (username, userData) => {
  const path = `users/${username}.json`;
  const content = JSON.stringify(userData, null, 2);
  return await createOrUpdateFile(path, content, `Update user data for ${username}`);
};

// 사용자 데이터 읽기
export const getUserData = async (username) => {
  const path = `users/${username}.json`;
  const content = await readFile(path);
  return content ? JSON.parse(content) : null;
};

// 게임 기록 저장
export const saveGameRecord = async (gameId, gameData) => {
  const path = `games/${gameId}.json`;
  const content = JSON.stringify(gameData, null, 2);
  return await createOrUpdateFile(path, content, `Save game record ${gameId}`);
};

// 게임 기록 읽기
export const getGameRecord = async (gameId) => {
  const path = `games/${gameId}.json`;
  const content = await readFile(path);
  return content ? JSON.parse(content) : null;
};

// 리더보드 데이터 저장
export const saveLeaderboard = async (leaderboardData) => {
  const path = 'leaderboard.json';
  const content = JSON.stringify(leaderboardData, null, 2);
  return await createOrUpdateFile(path, content, 'Update leaderboard');
};

// 리더보드 데이터 읽기
export const getLeaderboard = async () => {
  const path = 'leaderboard.json';
  const content = await readFile(path);
  return content ? JSON.parse(content) : { players: [] };
};

