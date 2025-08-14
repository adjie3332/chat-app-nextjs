'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  message: string;
  sender: string;
  timestamp: number;
}

interface UserJoinedNotification {
  message: string;
  timestamp: number;
}

export default function ChatApp() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState('');
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Menghubungkan...');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll ke pesan terbaru
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Inisialisasi socket connection
  useEffect(() => {
    const socketInstance = io();

    socketInstance.on('connect', () => {
      console.log('Terhubung ke server');
      setSocket(socketInstance);
      setConnectionStatus('Terhubung');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Gagal terhubung:', error);
      setConnectionStatus('Gagal terhubung');
    });

    socketInstance.on('message', (data: Message) => {
      console.log('Pesan diterima:', data);
      setMessages(prev => [...prev, data]);
    });

    socketInstance.on('userJoined', (data: UserJoinedNotification) => {
      console.log('User bergabung:', data);
      setMessages(prev => [...prev, {
        message: data.message,
        sender: 'System',
        timestamp: data.timestamp
      }]);
    });

    socketInstance.on('disconnect', () => {
      console.log('Terputus dari server');
      setConnectionStatus('Terputus');
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const handleJoinRoom = () => {
    if (!room.trim() || !username.trim()) {
      alert('Mohon isi nama room dan username!');
      return;
    }

    if (!socket) {
      alert('Belum terhubung ke server. Mohon tunggu...');
      return;
    }

    setIsConnecting(true);
    console.log('Bergabung ke room:', { room: room.trim(), username: username.trim() });
    
    socket.emit('joinRoom', { room: room.trim(), username: username.trim() });
    setJoined(true);
    setMessages([]);
    setIsConnecting(false);
  };

  const handleSendMessage = () => {
    if (!message.trim() || !socket) return;

    console.log('Mengirim pesan:', { room, message: message.trim(), sender: username });
    
    socket.emit('chatMessage', {
      room,
      message: message.trim(),
      sender: username
    });

    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!joined) {
        handleJoinRoom();
      } else {
        handleSendMessage();
      }
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat App</h1>
            <p className="text-gray-600">Bergabung atau buat room untuk mulai chat</p>
            <p className={`text-sm mt-2 ${connectionStatus === 'Terhubung' ? 'text-green-600' : 'text-red-600'}`}>
              Status: {connectionStatus}
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Anda
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Masukkan nama Anda"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={isConnecting}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Room
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Masukkan nama room"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={isConnecting}
              />
            </div>
            
            <button
              onClick={handleJoinRoom}
              disabled={isConnecting || !socket || connectionStatus !== 'Terhubung'}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {isConnecting ? 'Bergabung...' : 'Bergabung ke Room'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Room: {room}</h1>
            <p className="text-sm text-gray-600">Sebagai: {username}</p>
          </div>
          <button
            onClick={() => {
              setJoined(false);
              setMessages([]);
              setRoom('');
              setUsername('');
            }}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
          >
            Keluar Room
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p>Belum ada pesan. Mulai percakapan!</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === username ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.sender === username
                        ? 'bg-blue-600 text-white'
                        : msg.sender === 'System'
                        ? 'bg-gray-200 text-gray-700 text-center italic'
                        : 'bg-white text-gray-900 shadow-sm border'
                    }`}
                  >
                    {msg.sender !== username && msg.sender !== 'System' && (
                      <p className="text-xs font-medium mb-1 text-gray-600">
                        {msg.sender}
                      </p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${
                      msg.sender === username ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t px-4 py-4">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ketik pesan..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            Kirim
          </button>
        </div>
      </div>
    </div>
  );
}
