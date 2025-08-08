"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import Peer from "simple-peer";
import Link from "next/link";

const SIGNAL_SERVER_URL = process.env.NEXT_PUBLIC_SIGNAL_URL || "http://localhost:4000";

export default function SessionPage({ params }: { params: { bookingId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [messages, setMessages] = useState<Array<{id: string, text: string, sender: string, timestamp: Date}>>([]);
  const [newMessage, setNewMessage] = useState("");
  const [participants, setParticipants] = useState<Array<{id: string, name: string, role: string}>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [sessionTime, setSessionTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [videoQuality, setVideoQuality] = useState('hd');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [showConnectionAnimation, setShowConnectionAnimation] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Session timer
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [connected]);

  // Initialize session
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/bookings/${params.bookingId}`);
        if (!response.ok) {
          setError("Booking not found or access denied");
          setLoading(false);
          return;
        }
        
        const bookingData = await response.json();
        setBooking(bookingData);
        
        // Check if user is a participant
        const userId = (session.user as any).id;
        if (![bookingData.studentId, bookingData.tutorId].includes(userId)) {
          setError("You are not a participant in this session");
          setLoading(false);
          return;
        }
        
        setLoading(false);
        initializeVideoCall();
      } catch (error) {
        console.error("Error fetching booking:", error);
        setError("Failed to load session");
        setLoading(false);
      }
    };

    fetchBooking();
  }, [status, session, params.bookingId, router]);

  const initializeVideoCall = useCallback(async () => {
    try {
      console.log("Initializing video call...");
      console.log("Signal server URL:", SIGNAL_SERVER_URL);
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }

      // Connect to signaling server
      const socket = io(SIGNAL_SERVER_URL, {
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      socketRef.current = socket;

      // Add socket error handling
      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setError("Failed to connect to signaling server. Please check your connection.");
      });

      socket.on("connect_timeout", () => {
        console.error("Socket connection timeout");
        setError("Connection to signaling server timed out. Please try again.");
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        if (reason === "io server disconnect") {
          setError("Disconnected from server. Please refresh the page.");
        }
      });

      const userData = {
        id: (session?.user as any).id,
        name: (session?.user as any).name,
        role: (session?.user as any).role,
        avatar: (session?.user as any).image
      };

      socket.emit("join-room", params.bookingId, userData);

      socket.on("room-joined", (roomId) => {
        console.log("Joined room:", roomId);
        setConnected(true);
        setShowConnectionAnimation(false);
      });

      socket.on("peer-joined", (peerData) => {
        console.log("Peer joined:", peerData);
        setParticipants(prev => [...prev, peerData]);
      });

      socket.on("peer-left", (peerData) => {
        console.log("Peer left:", peerData);
        setParticipants(prev => prev.filter(p => p.id !== peerData.socketId));
      });

      socket.on("signal", (data) => {
        if (peerRef.current) {
          peerRef.current.signal(data);
        }
      });

      socket.on("participants-update", (participantsList) => {
        setParticipants(participantsList);
      });

      // Initialize WebRTC peer
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream
      });

      peerRef.current = peer;

      peer.on("signal", (data) => {
        socket.emit("signal", { roomId: params.bookingId, data });
      });

      peer.on("stream", (stream) => {
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = stream;
        }
      });

      peer.on("connect", () => {
        console.log("Peer connection established");
      });

      peer.on("error", (err) => {
        console.error("Peer error:", err);
      });

    } catch (error) {
      console.error("Error initializing video call:", error);
      
      // More specific error handling
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError("Camera and microphone access denied. Please allow permissions and refresh the page.");
        } else if (error.name === 'NotFoundError') {
          setError("No camera or microphone found. Please check your device.");
        } else if (error.name === 'NotReadableError') {
          setError("Camera or microphone is already in use by another application.");
        } else if (error.name === 'OverconstrainedError') {
          setError("Camera or microphone doesn't meet the required constraints.");
        } else if (error.message.includes('getUserMedia')) {
          setError("Failed to access camera and microphone. Please check permissions.");
        } else {
          setError(`Failed to initialize video call: ${error.message}`);
        }
      } else {
        setError("Failed to initialize video call. Please check your connection and try again.");
      }
      
      // Auto-retry for certain errors
      if (retryCount < 3 && error instanceof Error && 
          (error.name === 'NotReadableError' || error.message.includes('getUserMedia'))) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          initializeVideoCall();
        }, 2000);
      }
    }
  }, [params.bookingId, session, retryCount]);

  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !socketRef.current) return;

    const message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: (session?.user as any).name,
      timestamp: new Date()
    };

    socketRef.current.emit("chat-message", { 
      roomId: params.bookingId, 
      msg: message 
    });

    setMessages(prev => [...prev, message]);
    setNewMessage("");
  }, [newMessage, params.bookingId, session]);

  const toggleRecording = useCallback(() => {
    setIsRecording(!isRecording);
  }, [isRecording]);

  const toggleWhiteboard = useCallback(() => {
    setShowWhiteboard(!showWhiteboard);
  }, [showWhiteboard]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    // TODO: Implement actual mute functionality
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    setIsVideoOff(!isVideoOff);
    // TODO: Implement actual video toggle functionality
  }, [isVideoOff]);

  const endSession = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    router.push('/dashboard');
  }, [router]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="relative text-center z-10">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" style={{animationDelay: '0.2s'}}></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" style={{animationDelay: '0.4s'}}></div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Initializing Session
          </h2>
          <p className="text-purple-200 text-lg">Setting up your premium learning experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white/10 backdrop-blur-2xl rounded-3xl p-10 text-center border border-white/20 shadow-2xl">
          <div className="text-red-400 mb-8">
            <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-6">Session Error</h2>
          <p className="text-purple-200 mb-10 text-lg">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                setError("");
                setRetryCount(0);
                initializeVideoCall();
              }}
              className="inline-block bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-2xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Connection
            </button>
            <Link href="/dashboard" className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-xl">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-black/30 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                {showConnectionAnimation && (
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping"></div>
                )}
              </div>
              <span className="text-sm font-medium text-gray-300">{connected ? 'Connected' : 'Connecting...'}</span>
            </div>
            
            <div className="h-6 w-px bg-white/20"></div>
            
            <div className="text-sm">
              <span className="text-gray-300">Session Time:</span>
              <span className="ml-2 font-mono text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {formatTime(sessionTime)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex h-[calc(100vh-80px)]">
        {/* Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Main Video */}
          <div className="flex-1 relative bg-black/50 rounded-2xl m-4 overflow-hidden">
            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-black/80 rounded-xl overflow-hidden border-2 border-white/20">
              <video
                ref={localVideo}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                </div>
              )}
            </div>

            {/* Session Info Overlay */}
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-xl p-3">
              <div className="text-sm text-gray-300">
                <div className="font-medium">{booking?.subject || 'Session'}</div>
                <div className="text-xs text-gray-400">{participants.length} participants</div>
              </div>
            </div>
          </div>

          {/* Control Bar */}
          <div className="bg-black/30 backdrop-blur-xl border-t border-white/10 p-4">
            <div className="flex justify-center items-center space-x-4">
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-all duration-200 ${
                  isMuted 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMuted ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  )}
                </svg>
              </button>

              {/* Video Toggle */}
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-all duration-200 ${
                  isVideoOff 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isVideoOff ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  )}
                </svg>
              </button>

              {/* Record Button */}
              <button
                onClick={toggleRecording}
                className={`p-4 rounded-full transition-all duration-200 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Whiteboard Button */}
              <button
                onClick={toggleWhiteboard}
                className={`p-4 rounded-full transition-all duration-200 ${
                  showWhiteboard 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              {/* End Session */}
              <button
                onClick={endSession}
                className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-black/30 backdrop-blur-xl border-l border-white/10 flex flex-col">
          {/* Chat Section */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Chat</h3>
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {showChat && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className="flex flex-col">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs text-gray-400">{message.sender}</span>
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3 text-sm">
                        {message.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-white/10">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendMessage}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Participants Section */}
          {showParticipants && (
            <div className="border-t border-white/10">
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-3">Participants ({participants.length})</h3>
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center space-x-3 p-2 rounded-lg bg-white/5">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-xs font-medium">
                        {participant.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{participant.name}</div>
                        <div className="text-xs text-gray-400">{participant.role}</div>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Whiteboard Overlay */}
      {showWhiteboard && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-11/12 h-5/6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Whiteboard</h2>
              <button
                onClick={toggleWhiteboard}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-lg font-medium">Whiteboard Coming Soon</p>
                <p className="text-sm">Interactive drawing and collaboration tools will be available here.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 