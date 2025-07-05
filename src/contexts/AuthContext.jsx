import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserData, saveUserData } from '../lib/localStorage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 확인
    const savedUser = localStorage.getItem('mukjjippa_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);
      
      // GitHub에서 사용자 데이터 확인
      const userData = await getUserData(username);
      
      if (userData && userData.password === password) {
        // 로그인 성공
        const userInfo = {
          username: userData.username,
          email: userData.email,
          joinDate: userData.joinDate,
          stats: userData.stats || {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            gamesTied: 0,
            totalScore: 0
          }
        };
        
        setUser(userInfo);
        localStorage.setItem('mukjjippa_user', JSON.stringify(userInfo));
        
        // 마지막 로그인 시간 업데이트
        userData.lastLogin = new Date().toISOString();
        await saveUserData(username, userData);
        
        return { success: true };
      } else {
        return { success: false, error: '사용자명 또는 비밀번호가 올바르지 않습니다.' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '로그인 중 오류가 발생했습니다.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    try {
      setLoading(true);
      
      // 사용자명 중복 확인
      const existingUser = await getUserData(username);
      if (existingUser) {
        return { success: false, error: '이미 존재하는 사용자명입니다.' };
      }
      
      // 새 사용자 데이터 생성
      const userData = {
        username,
        email,
        password, // 실제 서비스에서는 해시화해야 함
        joinDate: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          gamesTied: 0,
          totalScore: 0
        }
      };
      
      // GitHub에 사용자 데이터 저장
      await saveUserData(username, userData);
      
      // 자동 로그인
      const userInfo = {
        username: userData.username,
        email: userData.email,
        joinDate: userData.joinDate,
        stats: userData.stats
      };
      
      setUser(userInfo);
      localStorage.setItem('mukjjippa_user', JSON.stringify(userInfo));
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: '회원가입 중 오류가 발생했습니다.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mukjjippa_user');
  };

  const updateUserStats = async (newStats) => {
    if (!user) return;
    
    try {
      // GitHub에서 전체 사용자 데이터 가져오기
      const userData = await getUserData(user.username);
      if (userData) {
        userData.stats = newStats;
        await saveUserData(user.username, userData);
        
        // 로컬 상태 업데이트
        const updatedUser = { ...user, stats: newStats };
        setUser(updatedUser);
        localStorage.setItem('mukjjippa_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUserStats
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

