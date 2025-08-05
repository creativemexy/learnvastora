"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function CallReplayPage() {
  const router = useRouter();
  const params = useParams();
  const callId = params?.callId as string;
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<'chat' | 'transcription' | 'ai-score'>('chat');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tutor/history/${callId}`)
      .then(res => res.json())
      .then(data => { setCall(data); setLoading(false); })
      .catch(() => { setError("Failed to load call details."); setLoading(false); });
  }, [callId]);

  if (loading) return <div className="d-flex justify-content-center align-items-center min-vh-100"><div className="spinner-border text-warning" /></div>;
  if (error) return <div className="text-danger text-center py-5">{error}</div>;
  if (!call) return null;

  return (
    <div className="min-vh-100 bg-white d-flex flex-column">
      {/* Lesson Info Bar */}
      <div className="d-flex align-items-center gap-3 px-4 py-2 border-bottom" style={{ minHeight: 56 }}>
        <i className="bi bi-camera-video-fill text-warning fs-4"></i>
        <div>
          <div className="fw-bold">{call.topic || 'Lesson Topic'}</div>
          <div className="text-muted small">{call.date}</div>
        </div>
        <span className="ms-auto"><button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()}>Back</button></span>
      </div>
      {/* Main Content */}
      <div className="container-fluid flex-grow-1 mt-4">
        <div className="row">
          <main className="col-lg-9">
            <div className="position-relative rounded overflow-hidden bg-dark mb-3" style={{ height: 400, minHeight: 240 }}>
              {call.recordingUrl ? (
                <video src={call.recordingUrl} controls className="w-100 h-100" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100">
                  {call.participants.map((p: any) => (
                    <img key={p.id} src={p.avatar} alt={p.name} className="rounded-circle mx-2" style={{ width: 80, height: 80, objectFit: 'cover', border: '2px solid #fff' }} />
                  ))}
                </div>
              )}
            </div>
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className="text-muted"><i className="bi bi-clock"></i> {call.duration}</span>
              <span className="text-muted">{call.language}</span>
              <span className="text-muted">{call.type === 'group' ? 'Group Call' : 'Private Call'}</span>
            </div>
          </main>
          {/* Sidebar */}
          <aside className="col-lg-3">
            <div className="fw-bold mb-2">Participants</div>
            <ul className="list-unstyled mb-3">
              {call.participants.map((p: any) => (
                <li key={p.id} className="d-flex align-items-center mb-2">
                  <img src={p.avatar} alt={p.name} className="rounded-circle me-2" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                  <span>{p.name}</span>
                  <span className="ms-auto text-muted small">{p.role}</span>
                </li>
              ))}
            </ul>
            {/* Tabs */}
            <ul className="nav nav-tabs nav-justified mb-2" role="tablist">
              <li className="nav-item"><button className={`nav-link${activeTab === 'chat' ? ' active' : ''}`} onClick={() => setActiveTab('chat')}>Chat</button></li>
              <li className="nav-item"><button className={`nav-link${activeTab === 'transcription' ? ' active' : ''}`} onClick={() => setActiveTab('transcription')}>AI Transcription</button></li>
              <li className="nav-item"><button className={`nav-link${activeTab === 'ai-score' ? ' active' : ''}`} onClick={() => setActiveTab('ai-score')}>AI Score</button></li>
            </ul>
            <div className="tab-content">
              <div className={`tab-pane fade${activeTab === 'chat' ? ' show active' : ''}`}>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {call.chat && call.chat.length > 0 ? call.chat.map((msg: any, i: number) => (
                    <div key={i} className="mb-2">
                      <span className="fw-bold">{msg.sender}:</span> <span>{msg.text}</span>
                    </div>
                  )) : <div className="text-muted">No chat messages.</div>}
                </div>
              </div>
              <div className={`tab-pane fade${activeTab === 'transcription' ? ' show active' : ''}`}>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {call.transcription ? <pre className="small">{call.transcription}</pre> : <div className="text-muted">No transcription available.</div>}
                </div>
              </div>
              <div className={`tab-pane fade${activeTab === 'ai-score' ? ' show active' : ''}`}>
                {call.aiScore ? (
                  <div className="d-flex flex-column align-items-center justify-content-center py-4">
                    <div style={{ width: 120, height: 120, position: 'relative' }}>
                      <svg width="120" height="120">
                        <circle cx="60" cy="60" r="54" stroke="#eee" strokeWidth="12" fill="none" />
                        <circle cx="60" cy="60" r="54" stroke="#ff9800" strokeWidth="12" fill="none" strokeDasharray={339.292} strokeDashoffset={339.292 * (1 - call.aiScore.score / 100)} strokeLinecap="round" />
                      </svg>
                      <div className="position-absolute top-50 start-50 translate-middle text-center">
                        <div className="fw-bold" style={{ fontSize: 32 }}>{call.aiScore.score}</div>
                        <div className="text-muted small">Score</div>
                      </div>
                    </div>
                    <div className="fw-bold mt-3 mb-2">{call.aiScore.summary}</div>
                    {call.aiScore.participants && call.aiScore.participants.length > 0 && (
                      <div className="w-100 mt-2">
                        {call.aiScore.participants.map((p: any) => (
                          <div key={p.name} className="d-flex align-items-center justify-content-between mb-1">
                            <span>{p.name}</span>
                            <span className="fw-bold">{p.score}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : <div className="text-muted text-center py-4">No AI score available.</div>}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
} 