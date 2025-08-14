const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 8000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User terhubung:', socket.id);

    socket.on('joinRoom', ({ room, username }) => {
      console.log(`${username} bergabung ke room: ${room}`);
      socket.join(room);
      
      // Broadcast ke semua user di room bahwa ada user baru
      socket.to(room).emit('userJoined', {
        message: `${username} bergabung ke room`,
        timestamp: Date.now()
      });
    });

    socket.on('chatMessage', ({ room, message, sender }) => {
      console.log(`Pesan dari ${sender} di room ${room}: ${message}`);
      
      // Broadcast pesan ke semua user di room (termasuk pengirim)
      io.to(room).emit('message', {
        message,
        sender,
        timestamp: Date.now()
      });
    });

    socket.on('disconnect', () => {
      console.log('User terputus:', socket.id);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
