require('dotenv').config();

module.exports = {
  // 서버 설정
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // CORS 설정
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // 게임 설정
  game: {
    maxPlayersPerRoom: 4,
    gameTimeLimit: 60 * 60 * 1000, // 1시간 (밀리초)
    roomCleanupInterval: 5 * 60 * 1000 // 5분 (밀리초)
  },
  
  // 데이터베이스 설정 (나중에 추가할 수 있음)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'escape_room',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  
  // JWT 설정 (나중에 추가할 수 있음)
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  }
};
