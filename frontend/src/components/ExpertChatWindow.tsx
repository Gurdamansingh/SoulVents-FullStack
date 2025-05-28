import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Clock } from 'lucide-react';
import SocketService from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import {api} from '../services/api';
import SessionService from '../services/sessionService';

interface Message {
  id: string;
  sender: 'user' | 'expert';
  content: string;
  timestamp: string;
  senderName: string;
  roomId?: string,
}

interface ExpertChatWindowProps {
  userName: string;
  userImage: string;
  sessionId: string;
  onClose: () => void;
}

const ExpertChatWindow = ({ userName, userImage, sessionId, onClose }: ExpertChatWindowProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [duration, setDuration] = useState('00:00');
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketService = SocketService.getInstance();
  const startTime = useRef(new Date());
  const { token } = useAuth();
  const [chatEnded, setChatEnded] = useState(false);
  const [sessionEndMessage, setSessionEndMessage] = useState("");
  const sessionService = SessionService.getInstance();


  const playMessageNotificationSound = () => {
    try {
      const audio = new Audio(`${window.location.origin}/message.wav`);
      audio.volume = 0.5;
  
      // Make sure the sound is played only after user interaction
      const playPromise = audio.play();
  
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Message notification sound played successfully.');
          })
          .catch((error) => {
            console.warn('Message notification sound failed to play:', error);
          });
      }
    } catch (error) {
      console.warn('Error initializing message notification sound:', error);
    }
  };
  
  useEffect(() => {
    const sessionRoomId = `session_${sessionId}`;
    console.log(`🟢 Expert joining room: ${sessionRoomId}`);
    socketService.joinRoom(sessionRoomId);

    const handleReceiveMessage = (message: Message) => {
      console.log(`📩 Expert received message:`, message);
      if (message.roomId === sessionRoomId) {
        if (message.sender === 'user') {
          playMessageNotificationSound();
        }
        setMessages((prevMessages) => {
          if (!prevMessages.some((msg) => msg.id === message.id)) {
            return [...prevMessages, { ...message, timestamp: new Date().toISOString() }];
          }
          return prevMessages;
        });
        scrollToBottom();
      } else {
        console.warn('🔴 Ignoring message from a different session:', message);
      }
    };

    socketService.on('receive_message', handleReceiveMessage);

    return () => {
      console.log(`❌ Expert leaving room: ${sessionRoomId}`);
      socketService.off('receive_message', handleReceiveMessage);
      socketService.leaveRoom(sessionRoomId);
    };
  }, [sessionId]);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        setTimeout(() => {
          console.log(`📡 Emitting session_update from expert: ${sessionId}`);
          socketService.emitSessionUpdate(sessionId, { status: 'ONGOING' });
        }, 500);

        const welcomeMessage: Message = {
          id: 'welcome',
          sender: 'expert',
          content: `You are now chatting with ${userName}`,
          timestamp: new Date().toISOString(),
          senderName: 'System',
        };
        setMessages([welcomeMessage]);
        setIsConnecting(false);

        const durationInterval = setInterval(() => {
          const now = new Date();
          const diff = Math.floor((now.getTime() - startTime.current.getTime()) / 1000);
          const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
          const seconds = (diff % 60).toString().padStart(2, '0');
          setDuration(`${minutes}:${seconds}`);
        }, 1000);

        return () => {
          clearInterval(durationInterval);
        };
      } catch (error) {
        console.error('Error initializing expert chat:', error);
        setConnectionError('Failed to connect to chat');
      }
    };

    initializeChat();
  }, [sessionId, userName]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    const handleSessionUpdate = ({ sessionId: updatedSessionId, status }: { sessionId: string; status: "ONGOING" | "COMPLETED" }) => {
      if (updatedSessionId === sessionId && status === "COMPLETED") {
        setChatEnded(true);
        setSessionEndMessage("Chat has ended.");
        onClose();
      }
    };
  
    socketService.on("session_update", handleSessionUpdate);
  
    return () => {
      socketService.off("session_update", handleSessionUpdate);
    };
  }, [sessionId]);
  

  useEffect(() => {
    const handleSessionEnded = ({ sessionId: endedSessionId, endedBy }: { sessionId: string; endedBy: "user" | "expert" }) => {
      if (endedSessionId === sessionId) {
        setChatEnded(true);
        setSessionEndMessage(`Chat ended by ${endedBy === "expert" ? "You" : "User"}.`);
        onClose();
      }
    };
  
    socketService.on("session_ended", handleSessionEnded);
  
    return () => {
      socketService.off("session_ended", handleSessionEnded);
    };
  }, [sessionId]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;
  
    const message: Message = {
      id: uuidv4(),
      sender: 'expert',
      senderName: user?.full_name || 'Expert',
      content: newMessage,
      timestamp: new Date().toISOString(), 
      roomId: `session_${sessionId}`,
    };
  
    console.log(`📡 Sending message from expert:`, message);
    // Emit message to backend
    socketService.emit('send_message', message);
  
    // Update UI for sender (self-message)
    setMessages(prevMessages => [...prevMessages, message]);
    setNewMessage('');
  };
  
  const handleEndChat = async () => {
    setShowExitConfirmation(true);
  };

  const handleConfirmEnd = async () => {
    try {
      if (token) {
        socketService.emit("session_update", {
          sessionId,
          status: "COMPLETED",
        });
        await sessionService.setActiveSessionId(sessionId);
        await new Promise(resolve => setTimeout(resolve, 500)); // Ensure event propagates before leaving
        setTimeout(() => {
          setChatEnded(true);
          setSessionEndMessage("You have ended the chat.");
          socketService.leaveRoom(`session_${sessionId}`); 
          // Leave room LAST
        }, 500);
      }
  
      onClose();
    } catch (error) {
      console.error("Error ending session:", error);
      onClose(); // Force close even if there's an error
    }
  };
  

  if (connectionError) {
    return (
      <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative">
              <img
                src={userImage}
                alt={userName}
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
            <div className="ml-3">
              <h3 className="font-semibold">{userName}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-red-500 mb-4">{connectionError}</div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative">
            <img
              src={userImage}
              alt={userName}
              className="w-10 h-10 rounded-full object-cover"
            />
          </div>
          <div className="ml-3">
            <h3 className="font-semibold">{userName}</h3>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              <span>{duration}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleEndChat}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
         {/* Session End Message */}
    {sessionEndMessage && (
      <div className="p-4 bg-gray-100 text-gray-700 text-center">
        {sessionEndMessage}
      </div>
    )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isConnecting ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-rose-500 border-t-transparent"></div>
          </div>
        ) : (
          messages.map((message) => (
            <div
            key={`${message.id}-${Math.random().toString(36).substr(2, 5)}`}
              className={`flex ${message.sender === 'expert' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender === 'expert'
                    ? 'bg-rose-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="text-xs mb-1 opacity-75">
                  {message.senderName}
                </div>
                <p>{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.sender === 'expert' ? 'text-rose-100' : 'text-gray-500'
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={`${
              !newMessage.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-rose-500 hover:bg-rose-600'
            } text-white p-2 rounded-full`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* End Chat Confirmation Modal */}
      {showExitConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">End Chat Session?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to end this chat session?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowExitConfirmation(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEnd}
                className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertChatWindow;