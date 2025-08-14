'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  message: string;
  sender: string;
  timestamp: number;
}

export default function SimpleChatApp() {
  const [room, setRoom] = useState('');
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [isInvited, setIsInvited] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [showNotification, setShowNotification] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll ke pesan terbaru
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show notification helper
  const showNotificationMessage = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => setShowNotification(''), 3000);
  };

  // Initialize Socket.io connection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for invite parameters in URL
      const urlParams = new URLSearchParams(window.location.search);
      const inviteRoom = urlParams.get('room');
      const inviteUsername = urlParams.get('username');
      
      if (inviteRoom) {
        setRoom(inviteRoom);
        setIsInvited(true);
        if (inviteUsername) {
          setUsername(inviteUsername);
        }
      }

      // Initialize Socket.io connection
      socketRef.current = io({
        path: '/api/socketio',
      });

      // Connection status handlers
      socketRef.current.on('connect', () => {
        setConnectionStatus('connected');
        showNotificationMessage('Terhubung ke server!');
      });

      socketRef.current.on('disconnect', () => {
        setConnectionStatus('disconnected');
        showNotificationMessage('Koneksi terputus!');
      });

      socketRef.current.on('reconnect', () => {
        setConnectionStatus('connected');
        showNotificationMessage('Koneksi pulih!');
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, []);

  // Setup Socket.io event listeners when joined
  useEffect(() => {
    if (!joined || !socketRef.current) return;

    const socket = socketRef.current;

    // Listen for incoming messages
    const handleMessage = (data: { message: string; sender: string; timestamp: number }) => {
      const newMessage: Message = {
        id: Date.now().toString() + Math.random(),
        message: data.message,
        sender: data.sender,
        timestamp: data.timestamp
      };
      setMessages(prev => [...prev, newMessage]);
    };

    // Listen for user joined notifications
    const handleUserJoined = (data: { message: string; timestamp: number }) => {
      const joinMessage: Message = {
        id: Date.now().toString() + Math.random(),
        message: data.message,
        sender: 'System',
        timestamp: data.timestamp
      };
      setMessages(prev => [...prev, joinMessage]);
    };

    socket.on('message', handleMessage);
    socket.on('userJoined', handleUserJoined);

    return () => {
      socket.off('message', handleMessage);
      socket.off('userJoined', handleUserJoined);
    };
  }, [joined]);

  // Generate invite link
  const generateInviteLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}?room=${encodeURIComponent(room)}`;
    setInviteLink(link);
    setShowInvite(true);
  };

  // Copy invite link to clipboard
  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      showNotificationMessage('Link berhasil disalin!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showNotificationMessage('Link berhasil disalin!');
    }
  };

  // Share via Web Share API (if supported)
  const shareInviteLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bergabung ke Chat Room',
          text: `Bergabung ke room "${room}" untuk chat bersama!`,
          url: inviteLink,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      copyInviteLink();
    }
  };

  const handleJoinRoom = () => {
    if (!room.trim() || !username.trim()) {
      showNotificationMessage('Mohon isi nama room dan username!');
      return;
    }

    if (!socketRef.current || connectionStatus !== 'connected') {
      showNotificationMessage('Koneksi belum siap!');
      return;
    }

    setIsConnecting(true);
    
    // Join room via Socket.io
    socketRef.current.emit('joinRoom', {
      room: room.trim(),
      username: username.trim()
    });

    setJoined(true);
    setMessages([]); // Clear messages for new room
    setIsConnecting(false);
  };

  const handleSendMessage = () => {
    if (!message.trim() || !socketRef.current) return;

    // Send message via Socket.io
    socketRef.current.emit('chatMessage', {
      room: room,
      message: message.trim(),
      sender: username
    });

    setMessage('');
    
    // Focus back to input for better UX
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!joined) {
        handleJoinRoom();
      } else {
        handleSendMessage();
      }
    }
  };

  // Auto-focus input when joining room
  useEffect(() => {
    if (joined && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [joined]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4 relative">
        {/* Notification Toast */}
        {showNotification && (
          <div className="fixed top-4 right-4 z-50 bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-3 sm:p-4 transform transition-all duration-300 animate-in slide-in-from-top">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-xs sm:text-sm font-medium text-gray-800">{showNotification}</p>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 lg:p-8 w-full max-w-md transform hover:scale-105 transition-all duration-300">
          <div className="text-center mb-6 sm:mb-8">
            {/* Logo/Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
              <span className="text-2xl sm:text-3xl">💬</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
              Chat App
            </h1>
            
            {isInvited ? (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-100">
                <p className="text-blue-700 font-semibold text-sm sm:text-base lg:text-lg mb-1">🎉 Anda diundang ke room!</p>
                <p className="text-blue-600 font-medium text-xs sm:text-sm lg:text-base">Room: <span className="font-bold">{room}</span></p>
                <p className="text-blue-500 text-xs sm:text-sm mt-1">Masukkan nama Anda untuk bergabung</p>
              </div>
            ) : (
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Bergabung atau buat room untuk mulai chat</p>
            )}
            
            <div className="mt-4">
              <span className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all duration-200 ${
                connectionStatus === 'connected' 
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200'
                  : connectionStatus === 'connecting'
                  ? 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-200'
                  : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200'
              }`}>
                <div className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full mr-2 ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-500 animate-pulse'
                    : connectionStatus === 'connecting'
                    ? 'bg-yellow-500 animate-spin'
                    : 'bg-red-500'
                }`}></div>
                Status: {connectionStatus === 'connected' ? 'Online' : connectionStatus === 'connecting' ? 'Menghubungkan...' : 'Offline'}
              </span>
            </div>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 sm:mb-3">
                Nama Anda
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Masukkan nama Anda"
                className="w-full px-3 sm:px-4 lg:px-5 py-3 sm:py-4 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 bg-gray-50/50 text-gray-800 placeholder-gray-400 text-sm sm:text-base"
                disabled={isConnecting || connectionStatus !== 'connected'}
                autoComplete="name"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">{username.length}/20 karakter</p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 sm:mb-3">
                Nama Room
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Masukkan nama room"
                className="w-full px-3 sm:px-4 lg:px-5 py-3 sm:py-4 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 bg-gray-50/50 text-gray-800 placeholder-gray-400 text-sm sm:text-base"
                disabled={isConnecting || connectionStatus !== 'connected'}
                maxLength={30}
              />
              <p className="text-xs text-gray-500 mt-1">{room.length}/30 karakter</p>
            </div>
            
            <button
              onClick={handleJoinRoom}
              disabled={isConnecting || !room.trim() || !username.trim() || connectionStatus !== 'connected'}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-3 sm:py-4 px-6 rounded-xl sm:rounded-2xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-sm sm:text-base lg:text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:scale-95"
            >
              {isConnecting ? (
                <span className="flex items-center justify-center">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Bergabung...
                </span>
              ) : connectionStatus !== 'connected' ? (
                <span className="flex items-center justify-center">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Menghubungkan...
                </span>
              ) : (
                '🚀 Bergabung ke Room'
              )}
            </button>
            
            {/* Help text */}
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">
                💡 Tip: Tekan <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Enter</kbd> untuk bergabung cepat
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex flex-col relative">
      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-3 sm:p-4 transform transition-all duration-300 animate-in slide-in-from-top">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-xs sm:text-sm font-medium text-gray-800">{showNotification}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-white font-bold text-sm sm:text-base lg:text-lg">💬</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
                  Room: {room}
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}></span>
                  <span className="truncate">Sebagai: <span className="font-semibold">{username}</span></span>
                </p>
              </div>
            </div>
            <div className="flex space-x-1 sm:space-x-2 lg:space-x-3 flex-shrink-0">
              <button
                onClick={generateInviteLink}
                className="px-2 sm:px-3 lg:px-6 py-2 sm:py-2 lg:py-3 text-xs sm:text-xs lg:text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
              >
                <span className="hidden lg:inline">✨ Invite Teman</span>
                <span className="lg:hidden">✨</span>
              </button>
              <button
                onClick={() => {
                  if (socketRef.current) {
                    socketRef.current.disconnect();
                  }
                  setJoined(false);
                  setMessages([]);
                  setRoom('');
                  setUsername('');
                  setShowInvite(false);
                }}
                className="px-2 sm:px-3 lg:px-6 py-2 sm:py-2 lg:py-3 text-xs sm:text-xs lg:text-sm bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg sm:rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
              >
                <span className="hidden lg:inline">🚪 Keluar Room</span>
                <span className="lg:hidden">🚪</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto h-full flex flex-col p-2 sm:p-4 lg:p-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-xl border border-white/20 h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-2 sm:space-y-3 lg:space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8 sm:mt-12 lg:mt-20">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-6">
                    <span className="text-xl sm:text-2xl lg:text-3xl">💭</span>
                  </div>
                  <p className="text-base sm:text-lg lg:text-xl font-semibold mb-2">Belum ada pesan</p>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-400">Mulai percakapan dengan mengirim pesan pertama!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === username ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-4 rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg transform transition-all duration-200 hover:scale-105 ${
                        msg.sender === username
                          ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white'
                          : msg.sender === 'System'
                          ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-center border-2 border-gray-200'
                          : 'bg-white text-gray-900 shadow-xl border-2 border-gray-100'
                      }`}
                    >
                      {msg.sender !== username && msg.sender !== 'System' && (
                        <p className="text-xs font-bold mb-1 sm:mb-2 opacity-75">
                          {msg.sender}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm lg:text-base leading-relaxed font-medium break-words">{msg.message}</p>
                      <p className={`text-xs mt-1 sm:mt-2 font-medium ${
                        msg.sender === username ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200/50 p-3 sm:p-4 lg:p-6 bg-gray-50/50">
              <div className="flex space-x-2 sm:space-x-3 lg:space-x-4">
                <input
                  ref={messageInputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ketik pesan..."
                  className="flex-1 px-3 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-4 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 bg-white text-gray-800 placeholder-gray-400 text-sm sm:text-base"
                  disabled={connectionStatus !== 'connected'}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || connectionStatus !== 'connected'}
                  className="px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl sm:rounded-2xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-xs sm:text-sm lg:text-base shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 active:scale-95"
                >
                  <span className="hidden sm:inline">🚀 Kirim</span>
                  <span className="sm:hidden">🚀</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 lg:p-8 w-full max-w-lg transform scale-100 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <span className="text-white text-base sm:text-lg">✨</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Invite Teman ke Room
                </h2>
              </div>
              <button
                onClick={() => setShowInvite(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors text-lg sm:text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 sm:mb-6">
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base lg:text-lg">
                Bagikan link ini untuk mengundang teman ke room <span className="font-bold text-indigo-600">"{room}"</span>:
              </p>
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-gray-200">
                <p className="text-xs sm:text-sm text-gray-800 break-all font-mono leading-relaxed">{inviteLink}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-4 sm:mb-6">
              <button
                onClick={copyInviteLink}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl sm:rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
              >
                📋 Salin Link
              </button>
              <button
                onClick={shareInviteLink}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl sm:rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
              >
                📤 Share
              </button>
            </div>

            <div className="p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-200">
              <p className="text-xs sm:text-sm text-blue-700 leading-relaxed">
                <span className="text-base sm:text-xl mr-2">💡</span>
                <strong>Tip:</strong> Teman yang mengklik link ini akan langsung diarahkan ke room <strong>"{room}"</strong>. 
                Mereka hanya perlu memasukkan nama mereka untuk bergabung!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
