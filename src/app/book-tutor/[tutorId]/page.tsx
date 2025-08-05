"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import StudentNavbar from "@/components/StudentNavbar";
import './booking-page.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Tutor {
  id: string;
  name: string;
  email: string;
  photo?: string;
  tutorProfile: {
    bio: string;
    languages: string[];
    skills: string[];
    experience: number;
    education: string;
    hourlyRate: number;
    instantBookingEnabled: boolean;
    instantBookingPrice: number;
    accent?: string;
    isPro?: boolean;
    isSupertutor?: boolean;
    introVideoUrl?: string;
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
  }>;
  isOnline: boolean;
  lastSeen: string;
}

export default function TutorBookingPage({ params }: { params: { tutorId: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState({
    selectedDate: '',
    selectedTime: '',
    duration: 60, // Default 1 hour
    paymentMethod: 'WALLET' // Default to wallet
  });
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Get selected date from URL params
  const selectedDateParam = searchParams?.get('date');

  useEffect(() => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchTutorData();
    fetchWalletBalance();
  }, [session, params.tutorId]);

  const fetchWalletBalance = async () => {
    try {
      setLoadingWallet(true);
      const response = await fetch('/api/wallet/balance');
      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setLoadingWallet(false);
    }
  };

  const fetchTutorData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tutors/${params.tutorId}`);
      
      if (response.ok) {
        const data = await response.json();
        setTutor(data);
        
        // Parse the selected date from URL
        if (selectedDateParam) {
          const date = new Date(selectedDateParam);
          setBookingData(prev => ({
            ...prev,
            selectedDate: date.toISOString().split('T')[0],
            selectedTime: date.toTimeString().slice(0, 5)
          }));
        }
      } else {
        toast.error('Failed to fetch tutor information');
        router.push('/tutors');
      }
    } catch (error) {
      console.error('Error fetching tutor:', error);
      toast.error('Error loading tutor information');
      router.push('/tutors');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBookingData(prev => ({
      ...prev,
      selectedDate: e.target.value
    }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBookingData(prev => ({
      ...prev,
      selectedTime: e.target.value
    }));
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBookingData(prev => ({
      ...prev,
      duration: parseInt(e.target.value)
    }));
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBookingData(prev => ({
      ...prev,
      paymentMethod: e.target.value
    }));
  };

  const calculatePrice = () => {
    if (!tutor) return 0;
    const hourlyRate = tutor.tutorProfile?.hourlyRate || 25;
    return (hourlyRate * bookingData.duration) / 60;
  };

  const handleSubmitBooking = async () => {
    if (!session || !tutor) return;

    if (!bookingData.selectedDate || !bookingData.selectedTime) {
      toast.error('Please select a date and time');
      return;
    }

    try {
      setSubmitting(true);

      // Create the scheduled date - handle different date formats
      let scheduledDate;
      try {
        // Try parsing the date in different formats
        if (bookingData.selectedDate.includes('/')) {
          // Format: MM/DD/YYYY
          const [month, day, year] = bookingData.selectedDate.split('/');
          const [hours, minutes] = bookingData.selectedTime.split(':');
          scheduledDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
        } else {
          // Format: YYYY-MM-DD
          scheduledDate = new Date(`${bookingData.selectedDate}T${bookingData.selectedTime}`);
        }
        
        if (isNaN(scheduledDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (dateError) {
        console.error('Date parsing error:', dateError);
        toast.error('Invalid date or time format');
        return;
      }
      
      const sessionPrice = calculatePrice();
      
      const bookingPayload = {
        tutorId: tutor.id,
        scheduledAt: scheduledDate.toISOString(),
        duration: bookingData.duration,
        paymentMethod: bookingData.paymentMethod
      };
      
      console.log('Creating booking with payload:', bookingPayload);
      console.log('Session user:', session.user);
      console.log('Parsed scheduled date:', scheduledDate.toISOString());
      
      // Create booking first
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      });

      console.log('Booking response status:', bookingResponse.status);
      console.log('Booking response ok:', bookingResponse.ok);

      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json();
        console.error('Booking error response:', errorData);
        toast.error(errorData.error || 'Failed to create booking');
        return;
      }

      const bookingResponseData = await bookingResponse.json();
      console.log('Booking created successfully:', bookingResponseData);
      const bookingId = bookingResponseData.booking.id;

      // Handle payment based on selected method
      if (bookingData.paymentMethod === 'WALLET') {
        // Pay with wallet
        const walletResponse = await fetch('/api/wallet/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            amount: sessionPrice,
            tutorName: tutor.name
          }),
        });

        if (walletResponse.ok) {
          const walletData = await walletResponse.json();
          if (walletData.success) {
            toast.success('Booking confirmed! Payment processed from wallet.');
            router.push(`/bookings/${bookingId}`);
            return;
          }
        }
        toast.error('Wallet payment failed. Please try another payment method.');
        return;
      } else {
        // External payment gateway
        const paymentResponse = await fetch(`/api/payments/${bookingData.paymentMethod.toLowerCase()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: sessionPrice * 100, // Convert to cents
            currency: 'USD',
            bookingId,
            studentEmail: session.user?.email || '',
            studentName: session.user?.name || '',
            tutorName: tutor.name,
            sessionDate: scheduledDate.toISOString()
          }),
        });

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          if (paymentData.success && paymentData.paymentUrl) {
            window.location.href = paymentData.paymentUrl;
            return;
          }
        }
        toast.error('Payment processing failed. Please try again.');
        return;
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Error creating booking');
    } finally {
      setSubmitting(false);
    }
  };

  const getTutorAvatar = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="booking-loading">
        <div className="spinner"></div>
        <p>Loading tutor information...</p>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="booking-error">
        <h2>Tutor not found</h2>
        <button onClick={() => router.push('/tutors')}>Back to Tutors</button>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <StudentNavbar />
      
      <div className="booking-container">
        <div className="booking-header">
          <h1>Book Session with {tutor.name}</h1>
          <p>Schedule your learning session</p>
        </div>

        <div className="booking-content">
          <div className="tutor-info-card">
            <div className="tutor-avatar">
              {tutor.photo ? (
                <img src={tutor.photo} alt={tutor.name} />
              ) : (
                <div className="avatar-placeholder">
                  {getTutorAvatar(tutor.name)}
                </div>
              )}
            </div>
            
            <div className="tutor-details">
              <h3>{tutor.name}</h3>
              <p className="tutor-bio">{tutor.tutorProfile?.bio || 'No bio available'}</p>
              
              <div className="tutor-stats">
                <div className="stat">
                  <span className="stat-value">₦{tutor.tutorProfile?.hourlyRate || 25}/hour</span>
                  <span className="stat-label">per hour</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{tutor.tutorProfile?.experience || 0}</span>
                  <span className="stat-label">years experience</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{tutor.reviews?.length || 0}</span>
                  <span className="stat-label">reviews</span>
                </div>
              </div>

              <div className="tutor-skills">
                <h4>Skills</h4>
                <div className="skills-grid">
                  {tutor.tutorProfile?.skills?.slice(0, 5).map((skill, index) => (
                    <span key={index} className="skill-tag">{skill}</span>
                  ))}
                  {tutor.tutorProfile?.skills?.length > 5 && (
                    <span className="skill-tag more">+{tutor.tutorProfile.skills.length - 5} more</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="booking-form">
            <h3>Session Details</h3>
            
            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                value={bookingData.selectedDate}
                onChange={handleDateChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">Time</label>
              <input
                type="time"
                id="time"
                value={bookingData.selectedTime}
                onChange={handleTimeChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration</label>
              <select
                id="duration"
                value={bookingData.duration}
                onChange={handleDurationChange}
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="paymentMethod">Payment Method</label>
              <select
                id="paymentMethod"
                value={bookingData.paymentMethod}
                onChange={handlePaymentMethodChange}
              >
                <option value="WALLET">Student Wallet</option>
                <option value="PAYSTACK">Paystack</option>
                <option value="FLUTTERWAVE">Flutterwave</option>
                <option value="STRIPE">Stripe</option>
              </select>
            </div>

            {bookingData.paymentMethod === 'WALLET' && (
              <div className="wallet-info">
                <div className="wallet-balance">
                  <span>Wallet Balance:</span>
                  <span className="balance-amount">₦{walletBalance.toFixed(2)}</span>
                </div>
                {walletBalance < calculatePrice() && (
                  <div className="wallet-warning">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>Insufficient balance. Please add funds or choose another payment method.</span>
                  </div>
                )}
              </div>
            )}

            <div className="booking-summary">
              <h4>Booking Summary</h4>
              <div className="summary-item">
                <span>Duration:</span>
                <span>{bookingData.duration} minutes</span>
              </div>
              <div className="summary-item">
                <span>Rate:</span>
                <span>₦{tutor.tutorProfile?.hourlyRate || 25}/hour</span>
              </div>
              <div className="price-breakdown-item">
                <span>Session Price:</span>
                <span>₦{calculatePrice().toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span>Payment Method:</span>
                <span>{bookingData.paymentMethod}</span>
              </div>
              <div className="summary-item total">
                <span>Total:</span>
                <span>₦{calculatePrice().toFixed(2)}</span>
              </div>
            </div>

            <div className="booking-actions">
              <button
                className="btn-secondary"
                onClick={() => router.push('/tutors')}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmitBooking}
                disabled={submitting || !bookingData.selectedDate || !bookingData.selectedTime || 
                         (bookingData.paymentMethod === 'WALLET' && walletBalance < calculatePrice())}
              >
                {submitting ? 'Processing...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 