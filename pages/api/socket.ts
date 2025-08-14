import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';

export const config = {
  api: {
    bodyParser: false,
  },
};

const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if ((res.socket as any).server.io) {
    console.log('Socket.io sudah berjalan');
    res.end();
    return;
  }

  console.log('Menginisialisasi Socket.io...');
  
  const io = new ServerIO((res.socket as any).server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  (res.socket as any).server.io = io;

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

  console.log('Socket.io berhasil diinisialisasi');
  res.end();
};

export default SocketHandler;
