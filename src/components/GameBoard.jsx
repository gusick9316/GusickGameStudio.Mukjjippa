import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { MukjjipaGame, MOVES, MOVE_NAMES, MOVE_EMOJIS } from '../lib/gameLogic';
import { useAuth } from '../contexts/AuthContext';
import { playSound, toggleMute, setVolume, getAudioSettings } from '../lib/audioManager';
import MultiplayerGame from './MultiplayerGame';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Bot, RotateCcw, LogOut, Volume2, VolumeX } from 'lucide-react';

const GameBoard = () => {
  const { user, logout, updateUserStats } = useAuth();
  const [game, setGame] = useState(null);
  const [selectedMove, setSelectedMove] = useState(null);
  const [gameMode, setGameMode] = useState(null); // 'ai', 'multiplayer', or null
  const [isWaiting, setIsWaiting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [audioSettings, setAudioSettings] = useState(getAudioSettings());

  const startNewGame = (mode) => {
    const opponentName = mode === 'ai' ? 'AI' : '상대방';
    const newGame = new MukjjipaGame(user.username, opponentName, mode === 'ai');
    setGame(newGame);
    setGameMode(mode);
    setSelectedMove(null);
    setLastResult(null);
    setShowResult(false);
    
    // 게임 시작 사운드 재생
    playSound('game-start');
  };

  const playMove = async (move) => {
    if (!game || isWaiting) return;
    
    // 움직임 선택 사운드 재생
    playSound('move-select');
    
    setSelectedMove(move);
    setIsWaiting(true); 
    try {
      const result = await new Promise(resolve => {
        setTimeout(() => {
          const gameResult = game.playRound(move);
          resolve(gameResult);
        }, 1000); // 1초 딜레이로 긴장감 조성
      });
      
      setLastResult(result);
      setShowResult(true);
      
      // 결과에 따른 사운드 재생
      if (result.gameFinished) {
        const finalResult = game.getFinalWinner();
        if (finalResult.winner === user.username) {
          playSound('victory');
        } else {
          playSound('game-over');
        }
      } else {
        playSound('round-complete');
      }
      
      // 게임이 끝났다면 통계 업데이트
      if (result.gameFinished) {
        const finalResult = game.getFinalWinner();
        const newStats = { ...user.stats };
        newStats.gamesPlayed++;
        
        if (finalResult.winner === user.username) {
          newStats.gamesWon++;
        } else if (finalResult.winner === 'tie') {
          newStats.gamesTied++;
        } else {
          newStats.gamesLost++;
        }
        
        newStats.totalScore += game.player1.score;
        await updateUserStats(newStats);
      }
      
      // 결과 표시 후 자동으로 숨기기
      setTimeout(() => {
        setShowResult(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error playing move:', error);
    } finally {
      setIsWaiting(false);
      setSelectedMove(null);
    }
  };

  const resetGame = () => {
    setGame(null);
    setGameMode(null);
    setSelectedMove(null);
    setLastResult(null);
    setShowResult(false);
  };

  // 멀티플레이어 모드
  if (gameMode === 'multiplayer') {
    return <MultiplayerGame onBack={() => setGameMode(null)} />;
  }

  if (!gameMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">🎮 묵찌빠 게임</h1>
              <p className="text-gray-600">안녕하세요, {user.username}님!</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newMuted = toggleMute();
                  setAudioSettings(prev => ({ ...prev, isMuted: newMuted }));
                  playSound('button-click');
                }}
              >
                {audioSettings.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button variant="outline" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            </div>
          </div>

          {/* 사용자 통계 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5" />
                내 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{user.stats.gamesPlayed}</div>
                  <div className="text-sm text-gray-600">총 게임</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{user.stats.gamesWon}</div>
                  <div className="text-sm text-gray-600">승리</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{user.stats.gamesLost}</div>
                  <div className="text-sm text-gray-600">패배</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{user.stats.gamesTied}</div>
                  <div className="text-sm text-gray-600">무승부</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 게임 모드 선택 */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
                playSound('button-click');
                startNewGame('ai');
              }}>
                <CardHeader className="text-center">
                  <Bot className="mx-auto h-12 w-12 text-blue-500 mb-2" />
                  <CardTitle>AI와 대전</CardTitle>
                  <CardDescription>컴퓨터와 묵찌빠 게임을 즐겨보세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">게임 시작</Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
                playSound('button-click');
                setGameMode('multiplayer');
              }}>
                <CardHeader className="text-center">
                  <Users className="mx-auto h-12 w-12 text-green-500 mb-2" />
                  <CardTitle>멀티플레이어</CardTitle>
                  <CardDescription>다른 플레이어와 실시간 대전</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">게임 시작</Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 게임 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {gameMode === 'ai' ? '🤖 AI 대전' : '👥 멀티플레이어'}
            </h1>
            <p className="text-gray-600">라운드 {game?.currentRound || 1} / {game?.maxRounds || 5}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetGame}>
              <RotateCcw className="mr-2 h-4 w-4" />
              새 게임
            </Button>
            <Button variant="outline" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </div>

        {/* 게임 진행 상황 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="text-center">
                <div className="text-lg font-semibold">{game?.player1.name}</div>
                <div className="text-2xl font-bold text-blue-600">{game?.player1.score}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">VS</div>
                <Progress value={(game?.currentRound - 1) / game?.maxRounds * 100} className="w-32 mx-auto" />
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{game?.player2.name}</div>
                <div className="text-2xl font-bold text-red-600">{game?.player2.score}</div>
              </div>
            </div>
            
            {game?.currentAttacker && (
              <div className="text-center">
                <Badge variant="secondary">
                  현재 공격자: {game.currentAttacker === 1 ? game.player1.name : game.player2.name}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 게임 결과 표시 */}
        <AnimatePresence>
          {showResult && lastResult && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="mb-6"
            >
              <Card className="border-2 border-yellow-400 bg-yellow-50">
                <CardContent className="pt-6 text-center">
                  <div className="text-lg font-semibold mb-2">{lastResult.message}</div>
                  <div className="flex justify-center gap-8 text-4xl">
                    <div>
                      <div>{MOVE_EMOJIS[lastResult.player1Move]}</div>
                      <div className="text-sm text-gray-600">{game?.player1.name}</div>
                    </div>
                    <div className="self-center text-2xl">VS</div>
                    <div>
                      <div>{MOVE_EMOJIS[lastResult.player2Move]}</div>
                      <div className="text-sm text-gray-600">{game?.player2.name}</div>
                    </div>
                  </div>
                  
                  {lastResult.gameFinished && (
                    <div className="mt-4 p-4 bg-white rounded-lg">
                      <div className="text-xl font-bold text-green-600">🎉 게임 종료!</div>
                      <div className="text-lg">
                        최종 승자: {lastResult.finalWinner.winner === 'tie' ? '무승부' : lastResult.finalWinner.winner}
                      </div>
                      <div className="text-sm text-gray-600">
                        최종 점수: {lastResult.finalWinner.score}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 게임이 끝나지 않았을 때만 조작 버튼 표시 */}
        {game?.gameState === 'playing' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {game.currentAttacker === null ? '가위바위보!' : '묵찌빠!'}
              </CardTitle>
              <CardDescription className="text-center">
                {game.currentAttacker === null 
                  ? '가위바위보로 공격자를 정하세요' 
                  : '같은 모양을 내면 공격자가 승리합니다'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(MOVES).map(([key, move]) => (
                  <motion.div
                    key={move}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant={selectedMove === move ? "default" : "outline"}
                      size="lg"
                      className="w-full h-24 text-4xl"
                      onClick={() => playMove(move)}
                      disabled={isWaiting}
                    >
                      <div className="text-center">
                        <div>{MOVE_EMOJIS[move]}</div>
                        <div className="text-sm">{MOVE_NAMES[move]}</div>
                      </div>
                    </Button>
                  </motion.div>
                ))}
              </div>
              
              {isWaiting && (
                <div className="text-center mt-4">
                  <div className="text-lg">상대방의 선택을 기다리는 중...</div>
                  <div className="animate-pulse text-2xl mt-2">🤔</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 게임이 끝났을 때 */}
        {game?.gameState === 'finished' && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold mb-4">🎮 게임 종료!</div>
              <Button onClick={resetGame} size="lg">
                새 게임 시작
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GameBoard;

