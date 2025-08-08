const request = require('supertest');
const express = require('express');
const { createServer } = require('http');
const socketIo = require('socket.io');

// 테스트용 서버 설정
const app = express();
const server = createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static('public'));

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: '방탈출 게임 백엔드 서버',
    status: 'running',
    version: '1.0.0'
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
  });

  socket.on('start-game', (data) => {
    const { roomId } = data;
    const room = gameState.rooms.get(roomId);
    
    if (room) {
      room.status = 'playing';
      room.startTime = new Date();
      io.to(roomId).emit('game-started', { room });
    }
  });

  socket.on('end-game', (data) => {
    const { roomId, success } = data;
    const room = gameState.rooms.get(roomId);
    
    if (room) {
      room.status = 'finished';
      room.endTime = new Date();
      room.success = success;
      io.to(roomId).emit('game-ended', { room, success });
    }
  });

  socket.on('disconnect', () => {
    const playerData = gameState.players.get(socket.id);
    if (playerData) {
      const { roomId, player } = playerData;
      const room = gameState.rooms.get(roomId);
      
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        io.to(roomId).emit('player-left', { player, room });
      }
      
      gameState.players.delete(socket.id);
    }
  });
});

describe('방탈출 게임 서버 테스트', () => {
  let testServer;

  beforeAll((done) => {
    testServer = server.listen(0, () => {
      done();
    });
  });

  afterAll((done) => {
    testServer.close(() => {
      done();
    });
  });

  describe('기본 라우트 테스트', () => {
    test('GET / should return server status', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('version');
      expect(response.body.message).toBe('방탈출 게임 백엔드 서버');
      expect(response.body.status).toBe('running');
    });
  });

  describe('정적 파일 테스트', () => {
    test('GET /index.html should serve the game page', async () => {
      const response = await request(app).get('/index.html');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('GET /styles.css should serve the stylesheet', async () => {
      const response = await request(app).get('/styles.css');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/css/);
    });

    test('GET /script.js should serve the game script', async () => {
      const response = await request(app).get('/script.js');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/javascript/);
    });
  });

  describe('Socket.IO 테스트', () => {
    test('should handle socket connections', (done) => {
      const client = require('socket.io-client');
      const socket = client(`http://localhost:${testServer.address().port}`);
      
      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        socket.disconnect();
        done();
      });
    });

    test('should handle room joining', (done) => {
      const client = require('socket.io-client');
      const socket = client(`http://localhost:${testServer.address().port}`);
      
      socket.on('connect', () => {
        socket.emit('join-room', { roomId: 'test-room', playerName: 'TestPlayer' });
        
        socket.on('player-joined', (data) => {
          expect(data.player.name).toBe('TestPlayer');
          expect(data.room.id).toBe('test-room');
          socket.disconnect();
          done();
        });
      });
    });

    test('should handle game start', (done) => {
      const client = require('socket.io-client');
      const socket = client(`http://localhost:${testServer.address().port}`);
      
      socket.on('connect', () => {
        socket.emit('join-room', { roomId: 'test-room', playerName: 'TestPlayer' });
        
        socket.on('player-joined', () => {
          socket.emit('start-game', { roomId: 'test-room' });
          
          socket.on('game-started', (data) => {
            expect(data.room.status).toBe('playing');
            expect(data.room.startTime).toBeTruthy();
            socket.disconnect();
            done();
          });
        });
      });
    });

    test('should handle game end', (done) => {
      const client = require('socket.io-client');
      const socket = client(`http://localhost:${testServer.address().port}`);
      
      socket.on('connect', () => {
        socket.emit('join-room', { roomId: 'test-room', playerName: 'TestPlayer' });
        
        socket.on('player-joined', () => {
          socket.emit('end-game', { roomId: 'test-room', success: true });
          
          socket.on('game-ended', (data) => {
            expect(data.room.status).toBe('finished');
            expect(data.room.success).toBe(true);
            expect(data.success).toBe(true);
            socket.disconnect();
            done();
          });
        });
      });
    });
  });
});
