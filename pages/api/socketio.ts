import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import { Socket as NetSocket } from 'net';

interface SocketServer extends NetServer {
  io?: ServerIO | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

interface ChatMessage {
  room: string;
  message: string;
  sender: string;
  timestamp: number;
}

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    console.log('Socket.io sedang diinisialisasi...');
    const io = new ServerIO(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log(`Client terhubung: ${socket.id}`);

      // Event untuk bergabung ke room
      socket.on('joinRoom', (data: { room: string; username: string }) => {
        const { room, username } = data;
        socket.join(room);
        console.log(`${username} (${socket.id}) bergabung ke room: ${room}`);
        
        // Kirim notifikasi ke semua user di room bahwa ada user baru
        socket.to(room).emit('userJoined', {
          message: `${username} bergabung ke room`,
          timestamp: Date.now()
        });
      });

      // Event untuk mengirim pesan chat
      socket.on('chatMessage', (data: ChatMessage) => {
        const { room, message, sender } = data;
        const messageData = {
          message,
          sender,
          timestamp: Date.now()
        };
        
        console.log(`Pesan dari ${sender} di room ${room}: ${message}`);
        
        // Kirim pesan ke semua user di room (termasuk pengirim)
        io.to(room).emit('message', messageData);
      });

      // Event ketika user disconnect
      socket.on('disconnect', () => {
        console.log(`Client terputus: ${socket.id}`);
      });
    });
  } else {
    console.log('Socket.io sudah berjalan');
  }
  res.end();
}
