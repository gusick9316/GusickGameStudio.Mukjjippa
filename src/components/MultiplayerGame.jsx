import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MultiplayerManager } from '../lib/multiplayer';
import { MOVES, MOVE_NAMES, MOVE_EMOJIS } from '../lib/gameLogic';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, RefreshCw, ArrowLeft, Copy, Check } from 'lucide-react';

const MultiplayerGame = ({ onBack }) => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState('lobby'); // lobby, room, playing
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const multiplayerRef = useRef(null);

  useEffect(() => {
    // 멀티플레이어 매니저 초기화
    multiplayerRef.current = new MultiplayerManager();
    const mp = multiplayerRef.current;

    // 이벤트 리스너 등록
    mp.on('playerJoined', ({ room }) => {
      setCurrentRoom(room);
      setError('');
    });

    mp.on('playerLeft', ({ roomId, playerId }) => {
      if (currentRoom && currentRoom.id === roomId) {
        setError('상대방이 방을 나갔습니다.');
        setTimeout(() => {
          setGameState('lobby');
          setCurrentRoom(null);
        }, 2000);
      }
    });

    mp.on('playerReadyChanged', ({ room }) => {
      setCurrentRoom(room);
    });

    mp.on('gameStarted', ({ room }) => {
      setCurrentRoom(room);
      setGameState('playing');
      setError('');
    });

    mp.on('moveSubmitted', ({ room }) => {
      setCurrentRoom(room);
    });

    mp.on('roundCompleted', ({ room, result }) => {
      setCurrentRoom(room);
      setLastResult(result);
      setShowResult(true);
      
      setTimeout(() => {
        setShowResult(false);
      }, 3000);
    });

    mp.on('gameEnded', ({ room }) => {
      setCurrentRoom(room);
    });

    mp.on('roomUpdated', ({ room }) => {
      setCurrentRoom(room);
    });

    mp.on('roomDeleted', () => {
      setError('방이 삭제되었습니다.');
      setGameState('lobby');
      setCurrentRoom(null);
    });

    // 방 목록 로드
    loadAvailableRooms();

    // 정리
    return () => {
      if (multiplayerRef.current) {
        multiplayerRef.current.destroy();
      }
    };
  }, []);

  const loadAvailableRooms = () => {
    if (multiplayerRef.current) {
      const rooms = multiplayerRef.current.getAvailableRooms();
      setAvailableRooms(rooms);
    }
  };

  const createRoom = async () => {
    if (!multiplayerRef.current) return;

    setIsLoading(true);
    setError('');

    try {
      const roomId = multiplayerRef.current.createRoom(user.username);
      setCurrentRoom(multiplayerRef.current.currentRoom);
      setGameState('room');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async (roomId) => {
    if (!multiplayerRef.current) return;

    setIsLoading(true);
    setError('');

    try {
      const room = await multiplayerRef.current.joinRoom(roomId, user.username);
      setCurrentRoom(room);
      setGameState('room');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoomById = async () => {
    if (!roomId.trim()) {
      setError('방 ID를 입력해주세요.');
      return;
    }

    await joinRoom(roomId.trim());
  };

  const toggleReady = () => {
    if (!multiplayerRef.current || !currentRoom) return;

    const currentPlayer = currentRoom.players.find(p => p.id === multiplayerRef.current.playerId);
    if (currentPlayer) {
      multiplayerRef.current.setPlayerReady(!currentPlayer.ready);
    }
  };

  const submitMove = (move) => {
    if (!multiplayerRef.current || !currentRoom) return;
    multiplayerRef.current.submitMove(move);
  };

  const leaveRoom = () => {
    if (multiplayerRef.current) {
      multiplayerRef.current.leaveRoom();
    }
    setGameState('lobby');
    setCurrentRoom(null);
    setError('');
    loadAvailableRooms();
  };

  const copyRoomId = async () => {
    if (currentRoom) {
      try {
        await navigator.clipboard.writeText(currentRoom.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy room ID:', error);
      }
    }
  };

  const getCurrentPlayer = () => {
    if (!currentRoom || !multiplayerRef.current) return null;
    return currentRoom.players.find(p => p.id === multiplayerRef.current.playerId);
  };

  const getOpponentPlayer = () => {
    if (!currentRoom || !multiplayerRef.current) return null;
    return currentRoom.players.find(p => p.id !== multiplayerRef.current.playerId);
  };

  const getPlayerScore = (playerId) => {
    if (!currentRoom || !currentRoom.gameData) return 0;
    return currentRoom.gameData.scores[playerId] || 0;
  };

  const getAttackerName = () => {
    if (!currentRoom || !currentRoom.gameData || !currentRoom.gameData.currentAttacker) return null;
    const attacker = currentRoom.players.find(p => p.id === currentRoom.gameData.currentAttacker);
    return attacker ? attacker.name : null;
  };

  // 로비 화면
  if (gameState === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">👥 멀티플레이어</h1>
              <p className="text-gray-600">다른 플레이어와 실시간 대전</p>
            </div>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              뒤로가기
            </Button>
          </div>

          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* 방 생성 및 참가 */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="mr-2 h-5 w-5" />
                  새 방 만들기
                </CardTitle>
                <CardDescription>새로운 게임 방을 생성합니다</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={createRoom} disabled={isLoading} className="w-full">
                  {isLoading ? '생성 중...' : '방 만들기'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>방 ID로 참가</CardTitle>
                <CardDescription>친구가 공유한 방 ID를 입력하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="room-id">방 ID</Label>
                  <Input
                    id="room-id"
                    placeholder="방 ID를 입력하세요"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                  />
                </div>
                <Button onClick={joinRoomById} disabled={isLoading} className="w-full">
                  {isLoading ? '참가 중...' : '방 참가'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 사용 가능한 방 목록 */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>사용 가능한 방</CardTitle>
                  <CardDescription>참가할 수 있는 방 목록입니다</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadAvailableRooms}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {availableRooms.length === 0 ? (
                <p className="text-gray-500 text-center py-8">사용 가능한 방이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {availableRooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{room.players[0]?.name}의 방</div>
                        <div className="text-sm text-gray-500">
                          플레이어: {room.players.length}/2 | 방 ID: {room.id}
                        </div>
                      </div>
                      <Button onClick={() => joinRoom(room.id)} disabled={isLoading}>
                        참가
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 방 대기 화면
  if (gameState === 'room' && currentRoom) {
    const currentPlayer = getCurrentPlayer();
    const opponent = getOpponentPlayer();

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">🎮 게임 방</h1>
              <p className="text-gray-600">방 ID: {currentRoom.id}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyRoomId}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? '복사됨' : '방 ID 복사'}
              </Button>
              <Button variant="outline" onClick={leaveRoom}>
                방 나가기
              </Button>
            </div>
          </div>

          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* 플레이어 상태 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>플레이어 ({currentRoom.players.length}/2)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {currentRoom.players.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <Users className="mr-2 h-5 w-5" />
                      <span className="font-medium">{player.name}</span>
                      {player.id === multiplayerRef.current?.playerId && (
                        <Badge variant="secondary" className="ml-2">나</Badge>
                      )}
                    </div>
                    <Badge variant={player.ready ? "default" : "outline"}>
                      {player.ready ? '준비됨' : '대기 중'}
                    </Badge>
                  </div>
                ))}
                
                {currentRoom.players.length < 2 && (
                  <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <span className="text-gray-500">플레이어 대기 중...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 게임 시작 버튼 */}
          {currentRoom.players.length === 2 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <Button 
                  onClick={toggleReady} 
                  size="lg"
                  variant={currentPlayer?.ready ? "outline" : "default"}
                >
                  {currentPlayer?.ready ? '준비 취소' : '준비 완료'}
                </Button>
                
                {currentRoom.players.every(p => p.ready) && (
                  <p className="mt-4 text-green-600 font-medium">
                    모든 플레이어가 준비되었습니다! 게임이 곧 시작됩니다...
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // 게임 플레이 화면
  if (gameState === 'playing' && currentRoom) {
    const currentPlayer = getCurrentPlayer();
    const opponent = getOpponentPlayer();
    const currentPlayerScore = getPlayerScore(multiplayerRef.current?.playerId);
    const opponentScore = getPlayerScore(opponent?.id);
    const attackerName = getAttackerName();

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">🎮 멀티플레이어 게임</h1>
              <p className="text-gray-600">라운드 {currentRoom.currentRound} / {currentRoom.maxRounds}</p>
            </div>
            <Button variant="outline" onClick={leaveRoom}>
              게임 나가기
            </Button>
          </div>

          {/* 게임 진행 상황 */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">{currentPlayer?.name}</div>
                  <div className="text-2xl font-bold text-blue-600">{currentPlayerScore}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">VS</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">{opponent?.name}</div>
                  <div className="text-2xl font-bold text-red-600">{opponentScore}</div>
                </div>
              </div>
              
              {attackerName && (
                <div className="text-center">
                  <Badge variant="secondary">
                    현재 공격자: {attackerName}
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
                        <div>{MOVE_EMOJIS[lastResult.player1.move]}</div>
                        <div className="text-sm text-gray-600">{lastResult.player1.name}</div>
                      </div>
                      <div className="self-center text-2xl">VS</div>
                      <div>
                        <div>{MOVE_EMOJIS[lastResult.player2.move]}</div>
                        <div className="text-sm text-gray-600">{lastResult.player2.name}</div>
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
          {currentRoom.gameState === 'playing' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  {!attackerName ? '가위바위보!' : '묵찌빠!'}
                </CardTitle>
                <CardDescription className="text-center">
                  {!attackerName 
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
                        variant={currentPlayer?.move === move ? "default" : "outline"}
                        size="lg"
                        className="w-full h-24 text-4xl"
                        onClick={() => submitMove(move)}
                        disabled={currentPlayer?.move !== null}
                      >
                        <div className="text-center">
                          <div>{MOVE_EMOJIS[move]}</div>
                          <div className="text-sm">{MOVE_NAMES[move]}</div>
                        </div>
                      </Button>
                    </motion.div>
                  ))}
                </div>
                
                {currentPlayer?.move && !opponent?.move && (
                  <div className="text-center mt-4">
                    <div className="text-lg">상대방의 선택을 기다리는 중...</div>
                    <div className="animate-pulse text-2xl mt-2">🤔</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 게임이 끝났을 때 */}
          {currentRoom.gameState === 'finished' && (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold mb-4">🎮 게임 종료!</div>
                <Button onClick={leaveRoom} size="lg">
                  방 나가기
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default MultiplayerGame;

