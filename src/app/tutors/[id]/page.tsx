"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";

interface Tutor {
  id: string;
  name: string;
  email: string;
  tutorProfile?: {
    bio?: string;
    languages?: string[];
    skills?: string[];
    hourlyRate?: number;
    availability?: string;
    introVideoUrl?: string;
    experience?: string;
    education?: string;
  };
  reviewsReceived?: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    student?: {
      name: string;
    };
  }>;
}

export default function TutorProfilePage() {
  const params = useParams();
  const tutorId = params?.id as string;
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tutorId) return;
    
    setIsLoading(true);
    setError(null);
    
    fetch(`/api/tutors/${tutorId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch tutor");
        }
        return res.json();
      })
      .then((data) => {
        setTutor(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [tutorId]);

  const getAverageRating = (reviews: any[]) => {
    if (!reviews?.length) return 0;
    return (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i 
          key={i} 
          className={`bi ${i <= rating ? 'bi-star-fill text-warning' : 'bi-star text-muted'}`}
        ></i>
      );
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
          <Link href="/tutors" className="btn btn-primary">Back to Tutors</Link>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <h3 className="text-danger">Tutor not found</h3>
          <Link href="/tutors" className="btn btn-primary">Back to Tutors</Link>
        </div>
      </div>
    );
  }

  const avgRating = Number(getAverageRating(tutor.reviewsReceived || []));
  const reviewCount = tutor.reviewsReceived?.length || 0;

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link href="/" className="navbar-brand fw-bold">LanguageConnect</Link>
          <div className="navbar-nav ms-auto">
            <Link href="/tutors" className="nav-link">
              <i className="bi bi-arrow-left me-2"></i>Back to Tutors
            </Link>
          </div>
        </div>
      </nav>

      <div className="container py-5">
        {/* Tutor Header */}
        <div className="row mb-5">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <div className="row">
                  <div className="col-md-3 text-center">
                    <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{width: '120px', height: '120px'}}>
                      <i className="bi bi-person text-white" style={{fontSize: '3rem'}}></i>
                    </div>
                  </div>
                  <div className="col-md-9">
                    <h1 className="h2 fw-bold text-primary mb-2">{tutor.name}</h1>
                    <div className="d-flex align-items-center mb-3">
                      {avgRating > 0 ? (
                        <>
                          <div className="me-2">
                            {renderStars(avgRating)}
                          </div>
                          <span className="text-muted">
                            {avgRating} ({reviewCount} reviews)
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">No reviews yet</span>
                      )}
                    </div>
                    {tutor.tutorProfile?.bio && (
                      <p className="text-muted mb-3">{tutor.tutorProfile.bio}</p>
                    )}
                    <div className="d-flex gap-2">
                      <Link 
                        href={`/tutors/${tutor.id}/book`} 
                        className="btn btn-primary btn-lg"
                      >
                        <i className="bi bi-calendar-plus me-2"></i>
                        Book a Session
                      </Link>
                      {tutor.tutorProfile?.introVideoUrl && (
                        <a 
                          href={tutor.tutorProfile.introVideoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-outline-primary btn-lg"
                        >
                          <i className="bi bi-play-circle me-2"></i>
                          Watch Intro
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h5 className="card-title text-primary mb-3">Quick Info</h5>
                <div className="mb-3">
                  <strong>Rate:</strong>
                  <div className="text-success fw-bold fs-4">
                    ${tutor.tutorProfile?.hourlyRate || 0}/hour
                  </div>
                </div>
                <div className="mb-3">
                  <strong>Availability:</strong>
                  <div className="text-muted">
                    {tutor.tutorProfile?.availability || "Check schedule"}
                  </div>
                </div>
                <div className="mb-3">
                  <strong>Experience:</strong>
                  <div className="text-muted">
                    {tutor.tutorProfile?.experience || "Not specified"}
                  </div>
                </div>
                <div className="mb-3">
                  <strong>Education:</strong>
                  <div className="text-muted">
                    {tutor.tutorProfile?.education || "Not specified"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Languages & Skills */}
        <div className="row mb-5">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title text-primary mb-3">
                  <i className="bi bi-translate me-2"></i>
                  Languages
                </h5>
                {tutor.tutorProfile?.languages?.length ? (
                  <div className="d-flex flex-wrap gap-2">
                    {tutor.tutorProfile.languages.map((lang, index) => (
                      <span key={index} className="badge bg-primary fs-6">
                        {lang}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No languages specified</p>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title text-primary mb-3">
                  <i className="bi bi-award me-2"></i>
                  Specialties
                </h5>
                {tutor.tutorProfile?.skills?.length ? (
                  <div className="d-flex flex-wrap gap-2">
                    {tutor.tutorProfile.skills.map((skill, index) => (
                      <span key={index} className="badge bg-success fs-6">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No specialties specified</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                <h4 className="h5 fw-semibold mb-0">
                  <i className="bi bi-star me-2"></i>
                  Student Reviews ({reviewCount})
                </h4>
              </div>
              <div className="card-body">
                {reviewCount === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-star text-muted" style={{fontSize: '3rem'}}></i>
                    <h5 className="mt-3 text-muted">No reviews yet</h5>
                    <p className="text-muted">Be the first to review this tutor!</p>
                  </div>
                ) : (
                  <div className="row">
                    {tutor.reviewsReceived?.map((review) => (
                      <div key={review.id} className="col-md-6 mb-3">
                        <div className="border rounded p-3">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <strong>{review.student?.name || "Student"}</strong>
                              <div className="text-warning">
                                {renderStars(review.rating)}
                              </div>
                            </div>
                            <small className="text-muted">
                              {formatDate(review.createdAt)}
                            </small>
                          </div>
                          <p className="mb-0 text-muted">{review.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 