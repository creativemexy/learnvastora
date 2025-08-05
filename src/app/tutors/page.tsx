"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Link from "next/link";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";
import './tutors-premium.css';
import StudentNavbar from "@/components/StudentNavbar";

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

export default function TutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    onlineNow: false,
    availability: "",
    pro: false,
    supertutors: false,
    accent: "",
    alsoSpeaks: "",
    preferredLevels: "",
    industry: "",
    interests: "",
    priceRange: ""
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedTutorForBooking, setSelectedTutorForBooking] = useState<Tutor | null>(null);
  const [availabilityData, setAvailabilityData] = useState<any>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    fetchTutors();
    setIsVisible(true);
    setTimeout(() => setAnimateCards(true), 300);
  }, []);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !isRefreshing) {
        setIsAutoRefreshing(true);
        fetchTutors(true).then(() => {
          setIsAutoRefreshing(false);
        });
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loading, isRefreshing]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const dropdownContainer = target.closest('.premium-filter-dropdown');
      const dropdownButton = target.closest('.premium-filter-btn');
      
      // Only close if we clicked outside both the dropdown container and the button
      if (openDropdown && !dropdownContainer && !dropdownButton) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const toggleDropdown = (dropdownName: string) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  const fetchTutors = async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setError(null);
      const response = await fetch("/api/tutors", {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTutors(data);
        if (!isBackgroundRefresh) {
          toast.success(t('tutors.tutors_loaded_successfully'));
        }
      } else {
        const errorMessage = `Failed to fetch tutors: ${response.status} ${response.statusText}`;
        console.error(errorMessage);
        setError(errorMessage);
        if (!isBackgroundRefresh) {
          toast.error(t('tutors.failed_to_load_tutors'));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error fetching tutors:', error);
      setError(errorMessage);
      if (!isBackgroundRefresh) {
        toast.error(t('tutors.error_loading_tutors'));
      }
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchTutors(true); // Background refresh
    setIsRefreshing(false);
    toast.success(t('tutors.data_refreshed'));
  };

  const getTutorAvatar = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Helper function to generate available dates (next 7 days)
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  // Helper function to generate available time slots
  const generateAvailableTimes = () => {
    const times = [];
    for (let hour = 9; hour <= 18; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
      times.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return times;
  };

  // Update fetchTutorAvailability to include generated data
  const fetchTutorAvailability = async (tutorId: string) => {
    try {
      setLoadingAvailability(true);
      const response = await fetch(`/api/tutors/${tutorId}/availability`);
      
      if (response.ok) {
        const data = await response.json();
        // Add generated calendar data if not available from API
        const enhancedData = {
          ...data.data,
          availableDates: data.data.availableDates || generateAvailableDates(),
          availableTimes: data.data.availableTimes || generateAvailableTimes()
        };
        setAvailabilityData(enhancedData);
      } else {
        // Fallback to generated data if API fails
        setAvailabilityData({
          availableDates: generateAvailableDates(),
          availableTimes: generateAvailableTimes(),
          hourlyRate: 25,
          instantBookingEnabled: false
        });
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      // Fallback to generated data
      setAvailabilityData({
        availableDates: generateAvailableDates(),
        availableTimes: generateAvailableTimes(),
        hourlyRate: 25,
        instantBookingEnabled: false
      });
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleBookSession = async (tutor: Tutor) => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Check if tutor supports instant booking AND is online
    if (tutor.tutorProfile?.instantBookingEnabled && tutor.isOnline) {
      // Use existing instant booking logic
      await handleInstantBooking(tutor.id, tutor.name);
    } else {
      // Show availability modal for regular booking (either not instant-enabled or not online)
      setSelectedTutorForBooking(tutor);
      await fetchTutorAvailability(tutor.id);
      setShowAvailabilityModal(true);
    }
  };

  const handleSlotSelection = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleConfirmBooking = () => {
    if (!selectedTutorForBooking || !selectedDate || !selectedTime) {
      toast.error('Please select a date and time');
      return;
    }

    // Format the date and time for the booking page
    const dateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const formattedDateTime = dateTime.toISOString();
    
    // Redirect to booking page with selected date and time
    router.push(`/book-tutor/${selectedTutorForBooking.id}?date=${formattedDateTime}`);
    
    // Close modal
    setShowAvailabilityModal(false);
    setSelectedTutorForBooking(null);
    setSelectedDate(null);
    setSelectedTime('');
    setAvailabilityData(null);
  };

  const handleInstantBooking = async (tutorId: string, tutorName: string) => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    const tutor = tutors.find(t => t.id === tutorId);
    if (!tutor) {
      toast.error(t('tutors.tutor_not_found'));
      return;
    }

    // Double-check if tutor is available for instant booking
    if (!tutor.isOnline || !tutor.tutorProfile?.instantBookingEnabled) {
      toast('Tutor is not currently available for instant booking. Showing available time slots instead.');
      setSelectedTutorForBooking(tutor);
      await fetchTutorAvailability(tutor.id);
      setShowAvailabilityModal(true);
      return;
    }

    const instantBookingPrice = tutor.tutorProfile?.instantBookingPrice || 10;
    const sessionDuration = 30;
    const sessionPrice = (instantBookingPrice * (sessionDuration / 60));

    try {
      const walletRes = await fetch("/api/wallet/balance");
      let walletBalance = 0;
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        walletBalance = walletData.balance || 0;
      }

      const bookingRes = await fetch("/api/bookings/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId }),
      });

      if (!bookingRes.ok) {
        const errorData = await bookingRes.json();
        const errorMessage = errorData.error || t('tutors.failed_to_create_booking');
        
        // If instant booking fails, offer to show availability instead
        if (bookingRes.status === 404 && errorMessage.includes('not available for instant booking')) {
          toast('Tutor is not currently available for instant booking. Showing available time slots instead.');
          setSelectedTutorForBooking(tutor);
          await fetchTutorAvailability(tutor.id);
          setShowAvailabilityModal(true);
          return;
        }
        
        toast.error(errorMessage);
        return;
      }

      const bookingData = await bookingRes.json();
      
      if (!bookingData.success || !bookingData.booking?.id) {
        toast.error(t('tutors.failed_to_create_booking'));
        return;
      }

      const bookingId = bookingData.booking.id;

      if (walletBalance >= sessionPrice) {
        const useWallet = confirm(t('tutors.wallet_payment_prompt', { balance: walletBalance.toFixed(2), price: sessionPrice.toFixed(2) }));
        
        if (useWallet) {
          const walletPaymentRes = await fetch("/api/wallet/pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId,
              amount: sessionPrice,
              tutorName: tutorName
            }),
          });

          if (walletPaymentRes.ok) {
            const walletPaymentData = await walletPaymentRes.json();
            if (walletPaymentData.success) {
              toast.success(t('tutors.instant_booking_confirmed', { tutorName }));
              router.push(`/sessions/${bookingId}`);
              return;
            }
          }
          toast.error(t('tutors.wallet_payment_failed'));
        }
      } else if (walletBalance > 0) {
        const addFunds = confirm(t('tutors.add_funds_prompt', { balance: walletBalance.toFixed(2), price: sessionPrice.toFixed(2) }));
        if (addFunds) {
          router.push("/wallet");
          return;
        }
      }

      const paymentRes = await fetch("/api/payments/paystack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: sessionPrice * 100,
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
        toast.error(errorData.error || t('tutors.payment_processing_failed'));
        return;
      }

      const paymentData = await paymentRes.json();
      
      if (paymentData.success && paymentData.paymentUrl) {
        toast.success(t('tutors.instant_booking_created', { tutorName }));
        window.location.href = paymentData.paymentUrl;
      } else {
        toast.error(t('tutors.payment_processing_failed'));
      }
    } catch (error) {
      console.error("Instant booking error:", error);
      toast.error(t('tutors.error_creating_booking'));
    }
  };

  const getAverageRating = (reviews: any[]): string => {
    if (!reviews || reviews.length === 0) return "0";
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const getPositiveReviewPercentage = (reviews: any[]): string => {
    if (!reviews || reviews.length === 0) return "95";
    const positiveReviews = reviews.filter(review => review.rating >= 4).length;
    return Math.round((positiveReviews / reviews.length) * 100).toString();
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const filteredTutors = tutors.filter(tutor => {
    if (filters.onlineNow && !tutor.isOnline) return false;
    if (filters.pro && !tutor.tutorProfile?.isPro) return false;
    if (filters.supertutors && !tutor.tutorProfile?.isSupertutor) return false;
    if (filters.accent && tutor.tutorProfile?.accent !== filters.accent) return false;
    if (filters.alsoSpeaks && !tutor.tutorProfile?.languages?.includes(filters.alsoSpeaks)) return false;
    if (filters.preferredLevels && !tutor.tutorProfile?.skills?.some(skill => skill.toLowerCase().includes(filters.preferredLevels))) return false;
    if (filters.industry && !tutor.tutorProfile?.skills?.some(skill => skill.toLowerCase().includes(filters.industry))) return false;
    if (filters.interests && !tutor.tutorProfile?.skills?.some(skill => skill.toLowerCase().includes(filters.interests))) return false;
    
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split("-").map(Number);
      const hourlyRate = tutor.tutorProfile?.hourlyRate || 0;
      if (hourlyRate < min || (max && hourlyRate > max)) return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="premium-bg">
        <StudentNavbar />
        <div className="premium-loading-container">
          <div className="spinner-ring"></div>
          <p className="spinner-text">{t('tutors.loading_tutors')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`premium-bg ${isVisible ? 'fade-in' : ''}`}>
      <StudentNavbar />

      {/* Premium Header Section */}
      <div className="premium-header-box">
          <div className="container">
          <div className="premium-header-content">
            <h1 className="premium-title">{t('tutors.title')}</h1>
            <p className="premium-subtitle">{t('tutors.subtitle')}</p>
            {isAutoRefreshing && (
              <div className="auto-refresh-indicator">
                <i className="fas fa-sync-alt fa-spin"></i>
                <span>Auto-refreshing...</span>
              </div>
            )}
            {error && (
              <div className="premium-error-message">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
                <button 
                  className="premium-btn outline"
                  onClick={() => setError(null)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Filter Section */}
      <div className="premium-filter-section">
        <div className="container">
          <div className="premium-filter-grid">
            <button 
              className={`premium-filter-btn ${filters.onlineNow ? 'active' : ''}`}
              onClick={() => setFilters({...filters, onlineNow: !filters.onlineNow})}
            >
              <i className="fas fa-circle"></i>
              {t('tutors.online_now')}
            </button>
            
            <div className="premium-filter-dropdown">
              <button 
                className="premium-filter-btn" 
                onClick={() => toggleDropdown('availability')}
              >
                {t('tutors.availability')}
                <i className="fas fa-chevron-down"></i>
                </button>
                {openDropdown === 'availability' && (
                <div className="premium-dropdown-menu">
                    <button 
                    className={`premium-dropdown-item ${filters.availability === "" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, availability: ""})}
                    >
                    {t('tutors.any_time')}
                    </button>
                    <button 
                    className={`premium-dropdown-item ${filters.availability === "morning" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, availability: "morning"})}
                    >
                    {t('tutors.morning')} (6AM-12PM)
                    </button>
                    <button 
                    className={`premium-dropdown-item ${filters.availability === "afternoon" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, availability: "afternoon"})}
                    >
                    {t('tutors.afternoon')} (12PM-6PM)
                    </button>
                    <button 
                    className={`premium-dropdown-item ${filters.availability === "evening" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, availability: "evening"})}
                    >
                    {t('tutors.evening')} (6PM-12AM)
                    </button>
                  </div>
                )}
              </div>
              
              <button 
              className={`premium-filter-btn ${filters.pro ? 'active' : ''}`}
                onClick={() => setFilters({...filters, pro: !filters.pro})}
              >
              <i className="fas fa-crown"></i>
              {t('tutors.pro')}
              </button>
              
              <button 
              className={`premium-filter-btn ${filters.supertutors ? 'active' : ''}`}
                onClick={() => setFilters({...filters, supertutors: !filters.supertutors})}
              >
              <i className="fas fa-star"></i>
              {t('tutors.super_tutors')}
              </button>
              
            <div className="premium-filter-dropdown">
                <button 
                className="premium-filter-btn" 
                  onClick={() => toggleDropdown('accent')}
                >
                {t('tutors.accent')}
                <i className="fas fa-chevron-down"></i>
                </button>
                {openDropdown === 'accent' && (
                <div className="premium-dropdown-menu">
                    <button 
                    className={`premium-dropdown-item ${filters.accent === "" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, accent: ""})}
                    >
                    {t('tutors.all_accents')}
                    </button>
                    <button 
                    className={`premium-dropdown-item ${filters.accent === "USA" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, accent: "USA"})}
                    >
                      USA
                    </button>
                    <button 
                    className={`premium-dropdown-item ${filters.accent === "UK" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, accent: "UK"})}
                    >
                      UK
                    </button>
                    <button 
                    className={`premium-dropdown-item ${filters.accent === "Australian" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, accent: "Australian"})}
                    >
                    {t('tutors.australian')}
                    </button>
                    <button 
                    className={`premium-dropdown-item ${filters.accent === "Canadian" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, accent: "Canadian"})}
                    >
                    {t('tutors.canadian')}
                    </button>
                  </div>
                )}
              </div>
              
            <div className="premium-filter-dropdown">
                <button 
                className="premium-filter-btn" 
                  onClick={() => toggleDropdown('price')}
                >
                {t('tutors.price')}
                <i className="fas fa-chevron-down"></i>
                </button>
                {openDropdown === 'price' && (
                <div className="premium-dropdown-menu">
                    <button 
                    className={`premium-dropdown-item ${filters.priceRange === "" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, priceRange: ""})}
                    >
                    {t('tutors.all_prices')}
                    </button>
                    <button 
                    className={`premium-dropdown-item ${filters.priceRange === "0-20" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, priceRange: "0-20"})}
                    >
                      $0 - $20/hr
                    </button>
                    <button 
                    className={`premium-dropdown-item ${filters.priceRange === "20-40" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, priceRange: "20-40"})}
                    >
                      $20 - $40/hr
                    </button>
                    <button 
                    className={`premium-dropdown-item ${filters.priceRange === "40-60" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, priceRange: "40-60"})}
                    >
                      $40 - $60/hr
                    </button>
                    <button 
                    className={`premium-dropdown-item ${filters.priceRange === "60-100" ? 'active' : ''}`}
                      onClick={() => setFilters({...filters, priceRange: "60-100"})}
                    >
                      $60+ /hr
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Premium Tutors Grid */}
      <div className="premium-tutors-section">
        <div className="container">
          <div className="premium-tutors-grid">
            {filteredTutors.map((tutor, index) => {
            const positiveReviews = getPositiveReviewPercentage(tutor.reviews || []);
            const initials = tutor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
              const avatarGradient = getTutorAvatar(tutor.name);
            
            return (
                <div 
                  key={tutor.id} 
                  className={`premium-tutor-card ${animateCards ? 'card-slide-in' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                {/* Video Thumbnail */}
                  <div className="tutor-video-section">
                  {tutor.tutorProfile?.introVideoUrl ? (
                      <div className="video-container">
                      <video 
                          className="intro-video"
                        preload="metadata"
                        muted
                        onMouseEnter={(e) => {
                          const video = e.target as HTMLVideoElement;
                            video.play().catch(() => {});
                        }}
                        onMouseLeave={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.pause();
                          video.currentTime = 0;
                        }}
                        onClick={(e) => {
                          const video = e.target as HTMLVideoElement;
                          if (video.paused) {
                            video.play().catch(() => {
                                toast.error(t('tutors.video_playback_error'));
                            });
                          } else {
                            video.pause();
                          }
                        }}
                      >
                        <source src={tutor.tutorProfile.introVideoUrl} type="video/mp4" />
                          {t('tutors.video_not_supported')}
                      </video>
                        <div className="video-overlay">
                          <i className="fas fa-play play-icon"></i>
                        </div>
                      </div>
                    ) : (
                      <div className="video-placeholder">
                        <div 
                          className="placeholder-avatar"
                          style={{ background: avatarGradient }}
                        >
                          <span className="avatar-text">{initials}</span>
                        </div>
                        <p className="video-text">{t('tutors.intro_video_coming_soon')}</p>
                    </div>
                    )}
                    
                    {/* Online Indicator */}
                    {tutor.isOnline && (
                      <div className="online-indicator">
                        <i className="fas fa-circle"></i>
                      </div>
                    )}
                    
                    {/* Super Tutor Badge */}
                    {tutor.tutorProfile?.isSupertutor && (
                      <div className="super-tutor-badge">
                        <i className="fas fa-star"></i>
                        {t('tutors.super_tutor') || 'Super Tutor'}
                    </div>
                  )}
                </div>
                
                {/* Tutor Info */}
                  <div className="tutor-info-section">
                    <div className="tutor-header">
                      <h3 className="tutor-name">{tutor.name}</h3>
                      <div className="tutor-rating">
                        <i className="fas fa-star"></i>
                        <span>{getAverageRating(tutor.reviews || [])}</span>
                      </div>
                    </div>
                    
                    <div className="tutor-details">
                      <div className="detail-item">
                        <i className="fas fa-globe"></i>
                        <span>{tutor.tutorProfile?.accent || t('tutors.usa_accent')}</span>
                      </div>
                      
                      <div className="detail-item">
                        <i className="fas fa-thumbs-up"></i>
                        <span>{positiveReviews}% {t('tutors.positive_reviews')}</span>
                    </div>
                    
                      <div className="detail-item">
                        <i className="fas fa-graduation-cap"></i>
                        <span>{tutor.tutorProfile?.experience || 0} {t('tutors.years_experience')}</span>
                    </div>
                    
                      <div className="detail-item">
                        <i className="fas fa-dollar-sign"></i>
                        <span>₦{tutor.tutorProfile?.hourlyRate || 0}/hr</span>
                    </div>
                    
                    {tutor.tutorProfile?.instantBookingEnabled && (
                        <div className="detail-item instant-booking">
                          <i className="fas fa-bolt"></i>
                          <span>₦{tutor.tutorProfile?.instantBookingPrice || 0}/30min</span>
                      </div>
                    )}
                    </div>
                    
                    {/* Skills Tags */}
                    {tutor.tutorProfile?.skills && tutor.tutorProfile.skills.length > 0 && (
                      <div className="skills-section">
                        {tutor.tutorProfile.skills.slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="skill-tag">{skill}</span>
                        ))}
                        {tutor.tutorProfile.skills.length > 3 && (
                          <span className="skill-tag more-skills">+{tutor.tutorProfile.skills.length - 3}</span>
                        )}
                      </div>
                    )}
                  
                  {/* Action Buttons */}
                    <div className="tutor-actions">
                    <button 
                        className="premium-btn primary"
                      onClick={() => handleBookSession(tutor)}
                    >
                        <i className="fas fa-calendar-plus"></i>
                        Book Session
                      </button>
                      <button 
                        className="premium-btn secondary"
                        onClick={() => {
                          setSelectedTutor(tutor);
                          setShowModal(true);
                        }}
                      >
                        <i className="fas fa-eye"></i>
                        {t('tutors.view_profile')}
                    </button>
                    <button 
                        className="premium-btn outline"
                      onClick={() => {
                          toast.success(t('tutors.tutor_bookmarked'));
                      }}
                    >
                      <i className="fas fa-bookmark"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredTutors.length === 0 && (
              <div className="premium-empty-state">
                <div className="empty-icon">🔍</div>
                <h3>{t('tutors.no_tutors_found')}</h3>
                <p>{t('tutors.try_adjusting_filters')}</p>
                <button 
                  className="premium-btn primary"
                  onClick={() => setFilters({
                    onlineNow: true,
                    availability: "",
                    pro: false,
                    supertutors: false,
                    accent: "",
                    alsoSpeaks: "",
                    preferredLevels: "",
                    industry: "",
                    interests: "",
                    priceRange: ""
                  })}
                >
                  {t('tutors.clear_filters')}
                </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Tutor Profile Modal */}
      {showModal && selectedTutor && (
        <div className="premium-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
            <div className="premium-modal-header">
              <h2>{t('tutors.tutor_profile')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="premium-modal-body">
              <div className="modal-tutor-info">
                <div 
                  className="modal-tutor-avatar"
                  style={{ background: getTutorAvatar(selectedTutor.name) }}
                >
                  <span>{selectedTutor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}</span>
                </div>
                
                <div className="modal-tutor-details">
                  <h3>{selectedTutor.name}</h3>
                  <p className="tutor-bio">{selectedTutor.tutorProfile?.bio || t('tutors.no_bio_available')}</p>
                  
                  <div className="tutor-stats">
                    <div className="stat">
                      <span className="stat-value">{getAverageRating(selectedTutor.reviews || [])}</span>
                      <span className="stat-label">{t('tutors.rating')}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{selectedTutor.reviews?.length || 0}</span>
                      <span className="stat-label">{t('tutors.reviews')}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{selectedTutor.tutorProfile?.experience || 0}</span>
                      <span className="stat-label">{t('tutors.years')}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <h4>{t('tutors.languages')}</h4>
                  <div className="info-tags">
                    {selectedTutor.tutorProfile?.languages?.map((lang, idx) => (
                      <span key={idx} className="info-tag">{lang}</span>
                    )) || <span className="info-tag">{t('tutors.english')}</span>}
                  </div>
                </div>
                
                <div className="modal-info-item">
                  <h4>{t('tutors.skills')}</h4>
                  <div className="info-tags">
                    {selectedTutor.tutorProfile?.skills?.map((skill, idx) => (
                      <span key={idx} className="info-tag">{skill}</span>
                    )) || <span className="info-tag">{t('tutors.general_english')}</span>}
                  </div>
                </div>
                
                <div className="modal-info-item">
                  <h4>{t('tutors.education')}</h4>
                  <p>{selectedTutor.tutorProfile?.education || t('tutors.education_not_specified')}</p>
                </div>
              </div>
              
              <div className="pricing-info">
                <div className="price-item">
                  <span className="price-label">{t('tutors.hourly_rate')}</span>
                  <span className="price-value">₦{selectedTutor.tutorProfile?.hourlyRate || 0}/hr</span>
                </div>
                {selectedTutor.tutorProfile?.instantBookingEnabled && (
                  <div className="price-item">
                    <span className="price-label">{t('tutors.instant_booking')}</span>
                    <span className="price-value">₦{selectedTutor.tutorProfile?.instantBookingPrice || 0}/30min</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="premium-modal-footer">
              <button 
                className="premium-btn primary"
                onClick={() => handleBookSession(selectedTutor)}
              >
                {selectedTutor.tutorProfile?.instantBookingEnabled && selectedTutor.isOnline
                  ? t('tutors.book_session') 
                  : t('tutors.view_availability')
                }
              </button>
              <button 
                className="premium-btn secondary"
                onClick={() => setShowModal(false)}
              >
                {t('tutors.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {showAvailabilityModal && selectedTutorForBooking && (
        <div className="premium-modal-overlay" onClick={() => setShowAvailabilityModal(false)}>
          <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
            <div className="premium-modal-header">
              <h2>{t('tutors.select_session_date')}</h2>
              <button className="modal-close" onClick={() => setShowAvailabilityModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="premium-modal-body">
              <div className="availability-calendar">
                <h3>{t('tutors.choose_date')}</h3>
                <div className="calendar-grid">
                  {availabilityData?.availableDates?.map((date: string) => (
                    <button
                      key={date}
                      className={`calendar-day ${selectedDate?.toISOString().split('T')[0] === date ? 'selected' : ''}`}
                      onClick={() => handleSlotSelection(new Date(date), '09:00')} // Default to 9 AM
                    >
                      {new Date(date).getDate()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="availability-time-slots">
                <h3>{t('tutors.choose_time')}</h3>
                <div className="time-slots-grid">
                  {availabilityData?.availableTimes?.map((time: string) => (
                    <button
                      key={time}
                      className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                      onClick={() => handleSlotSelection(selectedDate || new Date(), time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="premium-modal-footer">
              <button 
                className="premium-btn primary"
                onClick={handleConfirmBooking}
                disabled={!selectedDate || !selectedTime}
              >
                {t('tutors.confirm_booking')}
              </button>
              <button 
                className="premium-btn secondary"
                onClick={() => setShowAvailabilityModal(false)}
              >
                {t('tutors.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 