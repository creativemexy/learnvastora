"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SessionPage({ params }: { params: { bookingId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/auth/signin");
      return;
    }
    
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
        
        const userId = (session.user as any).id;
        console.log("Session access check:", {
          userId,
          bookingStudentId: booking.studentId,
          bookingTutorId: booking.tutorId,
          isStudent: booking.studentId === userId,
          isTutor: booking.tutorId === userId,
          userEmail: (session.user as any).email
        });
        
        if (![booking.studentId, booking.tutorId].includes(userId)) {
          setError("You are not a participant in this session.");
          setLoading(false);
          return;
        }
        
        console.log("Session access granted for user:", userId);
        setBooking(booking);
        setLoading(false);
      })
      .catch((error) => { 
        console.error("Session fetch error:", error);
        setError("Session not found."); 
        setLoading(false); 
      });
  }, [status, session, params.bookingId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-content-center bg-gray-50">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-content-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Session Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Session Page</h1>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          ✅ Session access granted! Booking ID: {params.bookingId}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-900">Session Details</h3>
            <p><strong>Student:</strong> {booking?.student?.name || 'N/A'}</p>
            <p><strong>Tutor:</strong> {booking?.tutor?.name || 'N/A'}</p>
            <p><strong>Duration:</strong> {booking?.duration || 0} minutes</p>
            <p><strong>Status:</strong> {booking?.status || 'N/A'}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded">
            <h3 className="font-semibold text-yellow-900">User Info</h3>
            <p><strong>Current User:</strong> {(session?.user as any)?.name || 'N/A'}</p>
            <p><strong>Email:</strong> {(session?.user as any)?.email || 'N/A'}</p>
            <p><strong>Role:</strong> {(session?.user as any)?.role || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 