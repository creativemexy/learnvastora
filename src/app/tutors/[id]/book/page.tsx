"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import StudentNavbar from '@/components/StudentNavbar';
import { useTranslation } from 'react-i18next';
import '../../../bookings/bookings-cambly.css';

export default function BookTutorPage({ params }: { params: { id: string } }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("paystack");
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, i18n } = useTranslation();

  // Fetch tutor info client-side
  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Fetch tutor data
    fetch(`/api/tutors/${params.id}`)
      .then(res => res.json())
      .then(data => { 
        setTutor(data); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }, [session, status, router, params.id]);

  // Always use USD and dynamic price
  const sessionDuration = 30; // minutes
  const hourlyRate = tutor?.tutorProfile?.hourlyRate || 10;
  const sessionPrice = (hourlyRate * (sessionDuration / 60));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Create booking first
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: params.id,
          scheduledAt
        }),
      });

      if (!bookingRes.ok) {
        const errorData = await bookingRes.json();
        toast.error(errorData.error || "Failed to create booking");
        return;
      }

      const bookingData = await bookingRes.json();
      
      if (!bookingData.success || !bookingData.booking?.id) {
        toast.error("Failed to create booking - no booking ID received");
        return;
      }

      const bookingId = bookingData.booking.id;

      // 2. Process payment in USD only, with dynamic price
      const paymentRes = await fetch(`/api/payments/${paymentMethod}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: sessionPrice,
          currency: "USD",
          bookingId,
          studentEmail: session?.user?.email || "",
          studentName: session?.user?.name || "",
          tutorName: tutor.name,
          sessionDate: scheduledAt
        }),
      });

      if (!paymentRes.ok) {
        const errorData = await paymentRes.json();
        toast.error(errorData.error || "Failed to process payment");
        return;
      }

      const paymentData = await paymentRes.json();
      
      if (paymentData.success && paymentData.paymentUrl) {
        toast.success("Redirecting to payment...");
        window.location.href = paymentData.paymentUrl;
      } else {
        toast.error("Payment processing failed");
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center cambly-bg">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (!tutor) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center cambly-bg">
        <div className="text-center">
          <h3 className="text-danger">{t('tutor_not_found') || 'Tutor not found'}</h3>
          <Link href="/tutors" className="cambly-btn mt-3">
            <i className="bi bi-arrow-left me-2"></i>
            {t('back_to_tutors') || 'Back to Tutors'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 cambly-bg d-flex flex-column">
      <StudentNavbar />
      <div className="container cambly-container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="cambly-card shadow-sm p-0">
              <div className="p-4 border-bottom" style={{background:'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',borderRadius:'15px 15px 0 0'}}>
                <h2 className="cambly-title mb-0" style={{color:'#fff'}}>{t('book')} {t('session')}</h2>
              </div>
              <div className="card-body p-4">
                {/* Tutor Info */}
                <div className="d-flex align-items-center mb-4">
                  <div className="flex-shrink-0">
                    <div className="cambly-avatar" style={{width:'60px',height:'60px',fontSize:'2rem'}}>
                      {tutor.name?.[0] || 'T'}
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="fw-semibold mb-1" style={{color:'var(--primary)'}}>{tutor.name}</h5>
                    <p className="text-muted mb-0">{tutor.tutorProfile?.bio || t('professional_language_tutor')}</p>
                  </div>
                </div>
                {/* Booking Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="scheduledAt" className="form-label fw-semibold" style={{color:'var(--primary)'}}>
                      <i className="bi bi-calendar me-2"></i>
                      {t('select_date_time') || 'Select Date & Time'}
                    </label>
                    <input
                      id="scheduledAt"
                      name="scheduledAt"
                      type="datetime-local"
                      className="form-control"
                      value={scheduledAt}
                      onChange={e => setScheduledAt(e.target.value)}
                      required
                    />
                    <div className="form-text">{t('choose_convenient_time') || 'Choose a convenient time for your session'}</div>
                  </div>
                  {/* Payment Method Selection */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold" style={{color:'var(--primary)'}}>
                      <i className="bi bi-credit-card me-2"></i>
                      {t('payment_method') || 'Payment Method'}
                    </label>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="paymentMethod"
                            id="paystack"
                            value="paystack"
                            checked={paymentMethod === "paystack"}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                          />
                          <label className="form-check-label" htmlFor="paystack">
                            <i className="bi bi-credit-card text-success me-2"></i>
                            {t('paystack') || 'Paystack'}
                          </label>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="paymentMethod"
                            id="flutterwave"
                            value="flutterwave"
                            checked={paymentMethod === "flutterwave"}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                          />
                          <label className="form-check-label" htmlFor="flutterwave">
                            <i className="bi bi-credit-card text-warning me-2"></i>
                            {t('flutterwave') || 'Flutterwave'}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Session Details */}
                  <div className="cambly-card bg-light border-0 mb-4 p-3">
                    <h6 className="fw-semibold mb-3" style={{color:'var(--primary)'}}>{t('session_details') || 'Session Details'}</h6>
                      <div className="row">
                        <div className="col-6">
                          <div className="d-flex align-items-center mb-2">
                            <i className="bi bi-clock text-primary me-2"></i>
                          <span className="small">{t('duration') || 'Duration'}: {sessionDuration} {t('minutes') || 'minutes'}</span>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="d-flex align-items-center mb-2">
                            <i className="bi bi-cash text-success me-2"></i>
                          <span className="small">{t('price') || 'Price'}: ${sessionPrice.toFixed(2)} USD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="cambly-btn w-100" disabled={isSubmitting}>
                    {isSubmitting ? t('booking') + '...' : t('book') + ' ' + t('session')}
                    </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 