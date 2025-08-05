"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import TutorNavBar from '@/components/TutorNavBar';
import { useSessionUpdate } from '@/hooks/useSessionUpdate';
import './premium-profile.css';

export default function TutorProfilePage() {
  const { data: session, status, update } = useSession();
  const { updateSessionWithUserData } = useSessionUpdate();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<{
    bio: string;
    skills: string;
    introVideoUrl: string;
    availability: string;
    hourlyRate: string;
    languages: string;
    experience: string;
    education: string;
    certifications: string;
    teachingMethods: string;
    specializations: string;
    timezone: string;
    maxStudents: string;
    lessonDuration: string;
    trialLesson: string;
    cancellationPolicy: string;
    materials: string;
    achievements: string;
    testimonials: string;
    socialLinks: {
      linkedin: string;
      twitter: string;
      instagram: string;
      website: string;
    };
  }>({
    bio: "",
    skills: "",
    introVideoUrl: "",
    availability: "",
    hourlyRate: "",
    languages: "",
    experience: "",
    education: "",
    certifications: "",
    teachingMethods: "",
    specializations: "",
    timezone: "",
    maxStudents: "",
    lessonDuration: "",
    trialLesson: "",
    cancellationPolicy: "",
    materials: "",
    achievements: "",
    testimonials: "",
    socialLinks: {
      linkedin: "",
      twitter: "",
      instagram: "",
      website: ""
    }
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/auth/signin");
    } else if ((session.user as any).role !== "TUTOR") {
      setError("Only tutors can access this page.");
    } else {
      // Load existing profile data
      loadProfileData();
    }
  }, [session, status, router]);

  const loadProfileData = async () => {
    try {
      const response = await fetch('/api/tutor/profile');
      if (response.ok) {
        const profileData = await response.json();
        
        // Update form data with existing profile data
        setFormData({
          bio: profileData.bio || "",
          skills: Array.isArray(profileData.skills) ? profileData.skills.join(", ") : profileData.skills || "",
          introVideoUrl: profileData.introVideoUrl || "",
          availability: profileData.availability ? JSON.stringify(profileData.availability) : "",
          hourlyRate: profileData.hourlyRate?.toString() || "",
          languages: Array.isArray(profileData.languages) ? profileData.languages.join(", ") : profileData.languages || "",
          experience: profileData.experience?.toString() || "",
          education: profileData.education || "",
          certifications: profileData.certifications || "",
          teachingMethods: profileData.teachingMethods || "",
          specializations: profileData.specializations || "",
          timezone: profileData.timezone || "",
          maxStudents: profileData.maxStudents?.toString() || "",
          lessonDuration: profileData.lessonDuration?.toString() || "",
          trialLesson: profileData.trialLesson || "",
          cancellationPolicy: profileData.cancellationPolicy || "",
          materials: profileData.materials || "",
          achievements: profileData.achievements || "",
          testimonials: profileData.testimonials || "",
          socialLinks: {
            linkedin: profileData.socialLinks?.linkedin || "",
            twitter: profileData.socialLinks?.twitter || "",
            instagram: profileData.socialLinks?.instagram || "",
            website: profileData.socialLinks?.website || ""
          }
        });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Photo upload handlers
  const handleFileSelect = (file: File) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    uploadPhoto(file);
  };

  const uploadPhoto = async (file: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/tutor/profile/photo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Profile photo updated successfully!");
        // Update session with new user data
        if (data.user) {
          await updateSessionWithUserData(data.user);
        }
      } else {
        toast.error(data.error || "Failed to upload photo");
        setPhotoPreview(null);
      }
    } catch (error) {
      toast.error("An error occurred while uploading the photo");
      setPhotoPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = async () => {
    try {
      const response = await fetch('/api/tutor/profile/photo', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Profile photo removed successfully!");
        setPhotoPreview(null);
        // Update session with new user data
        if (data.user) {
          await updateSessionWithUserData(data.user);
        }
      } else {
        toast.error(data.error || "Failed to remove photo");
      }
    } catch (error) {
      toast.error("An error occurred while removing the photo");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        socialLinks: JSON.stringify(formData.socialLinks)
      };
      
      const res = await fetch("/api/tutor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Profile updated successfully!");
        
        // Update session with new profile data if available
        if (data.profile) {
          await updateSessionWithUserData(data.profile);
        }
        
        setTimeout(() => router.push("/tutor/dashboard"), 1500);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error("An error occurred while updating your profile");
    } finally {
      setIsLoading(false);
    }
  }

  const getCurrentPhoto = () => {
    if (photoPreview) return photoPreview;
    if (session?.user?.image) return session.user.image;
    if (session?.user && (session.user as any)?.photo) return (session.user as any).photo;
    return null;
  };

  if (status === "loading") {
    return (
      <div className="premium-profile-container">
        <div className="profile-animated-bg">
          <div className="profile-floating-shapes">
            <div className="profile-shape profile-shape-1"></div>
            <div className="profile-shape profile-shape-2"></div>
            <div className="profile-shape profile-shape-3"></div>
            <div className="profile-shape profile-shape-4"></div>
          </div>
          <div className="profile-gradient-overlay"></div>
        </div>
        <TutorNavBar />
        <div className="premium-loading">
          <div className="premium-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="premium-profile-container">
        <div className="profile-animated-bg">
          <div className="profile-floating-shapes">
            <div className="profile-shape profile-shape-1"></div>
            <div className="profile-shape profile-shape-2"></div>
            <div className="profile-shape profile-shape-3"></div>
            <div className="profile-shape profile-shape-4"></div>
          </div>
          <div className="profile-gradient-overlay"></div>
        </div>
        <TutorNavBar />
        <div className="profile-main-content">
          <div className="premium-alert danger">
            <h3>Access Denied</h3>
            <p>{error}</p>
            <Link href="/" className="premium-button primary">
              🏠 Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-profile-container">
      {/* Animated Background */}
      <div className="profile-animated-bg">
        <div className="profile-floating-shapes">
          <div className="profile-shape profile-shape-1"></div>
          <div className="profile-shape profile-shape-2"></div>
          <div className="profile-shape profile-shape-3"></div>
          <div className="profile-shape profile-shape-4"></div>
        </div>
        <div className="profile-gradient-overlay"></div>
      </div>

      <TutorNavBar />
      
      <div className="profile-main-content">
        {/* Premium Header */}
        <div className="profile-header">
          <div className="profile-header-content">
            <h1 className="profile-title">🌟 Complete Your Profile</h1>
            <p className="profile-subtitle">Create a compelling profile that showcases your expertise and attracts students worldwide</p>
            <div className="profile-progress">
              <div className="profile-progress-bar">
                <div className="profile-progress-fill" style={{ width: '75%' }}></div>
              </div>
              <span className="profile-progress-text">75% Complete</span>
            </div>
          </div>
        </div>

        <div className="profile-content-wrapper">
          {/* Profile Photo Section */}
          <div className="profile-photo-section">
            <div className="premium-card">
              <div className="premium-card-header">
                <h3 className="premium-card-title">
                  <i className="bi bi-camera me-2"></i>
                  Profile Photo
                </h3>
                <p className="premium-card-subtitle">A professional photo helps students connect with you</p>
              </div>
              <div className="profile-photo-content">
                <div className="profile-photo-preview">
                  <div className="profile-photo-container">
                    {getCurrentPhoto() ? (
                      <Image
                        src={getCurrentPhoto()!}
                        alt="Profile"
                        width={200}
                        height={200}
                        className="profile-photo-image"
                      />
                    ) : (
                      <div className="profile-photo-placeholder">
                        <i className="bi bi-person"></i>
                      </div>
                    )}
                    {isUploading && (
                      <div className="profile-photo-overlay">
                        <div className="premium-spinner"></div>
                      </div>
                    )}
                  </div>
                  {getCurrentPhoto() && (
                    <button
                      type="button"
                      className="premium-button danger small"
                      onClick={removePhoto}
                      disabled={isUploading}
                    >
                      <i className="bi bi-trash me-1"></i>
                      Remove
                    </button>
                  )}
                </div>
                <div className="profile-upload-area">
                  <div
                    className={`profile-upload-zone ${isDragOver ? 'drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      style={{ display: 'none' }}
                    />
                    <div className="upload-icon">
                      <i className="bi bi-cloud-upload"></i>
                    </div>
                    <h4>Upload Your Photo</h4>
                    <p>Drag & drop or click to browse</p>
                    <div className="upload-requirements">
                      <span>JPEG, PNG, WebP • Max 5MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Form Section */}
          <div className="profile-form-section">
            <div className="premium-card">
              <div className="premium-card-header">
                <h3 className="premium-card-title">
                  <i className="bi bi-person-badge me-2"></i>
                  Profile Information
                </h3>
                <p className="premium-card-subtitle">Tell students about yourself and your teaching approach</p>
              </div>
              
              {/* Tab Navigation */}
              <div className="profile-tabs">
                <button
                  className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
                  onClick={() => setActiveTab('personal')}
                >
                  <i className="bi bi-person me-2"></i>
                  Personal
                </button>
                <button
                  className={`profile-tab ${activeTab === 'professional' ? 'active' : ''}`}
                  onClick={() => setActiveTab('professional')}
                >
                  <i className="bi bi-briefcase me-2"></i>
                  Professional
                </button>
                <button
                  className={`profile-tab ${activeTab === 'teaching' ? 'active' : ''}`}
                  onClick={() => setActiveTab('teaching')}
                >
                  <i className="bi bi-mortarboard me-2"></i>
                  Teaching
                </button>
                <button
                  className={`profile-tab ${activeTab === 'business' ? 'active' : ''}`}
                  onClick={() => setActiveTab('business')}
                >
                  <i className="bi bi-gear me-2"></i>
                  Business
                </button>
                <button
                  className={`profile-tab ${activeTab === 'media' ? 'active' : ''}`}
                  onClick={() => setActiveTab('media')}
                >
                  <i className="bi bi-camera-video me-2"></i>
                  Media
                </button>
              </div>

              <form onSubmit={handleSubmit} className="profile-form">
                {/* Personal Information Tab */}
                {activeTab === 'personal' && (
                  <div className="profile-tab-content">
                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-person-circle me-2"></i>
                        About You
                      </h4>
                      <div className="form-group">
                        <label className="form-label">
                          Bio <span className="required">*</span>
                        </label>
                        <textarea
                          name="bio"
                          className="premium-input"
                          rows={6}
                          placeholder="Share your teaching philosophy, experience, and what makes you unique as a tutor..."
                          value={formData.bio}
                          onChange={handleInputChange}
                          required
                        />
                        <div className="form-help">Tell students about your teaching style and what they can expect</div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-globe me-2"></i>
                        Languages & Skills
                      </h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">
                            Languages You Teach <span className="required">*</span>
                          </label>
                          <input
                            type="text"
                            name="languages"
                            className="premium-input"
                            placeholder="e.g., English, Spanish, French, German"
                            value={formData.languages}
                            onChange={handleInputChange}
                            required
                          />
                          <div className="form-help">List all languages you can teach</div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            Teaching Skills <span className="required">*</span>
                          </label>
                          <input
                            type="text"
                            name="skills"
                            className="premium-input"
                            placeholder="e.g., Grammar, Conversation, Business English, TOEFL"
                            value={formData.skills}
                            onChange={handleInputChange}
                            required
                          />
                          <div className="form-help">Your key teaching areas and specialties</div>
                        </div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-award me-2"></i>
                        Achievements & Recognition
                      </h4>
                      <div className="form-group">
                        <label className="form-label">Achievements & Awards</label>
                        <textarea
                          name="achievements"
                          className="premium-input"
                          rows={4}
                          placeholder="List any awards, recognitions, or notable achievements in your teaching career..."
                          value={formData.achievements}
                          onChange={handleInputChange}
                        />
                        <div className="form-help">Highlight your accomplishments to build credibility</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Professional Background Tab */}
                {activeTab === 'professional' && (
                  <div className="profile-tab-content">
                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-briefcase me-2"></i>
                        Professional Experience
                      </h4>
                      <div className="form-group">
                        <label className="form-label">
                          Teaching Experience <span className="required">*</span>
                        </label>
                        <textarea
                          name="experience"
                          className="premium-input"
                          rows={4}
                          placeholder="Describe your teaching experience, years of experience, and types of students you've worked with..."
                          value={formData.experience}
                          onChange={handleInputChange}
                          required
                        />
                        <div className="form-help">Be specific about your teaching background</div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-mortarboard me-2"></i>
                        Education & Certifications
                      </h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Education</label>
                          <input
                            type="text"
                            name="education"
                            className="premium-input"
                            placeholder="e.g., BA in English Literature, MA in TESOL"
                            value={formData.education}
                            onChange={handleInputChange}
                          />
                          <div className="form-help">Your academic background</div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Certifications</label>
                          <input
                            type="text"
                            name="certifications"
                            className="premium-input"
                            placeholder="e.g., TESOL, CELTA, DELTA, TEFL"
                            value={formData.certifications}
                            onChange={handleInputChange}
                          />
                          <div className="form-help">Teaching certifications and qualifications</div>
                        </div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-star me-2"></i>
                        Testimonials & Reviews
                      </h4>
                      <div className="form-group">
                        <label className="form-label">Student Testimonials</label>
                        <textarea
                          name="testimonials"
                          className="premium-input"
                          rows={4}
                          placeholder="Share positive feedback from your students..."
                          value={formData.testimonials}
                          onChange={handleInputChange}
                        />
                        <div className="form-help">Include quotes from satisfied students</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Teaching Methods Tab */}
                {activeTab === 'teaching' && (
                  <div className="profile-tab-content">
                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-lightbulb me-2"></i>
                        Teaching Approach
                      </h4>
                      <div className="form-group">
                        <label className="form-label">
                          Teaching Methods <span className="required">*</span>
                        </label>
                        <textarea
                          name="teachingMethods"
                          className="premium-input"
                          rows={4}
                          placeholder="Describe your teaching methodology, approach, and techniques..."
                          value={formData.teachingMethods}
                          onChange={handleInputChange}
                          required
                        />
                        <div className="form-help">Explain how you structure your lessons</div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-target me-2"></i>
                        Specializations
                      </h4>
                      <div className="form-group">
                        <label className="form-label">Areas of Specialization</label>
                        <input
                          type="text"
                          name="specializations"
                          className="premium-input"
                          placeholder="e.g., Business English, Academic Writing, Pronunciation, Exam Preparation"
                          value={formData.specializations}
                          onChange={handleInputChange}
                        />
                        <div className="form-help">Specific areas where you excel</div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-book me-2"></i>
                        Teaching Materials
                      </h4>
                      <div className="form-group">
                        <label className="form-label">Materials & Resources</label>
                        <textarea
                          name="materials"
                          className="premium-input"
                          rows={4}
                          placeholder="Describe the materials, resources, and tools you use in your lessons..."
                          value={formData.materials}
                          onChange={handleInputChange}
                        />
                        <div className="form-help">What resources do you provide to students?</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Business Details Tab */}
                {activeTab === 'business' && (
                  <div className="profile-tab-content">
                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-currency-dollar me-2"></i>
                        Pricing & Availability
                      </h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">
                            Hourly Rate (USD) <span className="required">*</span>
                          </label>
                          <div className="input-group">
                            <span className="input-prefix">$</span>
                            <input
                              type="number"
                              name="hourlyRate"
                              className="premium-input"
                              placeholder="25"
                              min="5"
                              max="200"
                              value={formData.hourlyRate}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                          <div className="form-help">Set your competitive hourly rate</div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            Availability <span className="required">*</span>
                          </label>
                          <input
                            type="text"
                            name="availability"
                            className="premium-input"
                            placeholder="e.g., Mon-Fri 6-9 PM, Sat 10 AM-2 PM"
                            value={formData.availability}
                            onChange={handleInputChange}
                            required
                          />
                          <div className="form-help">When are you available for lessons?</div>
                        </div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-clock me-2"></i>
                        Lesson Settings
                      </h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Lesson Duration</label>
                          <select
                            name="lessonDuration"
                            className="premium-input"
                            value={formData.lessonDuration}
                            onChange={handleInputChange}
                          >
                            <option value="">Select duration</option>
                            <option value={30}>30 minutes - ₦2,000</option>
                            <option value="45">45 minutes</option>
                            <option value="60">60 minutes</option>
                            <option value="90">90 minutes</option>
                            <option value="120">120 minutes</option>
                          </select>
                          <div className="form-help">Default lesson length</div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Max Students per Session</label>
                          <select
                            name="maxStudents"
                            className="premium-input"
                            value={formData.maxStudents}
                            onChange={handleInputChange}
                          >
                            <option value="">Select max students</option>
                            <option value="1">1 (Private)</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5+ (Group)</option>
                          </select>
                          <div className="form-help">Maximum students per lesson</div>
                        </div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-gear me-2"></i>
                        Policies
                      </h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Trial Lesson</label>
                          <select
                            name="trialLesson"
                            className="premium-input"
                            value={formData.trialLesson}
                            onChange={handleInputChange}
                          >
                            <option value="">Select option</option>
                            <option value="free">Free trial</option>
                            <option value="discounted">Discounted trial</option>
                            <option value="full-price">Full price</option>
                            <option value="no-trial">No trial</option>
                          </select>
                          <div className="form-help">Trial lesson policy</div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Cancellation Policy</label>
                          <textarea
                            name="cancellationPolicy"
                            className="premium-input"
                            rows={3}
                            placeholder="Describe your cancellation and rescheduling policy..."
                            value={formData.cancellationPolicy}
                            onChange={handleInputChange}
                          />
                          <div className="form-help">Your cancellation terms</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Media Tab */}
                {activeTab === 'media' && (
                  <div className="profile-tab-content">
                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-camera-video me-2"></i>
                        Introduction Video
                      </h4>
                      <div className="form-group">
                        <label className="form-label">Video URL</label>
                        <input
                          type="url"
                          name="introVideoUrl"
                          className="premium-input"
                          placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                          value={formData.introVideoUrl}
                          onChange={handleInputChange}
                        />
                        <div className="form-help">Add a YouTube or Vimeo link to introduce yourself</div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h4 className="form-section-title">
                        <i className="bi bi-link-45deg me-2"></i>
                        Social Media & Links
                      </h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">LinkedIn</label>
                          <input
                            type="url"
                            name="socialLinks.linkedin"
                            className="premium-input"
                            placeholder="https://linkedin.com/in/yourprofile"
                            value={formData.socialLinks.linkedin}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Website</label>
                          <input
                            type="url"
                            name="socialLinks.website"
                            className="premium-input"
                            placeholder="https://yourwebsite.com"
                            value={formData.socialLinks.website}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Twitter/X</label>
                          <input
                            type="url"
                            name="socialLinks.twitter"
                            className="premium-input"
                            placeholder="https://twitter.com/yourhandle"
                            value={formData.socialLinks.twitter}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Instagram</label>
                          <input
                            type="url"
                            name="socialLinks.instagram"
                            className="premium-input"
                            placeholder="https://instagram.com/yourhandle"
                            value={formData.socialLinks.instagram}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="premium-button primary large"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="premium-spinner small"></div>
                        <span>Saving Profile...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Save Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 