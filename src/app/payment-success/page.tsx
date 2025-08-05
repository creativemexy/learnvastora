"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "react-hot-toast";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [paymentStatus, setPaymentStatus] = useState<string>("processing");
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  useEffect(() => {
    const reference = searchParams?.get('reference');
    const trxref = searchParams?.get('trxref');
    const status = searchParams?.get('status');

    if ((reference && reference !== "") || (trxref && trxref !== "")) {
      // Verify payment with backend
      verifyPayment((reference || trxref) as string);
    } else if (status === 'success') {
      setPaymentStatus("success");
      toast.success("Payment completed successfully!");
    } else {
      setPaymentStatus("failed");
      toast.error("Payment failed or was cancelled");
    }
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch(`/api/payments/verify?reference=${reference}`);
      const result = await response.json();
      
      if (result.success) {
        setPaymentStatus("success");
        setBookingDetails(result.booking);
        toast.success("Payment verified successfully!");
      } else {
        setPaymentStatus("failed");
        toast.error("Payment verification failed");
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      setPaymentStatus("failed");
      toast.error("Error verifying payment");
    }
  };

  if (paymentStatus === "processing") {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4>Verifying Payment...</h4>
          <p className="text-muted">Please wait while we confirm your payment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link href="/" className="navbar-brand fw-bold">LanguageConnect</Link>
        </div>
      </nav>

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center p-5">
                {paymentStatus === "success" ? (
                  <>
                    <div className="text-success mb-4">
                      <i className="bi bi-check-circle" style={{fontSize: '4rem'}}></i>
                    </div>
                    <h2 className="text-success mb-3">Payment Successful!</h2>
                    <p className="text-muted mb-4">
                      Your payment has been processed successfully. Your booking is now confirmed.
                    </p>
                    
                    {bookingDetails && (
                      <div className="card bg-light border-0 mb-4">
                        <div className="card-body">
                          <h6 className="fw-semibold mb-3">Booking Details</h6>
                          <div className="row text-start">
                            <div className="col-6">
                              <small className="text-muted d-block">Tutor</small>
                              <span className="fw-semibold">{bookingDetails.tutor?.name}</span>
                            </div>
                            <div className="col-6">
                              <small className="text-muted d-block">Date</small>
                              <span className="fw-semibold">
                                {new Date(bookingDetails.scheduledAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="col-6 mt-3">
                              <small className="text-muted d-block">Time</small>
                              <span className="fw-semibold">
                                {new Date(bookingDetails.scheduledAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="col-6 mt-3">
                              <small className="text-muted d-block">Status</small>
                              <span className="badge bg-success">Confirmed</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="d-grid gap-2">
                      {bookingDetails && (
                        <Link href={`/sessions/${bookingDetails.id}`} className="btn btn-success">
                          <i className="bi bi-camera-video me-2"></i>
                          Join Session Now
                        </Link>
                      )}
                      <Link href="/bookings" className="btn btn-primary">
                        <i className="bi bi-calendar me-2"></i>
                        View My Bookings
                      </Link>
                      <Link href="/tutors" className="btn btn-outline-primary">
                        <i className="bi bi-search me-2"></i>
                        Find More Tutors
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-danger mb-4">
                      <i className="bi bi-x-circle" style={{fontSize: '4rem'}}></i>
                    </div>
                    <h2 className="text-danger mb-3">Payment Failed</h2>
                    <p className="text-muted mb-4">
                      Your payment could not be processed. Please try again or contact support.
                    </p>
                    
                    <div className="d-grid gap-2">
                      <Link href="/tutors" className="btn btn-primary">
                        <i className="bi bi-arrow-left me-2"></i>
                        Try Again
                      </Link>
                      <Link href="/bookings" className="btn btn-outline-primary">
                        <i className="bi bi-calendar me-2"></i>
                        View My Bookings
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4>Loading...</h4>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
} 