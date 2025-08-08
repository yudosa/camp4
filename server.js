const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 미들웨어 설정
app.use(helmet({
  contentSecurityPolicy: false, // 클라우드타입 호환성을 위해 비활성화
}));
app.use(cors({
  origin: "*", // 클라우드타입에서 모든 도메인 허용
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공
app.use(express.static('public'));

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: '방탈출 게임 백엔드 서버',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 게임 상태 관리
const gameState = {
  rooms: new Map(),
  players: new Map()
};

// Socket.IO 연결 처리
io.on('connection', (socket) => {
  console.log('새로운 클라이언트 연결:', socket.id);

  // 플레이어 입장
  socket.on('join-room', (data) => {
    const { roomId, playerName } = data;
    
    if (!gameState.rooms.has(roomId)) {
      gameState.rooms.set(roomId, {
        id: roomId,
        players: [],
        status: 'waiting',
        startTime: null,
        endTime: null
      });
    }

    const room = gameState.rooms.get(roomId);
    const player = {
      id: socket.id,
      name: playerName,
      joinedAt: new Date()
    };

    room.players.push(player);
    gameState.players.set(socket.id, { roomId, player });

    socket.join(roomId);
    io.to(roomId).emit('player-joined', { player, room });
    
    console.log(`${playerName}님이 방 ${roomId}에 입장했습니다.`);
  });

  // 게임 시작
  socket.on('start-game', (data) => {
    const { roomId } = data;
    const room = gameState.rooms.get(roomId);
    
    if (room) {
      room.status = 'playing';
      room.startTime = new Date();
      io.to(roomId).emit('game-started', { room });
      console.log(`방 ${roomId}의 게임이 시작되었습니다.`);
    }
  });

  // 게임 종료
  socket.on('end-game', (data) => {
    const { roomId, success } = data;
    const room = gameState.rooms.get(roomId);
    
    if (room) {
      room.status = 'finished';
      room.endTime = new Date();
      room.success = success;
      io.to(roomId).emit('game-ended', { room, success });
      console.log(`방 ${roomId}의 게임이 종료되었습니다. 성공: ${success}`);
    }
  });

  // 연결 해제
  socket.on('disconnect', () => {
    const playerData = gameState.players.get(socket.id);
    if (playerData) {
      const { roomId, player } = playerData;
      const room = gameState.rooms.get(roomId);
      
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        io.to(roomId).emit('player-left', { player, room });
        console.log(`${player.name}님이 방 ${roomId}에서 나갔습니다.`);
      }
      
      gameState.players.delete(socket.id);
    }
    console.log('클라이언트 연결 해제:', socket.id);
  });
});

// API 라우트
const gameRoutes = require('./routes/game');
app.use('/api/game', gameRoutes);

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: '서버 내부 오류가 발생했습니다.',
    message: err.message
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: '요청한 리소스를 찾을 수 없습니다.'
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // 클라우드타입 호환성을 위해 0.0.0.0 사용

server.listen(PORT, HOST, () => {
  console.log(`방탈출 게임 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`서버 URL: http://${HOST}:${PORT}`);
  console.log(`환경: ${process.env.NODE_ENV || 'development'}`);
});
