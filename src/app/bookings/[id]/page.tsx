"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string"
    ? params.id
    : Array.isArray(params?.id)
      ? params.id[0]
      : undefined;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  // Fetch booking
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/bookings/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        setBooking(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Booking not found");
        setLoading(false);
      });
  }, [id]);

  // Auto-update status if paid but still pending
  useEffect(() => {
    if (
      !booking ||
      typeof booking !== "object" ||
      booking === null ||
      booking.status !== "PENDING" ||
      !booking.paidAt
    )
      return;
    setUpdating(true);
    fetch(`/api/bookings/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONFIRMED" })
    })
      .then(res => res.json())
      .then(data => {
        setBooking({ ...booking, status: "CONFIRMED" });
        setUpdating(false);
      })
      .catch(() => setUpdating(false));
  }, [booking, id]);

  if (loading || updating) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="alert alert-danger" role="alert">
          {error || "Booking not found"}
        </div>
      </div>
    );
  }

  const isPaid = !!booking.paidAt;
  const isFuture = new Date(booking.scheduledAt) > new Date();

  return (
    <div className="min-vh-100 cambly-bg d-flex flex-column">
      <div className="container cambly-container mt-5">
        <div className="card cambly-card mx-auto" style={{ maxWidth: 500 }}>
          <div className="card-body">
            <h3 className="fw-bold mb-3">Booking Details</h3>
            <div className="mb-2"><strong>Tutor:</strong> {booking.tutor?.name}</div>
            <div className="mb-2"><strong>Email:</strong> {booking.tutor?.email}</div>
            <div className="mb-2"><strong>Scheduled At:</strong> {format(new Date(booking.scheduledAt), "MMM dd, yyyy 'at' h:mm a")}</div>
            <div className="mb-2"><strong>Status:</strong> {booking.status}</div>
            {booking.price && <div className="mb-2"><strong>Price:</strong> ${booking.price}</div>}
            {booking.tutor?.tutorProfile?.skills && (
              <div className="mb-2"><strong>Skills:</strong> {booking.tutor.tutorProfile.skills.join(", ")}</div>
            )}
            {booking.tutor?.tutorProfile?.bio && (
              <div className="mb-2"><strong>Bio:</strong> {booking.tutor.tutorProfile.bio}</div>
            )}
            <div className="mt-4 d-flex gap-2">
              <Link href="/bookings" className="btn cambly-btn-outline">Back to Bookings</Link>
              {isPaid && isFuture && (
                <Link href={`/sessions/${booking.id}`} className="btn cambly-btn">
                  <i className="fas fa-video me-1"></i>
                  Join Session
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 