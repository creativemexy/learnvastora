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
  }, [params.bookingId, session]);

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="relative text-center z-10">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto" style={{animationDelay: '0.2s'}}></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" style={{animationDelay: '0.4s'}}></div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Initializing Premium Session
          </h2>
          <p className="text-purple-200 text-lg">Setting up your ultra-premium learning experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white/5 backdrop-blur-2xl rounded-3xl p-10 text-center border border-white/10 shadow-2xl">
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Premium Header */}
      <div className="relative z-10 bg-black/20 backdrop-blur-2xl border-b border-white/10 p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className={`w-4 h-4 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                {showConnectionAnimation && (
                  <div className="absolute inset-0 w-4 h-4 rounded-full bg-green-400 animate-ping"></div>
                )}
              </div>
              <span className="text-lg font-semibold text-cyan-300">{connected ? 'Connected' : 'Connecting...'}</span>
            </div>
            
            <div className="h-8 w-px bg-white/20"></div>
            
            <div className="text-lg">
              <span className="text-emerald-300 font-medium">Session Time:</span>
              <span className="ml-3 font-mono text-2xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                {formatTime(sessionTime)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 transition-all duration-300 transform hover:scale-110 border border-cyan-400/30 text-cyan-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            <button
              onClick={endSession}
              className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 px-8 py-3 rounded-2xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl border border-rose-400/30 text-amber-100"
            >
              End Session
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-screen relative z-10">
        {/* Ultra-Premium Video Section */}
        <div className="flex-1 p-8">
          <div className="grid grid-cols-2 gap-8 h-full">
            {/* Local Video */}
            <div className="relative bg-slate-800/40 backdrop-blur-2xl rounded-3xl overflow-hidden border border-cyan-400/20 group shadow-2xl">
              <div className="absolute top-6 left-6 z-20 bg-slate-900/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-cyan-400/30">
                <span className="text-lg font-semibold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">You</span>
              </div>
              <video
                ref={localVideo}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <button className="p-3 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-cyan-400/30 hover:bg-slate-800/90 transition-all duration-200 text-cyan-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button className="p-3 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-cyan-400/30 hover:bg-slate-800/90 transition-all duration-200 text-cyan-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Remote Video */}
            <div className="relative bg-slate-800/40 backdrop-blur-2xl rounded-3xl overflow-hidden border border-emerald-400/20 group shadow-2xl">
              <div className="absolute top-6 left-6 z-20 bg-slate-900/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-emerald-400/30">
                <span className="text-lg font-semibold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Remote</span>
              </div>
              <video
                ref={remoteVideo}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              
              {/* Connection Status */}
              {!connected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-purple-200">Waiting for connection...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ultra-Premium Sidebar */}
        <div className="w-96 bg-slate-800/40 backdrop-blur-2xl border-l border-cyan-400/20">
          {/* Premium Controls */}
          <div className="p-8 border-b border-cyan-400/20">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={toggleRecording}
                className={`p-4 rounded-2xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 border ${
                  isRecording 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-lg shadow-rose-500/20' 
                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30 hover:bg-cyan-500/20 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-400 animate-pulse' : 'bg-white'}`}></div>
                  <span>{isRecording ? 'Recording' : 'Record'}</span>
                </div>
              </button>
              
              <button
                onClick={toggleWhiteboard}
                className={`p-4 rounded-2xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 border ${
                  showWhiteboard 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-500/20' 
                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30 hover:bg-cyan-500/20 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>🎨</span>
                  <span>Whiteboard</span>
                </div>
              </button>
            </div>
          </div>

          {/* Premium Participants */}
          <div className="p-8 border-b border-cyan-400/20">
            <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Participants ({participants.length + 1})
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-cyan-500/5 rounded-2xl border border-cyan-400/20">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <span className="text-lg font-semibold text-cyan-200">You ({(session?.user as any)?.name})</span>
                  <p className="text-sm text-emerald-300">Host</p>
                </div>
              </div>
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center space-x-4 p-4 bg-cyan-500/5 rounded-2xl border border-cyan-400/20">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                  <div className="flex-1">
                    <span className="text-lg font-semibold text-cyan-200">{participant.name}</span>
                    <p className="text-sm text-emerald-300">{participant.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Premium Chat */}
          <div className="flex-1 flex flex-col">
            <div className="p-8 border-b border-cyan-400/20">
              <div className="flex space-x-2">
                {['chat', 'notes', 'files'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 px-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
                      activeTab === tab 
                        ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg' 
                        : 'text-cyan-200/70 hover:text-cyan-200 hover:bg-cyan-500/5'
                    }`}
                  >
                    {tab === 'chat' ? '💬 Chat' : tab === 'notes' ? '📝 Notes' : '📁 Files'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center text-lg font-bold shadow-lg">
                    {message.sender.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg font-semibold text-cyan-300">{message.sender}</span>
                      <span className="text-sm text-cyan-200/50">{message.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className="text-lg text-cyan-100 leading-relaxed">{message.text}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-8 border-t border-cyan-400/20">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-cyan-500/10 border border-cyan-400/30 text-cyan-100 placeholder-cyan-200/50 px-6 py-4 rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent backdrop-blur-xl"
                />
                <button
                  onClick={sendMessage}
                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl text-slate-900"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ultra-Premium Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl flex items-center justify-center z-50">
          <div className="bg-black/40 backdrop-blur-2xl rounded-3xl p-10 w-96 border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-white/50 hover:text-white transition-colors duration-200"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-8">
              <div>
                <label className="block text-lg font-semibold mb-4">Video Quality</label>
                <select 
                  value={videoQuality}
                  onChange={(e) => setVideoQuality(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 text-white px-6 py-4 rounded-2xl text-lg backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="sd">Standard Definition</option>
                  <option value="hd">High Definition</option>
                  <option value="fhd">Full HD</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Audio</span>
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={`w-16 h-8 rounded-full transition-all duration-300 ${
                    audioEnabled ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full transition-transform duration-300 ${
                    audioEnabled ? 'translate-x-8' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Video</span>
                <button
                  onClick={() => setVideoEnabled(!videoEnabled)}
                  className={`w-16 h-8 rounded-full transition-all duration-300 ${
                    videoEnabled ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full transition-transform duration-300 ${
                    videoEnabled ? 'translate-x-8' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ultra-Premium Whiteboard Modal */}
      {showWhiteboard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl flex items-center justify-center z-50">
          <div className="bg-black/40 backdrop-blur-2xl rounded-3xl p-8 w-5/6 h-5/6 border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Interactive Whiteboard</h3>
              <button
                onClick={toggleWhiteboard}
                className="text-white/50 hover:text-white transition-colors duration-200"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-white rounded-2xl h-full flex items-center justify-center shadow-2xl">
              <div className="text-center text-gray-500">
                <div className="text-8xl mb-6">🎨</div>
                <h3 className="text-3xl font-bold mb-4">Whiteboard Coming Soon</h3>
                <p className="text-xl text-gray-400">Advanced collaborative drawing tools will be available here</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 