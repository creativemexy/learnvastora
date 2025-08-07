"use client";

export default function SessionPage({ params }: { params: { bookingId: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Fresh Session Page</h1>
        <p className="text-gray-600 mb-6">
          Booking ID: {params.bookingId}
        </p>
        <p className="text-green-600">
          ✅ Fresh session page is working!
        </p>
      </div>
    </div>
  );
}
