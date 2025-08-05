"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

interface PaymentStatusCheckProps {
  bookingId: string;
  onPaymentVerified: () => void;
}

interface PaymentStatus {
  isPaid: boolean;
  paymentMethod: string;
  paymentReference: string;
  paidAt: string | null;
  amount: number;
  status: string;
}

export default function PaymentStatusCheck({ bookingId, onPaymentVerified }: PaymentStatusCheckProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPaymentStatus();
  }, [bookingId]);

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/verify-payment`);
      if (response.ok) {
        const status = await response.json();
        setPaymentStatus(status);
        
        if (status.isPaid) {
          onPaymentVerified();
        }
      } else {
        toast.error("Failed to check payment status");
      }
    } catch (error) {
      toast.error("Error checking payment status");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Checking payment...</span>
        </div>
        <p className="mt-2 text-muted">Verifying payment status...</p>
      </div>
    );
  }

  if (!paymentStatus) {
    return (
      <div className="alert alert-danger">
        <i className="bi bi-exclamation-triangle me-2"></i>
        Unable to verify payment status
      </div>
    );
  }

  if (paymentStatus.isPaid) {
    return (
      <div className="alert alert-success">
        <i className="bi bi-check-circle me-2"></i>
        Payment verified! Session can start.
      </div>
    );
  }

  return (
    <div className="alert alert-warning">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>Payment Required</strong>
          <p className="mb-0 mt-1">Please complete payment before starting the session.</p>
        </div>
        <button 
          className="btn btn-primary btn-sm"
          onClick={checkPaymentStatus}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>
    </div>
  );
} 