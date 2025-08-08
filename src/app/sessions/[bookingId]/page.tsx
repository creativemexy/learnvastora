"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import Peer from "simple-peer";
import Link from "next/link";
import "./session-page.css";

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
  const [activeSidebar, setActiveSidebar] = useState('chat'); // 'chat' or 'participants'

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Initializing Session</h2>
          <p className="text-gray-600">Setting up your learning experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 mb-6">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Session Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setError("");
                setRetryCount(0);
                initializeVideoCall();
              }}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry Connection
            </button>
            <Link href="/dashboard" className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="session-container">
      {/* Left Navigation Sidebar */}
      <div className="nav-sidebar">
        {/* Logo */}
        <div className="nav-logo">
          <div className="nav-logo-inner">
            <span className="nav-logo-text">LV</span>
          </div>
        </div>

        {/* Navigation Icons */}
        <div className="nav-icons">
          <button className="nav-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <button className="nav-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          
          <button className="nav-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          <button className="nav-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </button>
          
          <button className="nav-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          
          <button className="nav-icon active">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* User Avatar */}
        <div className="user-avatar">
          <span>
            {(session?.user as any)?.name?.charAt(0) || 'U'}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <div className="top-header">
          <div className="header-content">
            <div className="header-left">
              <button onClick={() => router.back()} className="back-button">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div>
                <h1 className="session-title">
                  {booking?.subject || 'Learning Session'}
                </h1>
                <div className="session-info">
                  <span className="participant-count">Invited to the call: {participants.length}</span>
                  <span className="absent-count">Absent people: 0</span>
                </div>
              </div>
            </div>
            
            <div className="header-right">
              <button className="team-button">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span>Team</span>
              </button>
              
              <button className="add-user-button">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add user to the call</span>
              </button>
            </div>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 flex">
          {/* Main Video Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 relative bg-gray-900 rounded-lg m-4 overflow-hidden">
              {/* Main Video */}
              <video
                ref={remoteVideo}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Local Video (Picture-in-Picture) */}
              <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-white">
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
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">T</span>
                  </div>
                  <div className="text-white text-sm">
                    <div className="font-medium">Tutor</div>
                    <div className="text-xs text-gray-300">{(session?.user as any)?.name}</div>
                  </div>
                </div>
              </div>

              {/* Recording Indicator */}
              {isRecording && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded-full flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">{formatTime(sessionTime)}</span>
                </div>
              )}

              {/* Control Bar */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3 flex items-center space-x-4">
                {/* Volume Slider */}
                <div className="w-20 h-1 bg-gray-600 rounded-full">
                  <div className="w-12 h-1 bg-white rounded-full"></div>
                </div>

                {/* Fullscreen */}
                <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>

                {/* Mute Button */}
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-full transition-colors ${
                    isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMuted ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    )}
                  </svg>
                </button>

                {/* End Call */}
                <button
                  onClick={endSession}
                  className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>

                {/* Video Toggle */}
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition-colors ${
                    isVideoOff ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isVideoOff ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    )}
                  </svg>
                </button>

                {/* Settings */}
                <button className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Audio Waveform/Transcript */}
            <div className="mx-4 mb-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="w-1 bg-green-500 rounded-full" style={{ height: `${Math.random() * 20 + 5}px` }}></div>
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  "Thanks for sending all those completed transcripts through - we've been really happy..."
                </span>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveSidebar('chat')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeSidebar === 'chat' 
                    ? 'text-green-600 border-b-2 border-green-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Messages
              </button>
              <button
                onClick={() => setActiveSidebar('participants')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeSidebar === 'participants' 
                    ? 'text-green-600 border-b-2 border-green-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Participants
              </button>
            </div>

            {/* Chat Messages */}
            {activeSidebar === 'chat' && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {message.sender?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-800">{message.sender}</span>
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                          {message.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Typing Indicator */}
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">M</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Martin is typing<span className="animate-pulse">...</span>
                    </div>
                  </div>
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Write your message..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <button
                      onClick={sendMessage}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Participants List */}
            {activeSidebar === 'participants' && (
              <div className="flex-1 p-4">
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {participant.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">{participant.name}</div>
                        <div className="text-xs text-gray-500">{participant.role}</div>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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