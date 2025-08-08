const express = require('express');
const router = express.Router();

// 게임 상태 (실제로는 데이터베이스에서 관리해야 함)
let gameRooms = new Map();
let gamePlayers = new Map();

// 모든 방 목록 조회
router.get('/rooms', (req, res) => {
  const rooms = Array.from(gameRooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    status: room.status,
    createdAt: room.createdAt
  }));
  
  res.json({
    success: true,
    rooms
  });
});

// 특정 방 정보 조회
router.get('/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = gameRooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({
      success: false,
      error: '방을 찾을 수 없습니다.'
    });
  }
  
  res.json({
    success: true,
    room: {
      id: room.id,
      name: room.name,
      players: room.players,
      status: room.status,
      startTime: room.startTime,
      endTime: room.endTime,
      success: room.success
    }
  });
});

// 새 방 생성
router.post('/rooms', (req, res) => {
  const { name, maxPlayers = 4 } = req.body;
  
  if (!name) {
    return res.status(400).json({
      success: false,
      error: '방 이름은 필수입니다.'
    });
  }
  
  const roomId = generateRoomId();
  const room = {
    id: roomId,
    name,
    maxPlayers,
    players: [],
    status: 'waiting',
    createdAt: new Date(),
    startTime: null,
    endTime: null,
    success: null
  };
  
  gameRooms.set(roomId, room);
  
  res.status(201).json({
    success: true,
    room: {
      id: room.id,
      name: room.name,
      maxPlayers: room.maxPlayers,
      status: room.status
    }
  });
});

// 방 삭제
router.delete('/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = gameRooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({
      success: false,
      error: '방을 찾을 수 없습니다.'
    });
  }
  
  gameRooms.delete(roomId);
  
  res.json({
    success: true,
    message: '방이 삭제되었습니다.'
  });
});

// 플레이어 정보 조회
router.get('/players/:playerId', (req, res) => {
  const { playerId } = req.params;
  const player = gamePlayers.get(playerId);
  
  if (!player) {
    return res.status(404).json({
      success: false,
      error: '플레이어를 찾을 수 없습니다.'
    });
  }
  
  res.json({
    success: true,
    player
  });
});

// 게임 통계 조회
router.get('/stats', (req, res) => {
  const totalRooms = gameRooms.size;
  const totalPlayers = gamePlayers.size;
  const activeGames = Array.from(gameRooms.values()).filter(room => room.status === 'playing').length;
  const completedGames = Array.from(gameRooms.values()).filter(room => room.status === 'finished').length;
  
  res.json({
    success: true,
    stats: {
      totalRooms,
      totalPlayers,
      activeGames,
      completedGames
    }
  });
});

// 방 ID 생성 함수
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

module.exports = router;
