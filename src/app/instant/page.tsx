"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";
import StudentNavbar from "@/components/StudentNavbar";

interface OnlineTutor {
  id: string;
  name: string;
  email: string;
  bio?: string;
  skills: string[];
  instantBookingPrice: number;
  responseTime: number;
  avgRating: number;
  reviewCount: number;
  isOnline: boolean;
  lastSeen: string;
}

export default function InstantBookingPage() {
  const [tutors, setTutors] = useState<OnlineTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    language: "",
    skill: "",
    maxPrice: ""
  });
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchOnlineTutors();
  }, [session, status, router, filters]);

  const fetchOnlineTutors = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.language) params.append('language', filters.language);
      if (filters.skill) params.append('skill', filters.skill);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);

      const response = await fetch(`/api/tutors/online?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTutors(data);
      } else {
        toast.error("Failed to fetch online tutors");
      }
    } catch (error) {
      toast.error("Error fetching online tutors");
    } finally {
      setLoading(false);
    }
  };

  const handleInstantBooking = async (tutorId: string, tutorName: string) => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    setBookingLoading(tutorId);

    // Find the tutor to get their instant booking price
    const tutor = tutors.find(t => t.id === tutorId);
    if (!tutor) {
      toast.error("Tutor not found");
      setBookingLoading(null);
      return;
    }

    const instantBookingPrice = tutor.instantBookingPrice || 10;
    const sessionDuration = 30; // 30 minutes for instant sessions
    const sessionPrice = (instantBookingPrice * (sessionDuration / 60));

    try {
      // 1. Create instant booking
      const bookingRes = await fetch("/api/bookings/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId }),
      });

      if (!bookingRes.ok) {
        const errorData = await bookingRes.json();
        toast.error(errorData.error || "Failed to create instant booking");
        return;
      }

      const bookingData = await bookingRes.json();
      
      if (!bookingData.success || !bookingData.booking?.id) {
        toast.error("Failed to create instant booking");
        return;
      }

      const bookingId = bookingData.booking.id;

      // 2. Process payment with dynamic pricing
      const paymentRes = await fetch("/api/payments/paystack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: sessionPrice * 100, // Convert to cents for Paystack
          currency: "USD",
          bookingId,
          studentEmail: session.user?.email || "",
          studentName: session.user?.name || "",
          tutorName: tutorName,
          sessionDate: new Date().toISOString()
        }),
      });

      if (!paymentRes.ok) {
        const errorData = await paymentRes.json();
        toast.error(errorData.error || "Failed to process payment");
        return;
      }

      const paymentData = await paymentRes.json();
      
      if (paymentData.success && paymentData.paymentUrl) {
        toast.success(`Instant booking created with ${tutorName}! Redirecting to payment...`);
        window.location.href = paymentData.paymentUrl;
      } else {
        toast.error("Payment processing failed");
      }
    } catch (error) {
      console.error("Instant booking error:", error);
      toast.error("Error creating instant booking");
    } finally {
      setBookingLoading(null);
    }
  };

  const formatLastSeen = (lastSeen: string) => {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* LearnVastora Navbar */}
      <StudentNavbar />

      <div className="container py-5">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="h2 fw-bold text-primary mb-2">
                  <i className="bi bi-lightning-charge me-2"></i>
                  Instant Booking
                </h1>
                <p className="text-muted mb-0">Book a session with tutors who are online right now</p>
              </div>
              <div className="d-flex align-items-center">
                <span className="badge bg-success me-2">
                  <i className="bi bi-circle-fill me-1"></i>
                  {tutors.length} tutors online
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h6 className="fw-semibold mb-3">Filters</h6>
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label small">Language</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., English, Spanish"
                      value={filters.language}
                      onChange={(e) => setFilters({...filters, language: e.target.value})}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small">Skill</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Grammar, Speaking"
                      value={filters.skill}
                      onChange={(e) => setFilters({...filters, skill: e.target.value})}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small">Max Price</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Max price"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                    />
                  </div>
                  <div className="col-md-3 d-flex align-items-end">
                    <button 
                      className="btn btn-outline-secondary w-100"
                      onClick={fetchOnlineTutors}
                    >
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tutors Grid */}
            {tutors.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-person-x display-1 text-muted"></i>
                <h4 className="mt-3 text-muted">No tutors online</h4>
                <p className="text-muted">Check back later or browse all tutors</p>
                <Link href="/tutors" className="btn btn-primary">
                  Browse All Tutors
                </Link>
              </div>
            ) : (
              <div className="row g-4">
                {tutors.map((tutor) => (
                  <div key={tutor.id} className="col-md-6 col-lg-4">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        {/* Tutor Header */}
                        <div className="d-flex align-items-center mb-3">
                          <div className="flex-shrink-0">
                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center position-relative" style={{width: '50px', height: '50px'}}>
                              <i className="bi bi-person text-white"></i>
                              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success" style={{fontSize: '0.5rem'}}>
                                <i className="bi bi-circle-fill"></i>
                              </span>
                            </div>
                          </div>
                          <div className="flex-grow-1 ms-3">
                            <h6 className="fw-semibold mb-1">{tutor.name}</h6>
                            <div className="d-flex align-items-center">
                              <div className="text-warning me-2">
                                {[...Array(5)].map((_, i) => (
                                  <i 
                                    key={i} 
                                    className={`bi bi-star${i < Math.floor(tutor.avgRating) ? '-fill' : ''}`}
                                    style={{fontSize: '0.8rem'}}
                                  ></i>
                                ))}
                              </div>
                              <small className="text-muted">
                                {tutor.avgRating} ({tutor.reviewCount} reviews)
                              </small>
                            </div>
                          </div>
                        </div>

                        {/* Tutor Info */}
                        <div className="mb-3">
                          <p className="small text-muted mb-2">
                            {tutor.bio || "Professional language tutor"}
                          </p>
                          <div className="d-flex flex-wrap gap-1 mb-2">
                            {tutor.skills.slice(0, 3).map((skill, index) => (
                              <span key={index} className="badge bg-light text-dark small">
                                {skill}
                              </span>
                            ))}
                            {tutor.skills.length > 3 && (
                              <span className="badge bg-light text-dark small">
                                +{tutor.skills.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="row text-center mb-3">
                          <div className="col-4">
                            <div className="small text-muted">Response</div>
                            <div className="fw-semibold">{tutor.responseTime}m</div>
                          </div>
                          <div className="col-4">
                            <div className="small text-muted">Price</div>
                            <div className="fw-semibold text-success">₦{tutor.instantBookingPrice}</div>
                          </div>
                          <div className="col-4">
                            <div className="small text-muted">Last Seen</div>
                            <div className="fw-semibold small">{formatLastSeen(tutor.lastSeen)}</div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="d-grid">
                          <button
                            className="btn btn-primary"
                            onClick={() => handleInstantBooking(tutor.id, tutor.name)}
                            disabled={bookingLoading === tutor.id}
                          >
                            {bookingLoading === tutor.id ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Booking...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-lightning-charge me-2"></i>
                                Book Now
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 