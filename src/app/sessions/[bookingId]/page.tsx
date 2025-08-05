"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import Peer from "simple-peer";
import { toast } from "react-hot-toast";
import nextDynamic from "next/dynamic";
import { Modal, Button } from "react-bootstrap";
import Link from "next/link";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

const Whiteboard = nextDynamic(() => import("./Whiteboard"), { ssr: false });

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
  
  // Session timing state
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(60); // Default 60 minutes
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reactions, setReactions] = useState<{[key: number]: string[]}>({});
  
  // Recording state
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [whiteboardVisible, setWhiteboardVisible] = useState(false);

  // Timer for session management
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // AI Score state
  const [aiScore, setAiScore] = useState<{ score: number; summary: string; participants?: { name: string; score: number }[] } | null>(null);
  const [aiScoreLoading, setAiScoreLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'transcription' | 'ai-score'>('chat');

  // Add at the top:
  const [participants, setParticipants] = useState<any[]>([]); // [{id, name, avatar, role, muted, ...}]
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [showParticipantModal, setShowParticipantModal] = useState(false);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [networkQuality, setNetworkQuality] = useState(5); // 1-5 bars
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null); // Assume you have this
  const [dropRate, setDropRate] = useState(0);
  const [bandwidth, setBandwidth] = useState(0);
  const lastBytesSentRef = useRef(0);
  const lastTimestampRef = useRef(0);

  const [transcript, setTranscript] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [pronunciationFeedback, setPronunciationFeedback] = useState('');
  const [grammarFeedback, setGrammarFeedback] = useState('');
  const recognitionRef = useRef<any>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [waitingRoom, setWaitingRoom] = useState(true);
  const [deviceTestModal, setDeviceTestModal] = useState(false);
  const [tutorPresent, setTutorPresent] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileParticipants, setShowMobileParticipants] = useState(false);
  const [showMobileAI, setShowMobileAI] = useState(false);

  const [canJoinSession, setCanJoinSession] = useState(false);
  const [joinTooltip, setJoinTooltip] = useState('');

  // Helper: get tutor info
  const tutorInfo = useMemo(() => {
    if (!booking) return null;
    if (booking.tutor) return booking.tutor;
    if (participants.length > 0) return participants.find(p => p.role === 'TUTOR');
    return null;
  }, [booking, participants]);

  // Helper: get tutor avatar
  const getTutorAvatar = () => {
    if (!tutorInfo) return '';
    if (tutorInfo.photo) return tutorInfo.photo;
    return '/api/placeholder/80/80';
  };

  const getCountdown = () => {
    if (!booking?.scheduledAt) return null;
    const now = new Date();
    const scheduled = new Date(booking.scheduledAt);
    const diff = scheduled.getTime() - now.getTime();
    if (diff <= 0) return null;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Event handlers
  const handleTutorJoin = (user: any) => {
    setTutorPresent(true);
    addNotification(`${user.name} joined the session`);
  };

  const handleJoin = (user: any) => {
    addNotification(`${user.name} joined the session`);
  };

  const handleLeave = (user: any) => {
    addNotification(`${user.name} left the session`);
  };

  const initializeSessionTiming = (booking: any) => {
    if (booking.scheduledAt) {
      const scheduled = new Date(booking.scheduledAt);
      const now = new Date();
      const diff = scheduled.getTime() - now.getTime();
      
      if (diff > 0) {
        // Session hasn't started yet
        setTimeout(() => {
          setSessionStartTime(new Date());
          startSessionTimer();
        }, diff);
      } else {
        // Session should have started
        setSessionStartTime(new Date());
        startSessionTimer();
      }
    } else {
      // No scheduled time, start immediately
      setSessionStartTime(new Date());
      startSessionTimer();
    }
  };

  const startSessionTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          setSessionEnded(true);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, message]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== message));
    }, 5000);
  };

  const endSession = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Update booking status
    try {
      await fetch(`/api/bookings/${params.bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
    
    router.push('/bookings');
  };

  const handleEndSession = () => {
    setShowEndSessionModal(true);
  };

  const confirmEndSession = () => {
    endSession();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  function startVideoCall() {
    // Initialize video call logic here
    console.log('Starting video call...');
  }

  // All useEffect hooks must be called at the top level
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/auth/signin");
      return;
    }
    
    // Fetch previous messages
    fetch(`/api/messages?bookingId=${params.bookingId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data.map((m: any) => ({ sender: m.sender?.name || "User", text: m.content })));
      });
      
    // Fetch booking and check access
    fetch(`/api/bookings/${params.bookingId}`)
      .then(res => res.json())
      .then(async booking => {
        console.log("Booking data:", booking);
        
        if (!booking) {
          setError("Session not found.");
          setLoading(false);
          return;
        }
        
        // Auto-update status if paid but still pending
        if (booking.status === "PENDING" && booking.paidAt) {
          setLoading(true);
          await fetch(`/api/bookings/${params.bookingId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CONFIRMED' })
          });
          // Refetch booking after update
          fetch(`/api/bookings/${params.bookingId}`)
            .then(res => res.json())
            .then(updatedBooking => {
              window.location.reload();
            });
          return;
        }
        
        // Check if booking status allows session access
        const allowedStatuses = ["PAID", "CONFIRMED", "IN_PROGRESS"];
        if (!allowedStatuses.includes(booking.status)) {
          setError(`Session not available. Booking status: ${booking.status}`);
          setLoading(false);
          return;
        }
        
        // Check if payment is required and not completed
        if (!booking.paidAt) {
          setError("Payment required before starting session. Please complete payment first.");
          setLoading(false);
          return;
        }
        
        const userId = (session.user as any).id;
        if (![booking.studentId, booking.tutorId].includes(userId)) {
          setError("You are not a participant in this session.");
          setLoading(false);
          return;
        }
        
        console.log("Session access granted for user:", userId);
        setBooking(booking);
        setLoading(false);
        
        // Initialize session timing
        initializeSessionTiming(booking);
        startVideoCall();
      })
      .catch((error) => { 
        console.error("Session fetch error:", error);
        setError("Session not found."); 
        setLoading(false); 
      });
  }, [status, session, params.bookingId, router]);

  // Dynamic participants: listen for updates from the server
  useEffect(() => {
    if (!socketRef.current) return;
    // Listen for participant list updates
    socketRef.current.on("participants-update", (list: any) => {
      setParticipants(list);
    });
    // Request the current list on join
    socketRef.current.emit("get-participants", params.bookingId);
    return () => {
      socketRef.current.off("participants-update");
    };
  }, [params.bookingId]);

  // Toast for join/leave events
  useEffect(() => {
    if (!socketRef.current) return;
    socketRef.current.on("user-joined", handleJoin);
    socketRef.current.on("user-left", handleLeave);
    socketRef.current.on("tutor-joined", handleTutorJoin);
    return () => {
      socketRef.current.off("user-joined");
      socketRef.current.off("user-left");
      socketRef.current.off("tutor-joined");
    };
  }, []);

  // Chat auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if user can join session
  useEffect(() => {
    if (!booking?.scheduledAt) {
      setCanJoinSession(true);
      setJoinTooltip('Session can be joined immediately');
      return;
    }
    
    const now = new Date();
    const scheduled = new Date(booking.scheduledAt);
    const diff = scheduled.getTime() - now.getTime();
    
    if (diff <= 0) {
      setCanJoinSession(true);
      setJoinTooltip('Session is ready to join');
    } else {
      setCanJoinSession(false);
      setJoinTooltip(`Session starts in ${Math.floor(diff / 60000)} minutes`);
    }
  }, [booking?.scheduledAt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Video call effects
  useEffect(() => {
    if (!localVideo.current || !remoteVideo.current) return;
    
    const localVideoEl = localVideo.current;
    const remoteVideoEl = remoteVideo.current;
    
    return () => {
      if (localVideoEl.srcObject) {
        const tracks = (localVideoEl.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      if (remoteVideoEl.srcObject) {
        const tracks = (remoteVideoEl.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Network quality monitoring
  useEffect(() => {
    if (!peerConnectionRef.current) return;
    
    const interval = setInterval(() => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.getStats().then(stats => {
          stats.forEach(report => {
            if (report.type === 'outbound-rtp' && report.bytesSent) {
              const now = Date.now();
              const bytesSent = report.bytesSent;
              
              if (lastBytesSentRef.current > 0) {
                const bytesDiff = bytesSent - lastBytesSentRef.current;
                const timeDiff = now - lastTimestampRef.current;
                const bandwidthKbps = (bytesDiff * 8) / (timeDiff * 1000);
                setBandwidth(bandwidthKbps);
              }
              
              lastBytesSentRef.current = bytesSent;
              lastTimestampRef.current = now;
            }
          });
        });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript + interimTranscript);
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Pronunciation recording
  useEffect(() => {
    if (!mediaRecorderRef.current) return;
    
    const mediaRecorder = mediaRecorderRef.current;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      // TODO: Implement pronunciation audio upload functionality
      console.log('Pronunciation audio recorded:', audioBlob);
      audioChunksRef.current = [];
    };
    
    return () => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };
  }, []);

  // Rest of the component logic...

  // Fetch session recordings
  const fetchRecordings = useCallback(() => {
    fetch(`/api/sessions/${params.bookingId}/recordings`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setRecordings(data);
      });
  }, [params.bookingId]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  // Fetch AI score when AI Score tab is active
  useEffect(() => {
    if (activeTab === 'ai-score' && !aiScore && !aiScoreLoading) {
      setAiScoreLoading(true);
      fetch(`/api/sessions/${params.bookingId}/ai-score`).then(res => res.json()).then(data => {
        setAiScore(data);
        setAiScoreLoading(false);
      }).catch(() => setAiScoreLoading(false));
    }
  }, [activeTab, aiScore, aiScoreLoading, params.bookingId]);

  useEffect(() => {
    if (!transcript) return;
    const interval = setInterval(() => {
      fetch(`/api/sessions/${params.bookingId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      })
        .then(res => res.json())
        .then(data => {
          setAiSummary(data.summary || '');
          setPronunciationFeedback(data.pronunciation || '');
          setGrammarFeedback(data.grammar || '');
        });
    }, 15000); // every 15 seconds
    return () => clearInterval(interval);
  }, [transcript, params.bookingId]);

  // Show review modal when session ends
  useEffect(() => {
    if (sessionEnded) setShowReviewModal(true);
  }, [sessionEnded]);

  // Typing indicator logic (simulate for demo)
  useEffect(() => {
    if (!socketRef.current) return;
    socketRef.current.on('typing', (user: any) => {
      if (user.role === 'TUTOR') setTyping(true);
      setTimeout(() => setTyping(false), 2000);
    });
    return () => { socketRef.current?.off('typing'); };
  }, [socketRef.current]);

  const handleInputChange = (e: any) => {
    setChatInput(e.target.value);
    if (socketRef.current) socketRef.current.emit('typing', { role: 'STUDENT' });
  };

  const handleAddReaction = (msgIdx: number, emoji: string) => {
    setReactions(prev => ({ ...prev, [msgIdx]: [...(prev[msgIdx] || []), emoji] }));
  };

  const handleToggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };

  const handleToggleVideo = () => {
    setVideoEnabled(!videoEnabled);
  };

  const [feedbackHighlight, setFeedbackHighlight] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Animate feedback highlight on update
  useEffect(() => {
    if (aiSummary || pronunciationFeedback || grammarFeedback) {
      setFeedbackHighlight(true);
      setTimeout(() => setFeedbackHighlight(false), 1200);
    }
  }, [aiSummary, pronunciationFeedback, grammarFeedback]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [networkTooltip, setNetworkTooltip] = useState(false);
  const networkLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  const handleMessageParticipant = (participant: any) => {
    setActiveTab('chat');
    setShowMobileChat(true);
    setChatInput(`@${participant.name} `);
  };
  const handleReportParticipant = (participant: any) => {
    toast('Reported ' + participant.name, { icon: '🚩' });
  };
  const handleAddRegular = (participant: any) => {
    toast('Added ' + participant.name + ' to Regulars!', { icon: '⭐' });
  };

  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: '#f8f9fa', color: '#333', position: 'relative' }}>
      {/* Modern Header */}
      <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ 
        backgroundColor: 'rgba(255,255,255,0.9)', 
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ 
            width: 40, 
            height: 40, 
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            color: 'white'
          }}>
            <i className="bi bi-camera-video-fill"></i>
          </div>
          <div>
            <div className="fw-bold text-dark">{booking?.topic || 'Lesson Session'}</div>
            <div className="text-muted small">{booking?.scheduledAt ? new Date(booking.scheduledAt).toLocaleString() : ''}</div>
          </div>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <div className={`rounded-circle ${connected ? 'bg-success' : 'bg-warning'}`} style={{ width: 8, height: 8 }}></div>
            <span className="text-dark small">{connected ? 'Connected' : 'Connecting...'}</span>
          </div>
          <div className="d-flex align-items-center gap-2 px-3 py-1 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
            <i className="bi bi-clock text-warning"></i>
            <span className="text-dark fw-bold">{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      {/* Main Video Area - Responsive */}
      <div className={`flex-grow-1 d-flex position-relative ${isMobile ? 'flex-column' : ''}`} style={{ minHeight: 0 }}>
        {/* Video Grid - stack vertically on mobile */}
        <div className={`flex-grow-1 d-flex align-items-center justify-content-center p-4 ${isMobile ? 'flex-column' : ''}`} style={{ maxWidth: isMobile ? '100%' : '1200px', width: '100%' }}>
          {/* Main Speaker Video */}
          {participants[0] && (
            <div className="position-relative rounded-3 overflow-hidden" style={{
              backgroundColor: '#fff',
              border: '2px solid rgba(0,0,0,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              width: '400px',
              height: '300px'
            }}>
              <video 
                ref={remoteVideo} 
                autoPlay 
                playsInline 
                className="w-100 h-100" 
                style={{ objectFit: 'cover' }} 
              />
              <div className="position-absolute bottom-0 start-0 end-0 p-3" style={{
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))'
              }}>
                <div className="d-flex align-items-center gap-3">
                  <img 
                    src={participants[0].avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(participants[0].name)}&background=random`} 
                    alt={participants[0].name} 
                    className="rounded-circle border border-white" 
                    style={{ width: 40, height: 40, objectFit: 'cover' }} 
                  />
                  <div>
                    <div className="text-white fw-bold">{participants[0].name}</div>
                    <div className="text-light small d-flex align-items-center gap-2">
                      <span>{participants[0].role === 'TUTOR' ? 'Tutor' : 'Student'}</span>
                      <span className="text-success">● Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Local Video Preview */}
          <div className="position-relative rounded-3 overflow-hidden" style={{
            backgroundColor: '#fff',
            border: '2px solid rgba(0,0,0,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            width: '200px',
            height: '150px'
          }}>
            <video 
              ref={localVideo} 
              autoPlay 
              playsInline 
              muted 
              className="w-100 h-100" 
              style={{ objectFit: 'cover' }} 
            />
            <div className="position-absolute bottom-0 start-0 end-0 p-2" style={{
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))'
            }}>
              <div className="d-flex align-items-center gap-2">
                <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary" style={{ width: 24, height: 24 }}>
                  <i className="bi bi-person-fill text-white small"></i>
                </div>
                <div>
                  <div className="text-white small fw-bold">You</div>
                  <div className="text-light small">{booking?.studentId === (session?.user as any)?.id ? 'Student' : 'Tutor'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Other Participants */}
          {participants.slice(1, 4).map((p, idx) => (
            <div key={p.id} className="position-relative rounded-3 overflow-hidden" style={{
              backgroundColor: '#fff',
              border: '2px solid rgba(0,0,0,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              width: '200px',
              height: '150px',
              cursor: 'pointer'
            }} onClick={() => { setSelectedParticipant(p); setShowParticipantModal(true); }}>
              <img 
                src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`} 
                alt={p.name} 
                className="w-100 h-100" 
                style={{ objectFit: 'cover' }} 
              />
              <div className="position-absolute bottom-0 start-0 end-0 p-2" style={{
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))'
              }}>
                <div className="d-flex align-items-center gap-2">
                  <img 
                    src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`} 
                    alt={p.name} 
                    className="rounded-circle border border-white" 
                    style={{ width: 24, height: 24, objectFit: 'cover' }} 
                  />
                  <div>
                    <div className="text-white small fw-bold">{p.name}</div>
                    <div className="text-light small">{p.role === 'TUTOR' ? 'Tutor' : 'Student'}</div>
                  </div>
                </div>
              </div>
              {p.muted && (
                <div className="position-absolute top-0 end-0 m-2 d-flex align-items-center justify-content-center rounded-circle bg-danger" style={{ width: 24, height: 24 }}>
                  <i className="bi bi-mic-mute-fill text-white" style={{ fontSize: '10px' }}></i>
                </div>
              )}
              {p.role === 'TUTOR' && (
                <div className="position-absolute top-0 start-0 m-2 d-flex align-items-center justify-content-center rounded-circle bg-warning" style={{ width: 24, height: 24 }}>
                  <i className="bi bi-star-fill text-white" style={{ fontSize: '10px' }}></i>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Sidebar overlays for mobile */}
        {isMobile && showMobileChat && (
          <div className="position-fixed top-0 start-0 w-100 h-100 bg-white" style={{ zIndex: 2000, animation: 'fadeIn 0.2s' }}>
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
              <h5 className="mb-0">Chat</h5>
              <button className="btn btn-link" onClick={() => setShowMobileChat(false)}><i className="bi bi-x-lg fs-4"></i></button>
            </div>
            {/* Chat content here (reuse chat tab) */}
            {/* ... */}
          </div>
        )}
        {isMobile && showMobileParticipants && (
          <div className="position-fixed top-0 start-0 w-100 h-100 bg-white" style={{ zIndex: 2000, animation: 'fadeIn 0.2s' }}>
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
              <h5 className="mb-0">Participants</h5>
              <button className="btn btn-link" onClick={() => setShowMobileParticipants(false)}><i className="bi bi-x-lg fs-4"></i></button>
            </div>
            <div className="participants-list" style={{ maxHeight: 300, overflowY: 'auto' }}>
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="d-flex align-items-center gap-3 mb-3 p-2 rounded participant-item"
                  style={{
                    backgroundColor: 'rgba(255,152,0,0.04)',
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                    border: '1.5px solid #ff9800',
                    borderRadius: 16,
                    boxShadow: '0 2px 8px rgba(255,152,0,0.04)'
                  }}
                  tabIndex={0}
                  aria-label={`Participant: ${participant.name}, Role: ${participant.role}`}
                >
                  <div className="position-relative">
                    <img
                      src={participant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name)}&background=ff9800&color=fff&bold=true`}
                      alt={participant.name}
                      className="rounded-circle"
                      style={{ width: 44, height: 44, objectFit: 'cover', border: '2px solid #ff9800' }}
                    />
                    <div className={`position-absolute bottom-0 end-0 rounded-circle ${participant.muted ? 'bg-danger' : 'bg-success'}`} style={{ width: 12, height: 12, border: '2px solid #fff8f0' }}></div>
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-bold" style={{ color: '#ff9800' }}>{participant.name}</div>
                    <div className="text-muted small d-flex align-items-center gap-2">
                      <span>{participant.role === 'TUTOR' ? 'Tutor' : 'Student'}</span>
                      {participant.muted && <i className="bi bi-mic-mute-fill text-danger"></i>}
                      <span className="ms-2" title={`Network: ${networkLabels[participant.networkQuality-1] || 'Unknown'}`}>{[1,2,3,4,5].map(bar => (
                        <span key={bar} style={{ display: 'inline-block', width: 4, height: 10, marginRight: 1, background: bar <= (participant.networkQuality || 3) ? '#ff9800' : '#e0e0e0', borderRadius: 1 }}></span>
                      ))}</span>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <OverlayTrigger placement="top" overlay={<Tooltip>Message</Tooltip>}>
                      <button className="btn btn-outline-secondary btn-sm rounded-circle" style={{ width: 32, height: 32 }} aria-label={`Message ${participant.name}`} onClick={() => handleMessageParticipant(participant)}><i className="bi bi-chat-dots"></i></button>
                    </OverlayTrigger>
                    <OverlayTrigger placement="top" overlay={<Tooltip>Report</Tooltip>}>
                      <button className="btn btn-outline-danger btn-sm rounded-circle" style={{ width: 32, height: 32 }} aria-label={`Report ${participant.name}`} onClick={() => handleReportParticipant(participant)}><i className="bi bi-flag"></i></button>
                    </OverlayTrigger>
                    <OverlayTrigger placement="top" overlay={<Tooltip>Add to Regulars</Tooltip>}>
                      <button className="btn btn-outline-warning btn-sm rounded-circle" style={{ width: 32, height: 32 }} aria-label={`Add ${participant.name} to Regulars`} onClick={() => handleAddRegular(participant)}><i className="bi bi-star"></i></button>
                    </OverlayTrigger>
                  </div>
                </div>
              ))}
              {participants.length === 0 && (
                <div className="text-muted text-center py-4">
                  <i className="bi bi-people fs-4 d-block mb-2"></i>
                  <div className="small">No participants yet</div>
                </div>
              )}
            </div>
            {/* ... */}
          </div>
        )}
        {isMobile && showMobileAI && (
          <div className="position-fixed top-0 start-0 w-100 h-100 bg-white" style={{ zIndex: 2000, animation: 'fadeIn 0.2s' }}>
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
              <h5 className="mb-0">AI Feedback</h5>
              <button className="btn btn-link" onClick={() => setShowMobileAI(false)}><i className="bi bi-x-lg fs-4"></i></button>
            </div>
            {/* AI Feedback content here (reuse AI tab) */}
            {/* ... */}
          </div>
        )}
        {/* Desktop sidebar as before */}
        {!isMobile && (
          <div className="session-sidebar">
            {/* ... sidebar content ... */}
          </div>
        )}
      </div>

      {/* Floating Action Buttons (FABs) for mobile */}
      {isMobile && (
        <div className="position-fixed bottom-0 start-0 end-0 d-flex justify-content-center gap-3 pb-3" style={{ zIndex: 3000 }}>
          <button className="btn cambly-btn rounded-circle shadow-lg" style={{ width: 56, height: 56 }} onClick={() => setShowMobileChat(true)}><i className="bi bi-chat-dots fs-4"></i></button>
          <button className="btn cambly-btn rounded-circle shadow-lg" style={{ width: 56, height: 56 }} onClick={() => setShowMobileParticipants(true)}><i className="bi bi-people fs-4"></i></button>
          <button className="btn cambly-btn rounded-circle shadow-lg" style={{ width: 56, height: 56 }} onClick={() => setShowMobileAI(true)}><i className="bi bi-graph-up fs-4"></i></button>
          {/* Add more FABs for controls if needed */}
        </div>
      )}
      {/* Controls fixed at bottom on mobile */}
      {isMobile && (
        <div className="position-fixed bottom-0 start-0 end-0 d-flex align-items-center gap-3 justify-content-center floating-controls" style={{ position: isMobile ? 'fixed' : 'absolute', bottom: isMobile ? 24 : '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 2000, background: 'rgba(255,255,255,0.95)', borderRadius: 40, boxShadow: '0 4px 20px rgba(255,152,0,0.08)', padding: isMobile ? '0.5em 1em' : '0.75em 1.5em' }}>
  {/* Mute/Unmute Audio */}
  <OverlayTrigger placement="top" overlay={<Tooltip id="audio-tooltip">{audioEnabled ? 'Mute' : 'Unmute'} Microphone</Tooltip>}>
    <button
      className={`control-btn d-flex align-items-center justify-content-center rounded-circle ${audioEnabled ? 'bg-white' : 'bg-secondary text-white'}`}
      style={{ width: 56, height: 56, fontSize: 24, border: 'none', boxShadow: audioEnabled ? '0 2px 8px #ff9800' : 'none', transition: 'all 0.2s', outline: 'none' }}
      aria-label={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
      tabIndex={0}
      onClick={handleToggleAudio}
    >
      <i className={`bi ${audioEnabled ? 'bi-mic-fill text-warning' : 'bi-mic-mute-fill text-white'}`}></i>
    </button>
  </OverlayTrigger>
  {/* Turn On/Off Video */}
  <OverlayTrigger placement="top" overlay={<Tooltip id="video-tooltip">{videoEnabled ? 'Turn Off' : 'Turn On'} Camera</Tooltip>}>
    <button
      className={`control-btn d-flex align-items-center justify-content-center rounded-circle ${videoEnabled ? 'bg-white' : 'bg-secondary text-white'}`}
      style={{ width: 56, height: 56, fontSize: 24, border: 'none', boxShadow: videoEnabled ? '0 2px 8px #ff9800' : 'none', transition: 'all 0.2s', outline: 'none' }}
      aria-label={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
      tabIndex={0}
      onClick={handleToggleVideo}
    >
      <i className={`bi ${videoEnabled ? 'bi-camera-video-fill text-warning' : 'bi-camera-video-off-fill text-white'}`}></i>
    </button>
  </OverlayTrigger>
  {/* Screen Share (placeholder) */}
  <OverlayTrigger placement="top" overlay={<Tooltip id="screen-tooltip">Share Screen</Tooltip>}>
    <button
      className="control-btn d-flex align-items-center justify-content-center rounded-circle bg-white"
      style={{ width: 56, height: 56, fontSize: 24, border: 'none', boxShadow: '0 2px 8px #ff9800', transition: 'all 0.2s', outline: 'none' }}
      aria-label="Share Screen"
      tabIndex={0}
      // onClick={handleScreenShare}
    >
      <i className="bi bi-display text-warning"></i>
    </button>
  </OverlayTrigger>
  {/* Network Quality Indicator */}
  <OverlayTrigger placement="top" overlay={<Tooltip id="network-tooltip">Network: {networkLabels[networkQuality-1]}</Tooltip>}>
    <div className="d-flex align-items-center gap-1" style={{ cursor: 'pointer' }} aria-label={`Network quality: ${networkLabels[networkQuality-1]}`}> 
      {[1,2,3,4,5].map(bar => (
        <div key={bar} style={{ width: 6, height: 18, borderRadius: 2, background: bar <= networkQuality ? '#ff9800' : '#e0e0e0', marginRight: 2, transition: 'background 0.2s' }}></div>
      ))}
    </div>
  </OverlayTrigger>
  {/* End Call */}
  <OverlayTrigger placement="top" overlay={<Tooltip id="end-tooltip">End Session</Tooltip>}>
    <button
      className="control-btn d-flex align-items-center justify-content-center rounded-circle bg-danger text-white"
      style={{ width: 56, height: 56, fontSize: 24, border: 'none', boxShadow: '0 2px 8px #ff9800', transition: 'all 0.2s', outline: 'none' }}
      aria-label="End Session"
      tabIndex={0}
      onClick={() => setShowEndCallModal(true)}
    >
      <i className="bi bi-telephone-x-fill"></i>
    </button>
  </OverlayTrigger>
  {/* End Call Confirmation Modal */}
  <Modal show={showEndCallModal} onHide={() => setShowEndCallModal(false)} centered>
    <Modal.Header closeButton>
      <Modal.Title>End Session?</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      Are you sure you want to end the session for everyone?
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={() => setShowEndCallModal(false)}>Cancel</Button>
      <Button variant="danger" onClick={confirmEndSession}>End Session</Button>
    </Modal.Footer>
  </Modal>
</div>
      )}
    </div>
  );
} 