"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import StudentNavbar from "@/components/StudentNavbar";
import './profile-premium.css';

interface ProfileData {
  name: string;
  email: string;
  language: string;
  country: string;
  bio: string;
  photo?: string;
  joinDate: string;
  lastActive: string;
  timezone: string;
  languageLevel: 'beginner' | 'intermediate' | 'advanced' | 'native';
  courseInterests: string[];
  tutorPreferences: {
    accent: string;
    teachingStyle: string;
    availability: string;
    experience: string;
  };
  learningGoals: {
    shortTerm: string;
    longTerm: string;
    targetLanguages: string[];
    proficiencyTarget: string;
  };
  preferences: {
    notifications: boolean;
    emailUpdates: boolean;
    publicProfile: boolean;
  };
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface LearningStats {
  totalSessions: number;
  totalHours: number;
  currentStreak: number;
  longestStreak: number;
  averageRating: number;
  languagesLearned: number;
  certificatesEarned: number;
  challengesCompleted: number;
  level: number;
  experience: number;
  experienceToNextLevel: number;
}

interface ActivityData {
  date: string;
  sessions: number;
  hours: number;
  words: number;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Core state
  const [profile, setProfile] = useState<ProfileData>({
    name: session?.user?.name || "Full Name",
    email: session?.user?.email || "your@email.com",
    language: "English",
    country: "United States",
    bio: "Passionate language learner excited to connect with native speakers and improve my skills through conversation and cultural exchange.",
    joinDate: "2024-01-15",
    lastActive: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    languageLevel: 'beginner',
    courseInterests: ['Business English', 'Travel Spanish', 'Academic Writing'],
    tutorPreferences: {
      accent: 'American',
      teachingStyle: 'conversational',
      availability: 'evening',
      experience: 'experienced',
    },
    learningGoals: {
      shortTerm: 'Learn basic conversation skills in 3 months',
      longTerm: 'Achieve fluency for business communication',
      targetLanguages: ['Spanish', 'French'],
      proficiencyTarget: 'intermediate',
    },
    preferences: {
      notifications: true,
      emailUpdates: true,
      publicProfile: false,
    }
  });
  
  // UI state
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'activity' | 'settings'>('overview');

  // Activity and achievements state
  const [activityPeriod, setActivityPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'common' | 'rare' | 'epic' | 'legendary'>('all');

  // Selection options for form fields
  const languageOptions = [
    { value: 'english', label: 'English' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' },
    { value: 'italian', label: 'Italian' },
    { value: 'portuguese', label: 'Portuguese' },
    { value: 'russian', label: 'Russian' },
    { value: 'chinese', label: 'Chinese' },
    { value: 'japanese', label: 'Japanese' },
    { value: 'korean', label: 'Korean' },
    { value: 'arabic', label: 'Arabic' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'bengali', label: 'Bengali' },
    { value: 'turkish', label: 'Turkish' },
    { value: 'dutch', label: 'Dutch' },
    { value: 'swedish', label: 'Swedish' },
    { value: 'norwegian', label: 'Norwegian' },
    { value: 'danish', label: 'Danish' },
    { value: 'finnish', label: 'Finnish' },
    { value: 'polish', label: 'Polish' },
    { value: 'czech', label: 'Czech' },
    { value: 'hungarian', label: 'Hungarian' },
    { value: 'greek', label: 'Greek' },
    { value: 'hebrew', label: 'Hebrew' },
    { value: 'thai', label: 'Thai' },
    { value: 'vietnamese', label: 'Vietnamese' },
    { value: 'indonesian', label: 'Indonesian' },
    { value: 'malay', label: 'Malay' },
    { value: 'filipino', label: 'Filipino' },
    { value: 'swahili', label: 'Swahili' },
    { value: 'yoruba', label: 'Yoruba' },
    { value: 'hausa', label: 'Hausa' },
    { value: 'igbo', label: 'Igbo' }
  ];

  const courseInterestOptions = [
    { value: 'business_english', label: 'Business English' },
    { value: 'travel_spanish', label: 'Travel Spanish' },
    { value: 'academic_writing', label: 'Academic Writing' },
    { value: 'conversation_practice', label: 'Conversation Practice' },
    { value: 'grammar_focus', label: 'Grammar Focus' },
    { value: 'pronunciation', label: 'Pronunciation' },
    { value: 'reading_comprehension', label: 'Reading Comprehension' },
    { value: 'listening_skills', label: 'Listening Skills' },
    { value: 'writing_skills', label: 'Writing Skills' },
    { value: 'cultural_immersion', label: 'Cultural Immersion' },
    { value: 'test_preparation', label: 'Test Preparation (IELTS, TOEFL, etc.)' },
    { value: 'children_learning', label: 'Children\'s Learning' },
    { value: 'teen_learning', label: 'Teen Learning' },
    { value: 'adult_learning', label: 'Adult Learning' },
    { value: 'professional_development', label: 'Professional Development' },
    { value: 'casual_learning', label: 'Casual Learning' },
    { value: 'intensive_course', label: 'Intensive Course' },
    { value: 'one_on_one', label: 'One-on-One Sessions' },
    { value: 'group_lessons', label: 'Group Lessons' },
    { value: 'online_learning', label: 'Online Learning' },
    { value: 'in_person', label: 'In-Person Learning' }
  ];

  const accentOptions = [
    { value: 'american', label: 'American' },
    { value: 'british', label: 'British' },
    { value: 'australian', label: 'Australian' },
    { value: 'canadian', label: 'Canadian' },
    { value: 'irish', label: 'Irish' },
    { value: 'scottish', label: 'Scottish' },
    { value: 'south_african', label: 'South African' },
    { value: 'indian', label: 'Indian' },
    { value: 'singaporean', label: 'Singaporean' },
    { value: 'filipino', label: 'Filipino' },
    { value: 'nigerian', label: 'Nigerian' },
    { value: 'ghanaian', label: 'Ghanaian' },
    { value: 'kenyan', label: 'Kenyan' },
    { value: 'tanzanian', label: 'Tanzanian' },
    { value: 'ugandan', label: 'Ugandan' },
    { value: 'any', label: 'Any Accent' },
    { value: 'native', label: 'Native Speaker' },
    { value: 'non_native', label: 'Non-Native Speaker' }
  ];

  const teachingStyleOptions = [
    { value: 'conversational', label: 'Conversational' },
    { value: 'structured', label: 'Structured' },
    { value: 'grammar_focused', label: 'Grammar Focused' },
    { value: 'culture_focused', label: 'Culture Focused' },
    { value: 'business_focused', label: 'Business Focused' },
    { value: 'casual', label: 'Casual' },
    { value: 'formal', label: 'Formal' },
    { value: 'interactive', label: 'Interactive' },
    { value: 'traditional', label: 'Traditional' },
    { value: 'modern', label: 'Modern' },
    { value: 'game_based', label: 'Game-Based' },
    { value: 'project_based', label: 'Project-Based' },
    { value: 'task_based', label: 'Task-Based' },
    { value: 'content_based', label: 'Content-Based' },
    { value: 'communicative', label: 'Communicative' },
    { value: 'direct_method', label: 'Direct Method' },
    { value: 'audio_lingual', label: 'Audio-Lingual' },
    { value: 'suggestopedia', label: 'Suggestopedia' },
    { value: 'silent_way', label: 'Silent Way' },
    { value: 'total_physical_response', label: 'Total Physical Response' }
  ];

  const availabilityOptions = [
    { value: 'morning', label: 'Morning (6 AM - 12 PM)' },
    { value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)' },
    { value: 'evening', label: 'Evening (6 PM - 12 AM)' },
    { value: 'night', label: 'Night (12 AM - 6 AM)' },
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'weekends', label: 'Weekends' },
    { value: 'flexible', label: 'Flexible' },
    { value: 'early_morning', label: 'Early Morning (5 AM - 9 AM)' },
    { value: 'late_evening', label: 'Late Evening (8 PM - 12 AM)' },
    { value: 'lunch_break', label: 'Lunch Break' },
    { value: 'after_work', label: 'After Work' },
    { value: 'before_work', label: 'Before Work' },
    { value: 'any_time', label: 'Any Time' }
  ];

  const experienceOptions = [
    { value: 'new', label: 'New Tutors (0-2 years)' },
    { value: 'experienced', label: 'Experienced (2-5 years)' },
    { value: 'expert', label: 'Expert (5+ years)' },
    { value: 'certified', label: 'Certified Teachers' },
    { value: 'university_professors', label: 'University Professors' },
    { value: 'school_teachers', label: 'School Teachers' },
    { value: 'private_tutors', label: 'Private Tutors' },
    { value: 'language_school_instructors', label: 'Language School Instructors' },
    { value: 'online_tutors', label: 'Online Tutors' },
    { value: 'native_speakers', label: 'Native Speakers' },
    { value: 'any', label: 'Any Experience Level' }
  ];

  const proficiencyOptions = [
    { value: 'basic', label: 'Basic (A1-A2)' },
    { value: 'intermediate', label: 'Intermediate (B1-B2)' },
    { value: 'advanced', label: 'Advanced (C1-C2)' },
    { value: 'native_like', label: 'Native-like' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'elementary', label: 'Elementary' },
    { value: 'pre_intermediate', label: 'Pre-Intermediate' },
    { value: 'upper_intermediate', label: 'Upper Intermediate' },
    { value: 'pre_advanced', label: 'Pre-Advanced' },
    { value: 'mastery', label: 'Mastery' }
  ];

  const countryOptions = [
    { value: 'united_states', label: 'United States' },
    { value: 'canada', label: 'Canada' },
    { value: 'united_kingdom', label: 'United Kingdom' },
    { value: 'australia', label: 'Australia' },
    { value: 'germany', label: 'Germany' },
    { value: 'france', label: 'France' },
    { value: 'spain', label: 'Spain' },
    { value: 'italy', label: 'Italy' },
    { value: 'netherlands', label: 'Netherlands' },
    { value: 'sweden', label: 'Sweden' },
    { value: 'norway', label: 'Norway' },
    { value: 'denmark', label: 'Denmark' },
    { value: 'finland', label: 'Finland' },
    { value: 'switzerland', label: 'Switzerland' },
    { value: 'austria', label: 'Austria' },
    { value: 'belgium', label: 'Belgium' },
    { value: 'ireland', label: 'Ireland' },
    { value: 'new_zealand', label: 'New Zealand' },
    { value: 'japan', label: 'Japan' },
    { value: 'south_korea', label: 'South Korea' },
    { value: 'china', label: 'China' },
    { value: 'india', label: 'India' },
    { value: 'brazil', label: 'Brazil' },
    { value: 'mexico', label: 'Mexico' },
    { value: 'argentina', label: 'Argentina' },
    { value: 'chile', label: 'Chile' },
    { value: 'colombia', label: 'Colombia' },
    { value: 'peru', label: 'Peru' },
    { value: 'venezuela', label: 'Venezuela' },
    { value: 'ecuador', label: 'Ecuador' },
    { value: 'uruguay', label: 'Uruguay' },
    { value: 'paraguay', label: 'Paraguay' },
    { value: 'bolivia', label: 'Bolivia' },
    { value: 'guyana', label: 'Guyana' },
    { value: 'suriname', label: 'Suriname' },
    { value: 'french_guiana', label: 'French Guiana' },
    { value: 'russia', label: 'Russia' },
    { value: 'ukraine', label: 'Ukraine' },
    { value: 'poland', label: 'Poland' },
    { value: 'czech_republic', label: 'Czech Republic' },
    { value: 'hungary', label: 'Hungary' },
    { value: 'romania', label: 'Romania' },
    { value: 'bulgaria', label: 'Bulgaria' },
    { value: 'serbia', label: 'Serbia' },
    { value: 'croatia', label: 'Croatia' },
    { value: 'slovenia', label: 'Slovenia' },
    { value: 'slovakia', label: 'Slovakia' },
    { value: 'lithuania', label: 'Lithuania' },
    { value: 'latvia', label: 'Latvia' },
    { value: 'estonia', label: 'Estonia' },
    { value: 'greece', label: 'Greece' },
    { value: 'turkey', label: 'Turkey' },
    { value: 'israel', label: 'Israel' },
    { value: 'saudi_arabia', label: 'Saudi Arabia' },
    { value: 'uae', label: 'United Arab Emirates' },
    { value: 'qatar', label: 'Qatar' },
    { value: 'kuwait', label: 'Kuwait' },
    { value: 'bahrain', label: 'Bahrain' },
    { value: 'oman', label: 'Oman' },
    { value: 'jordan', label: 'Jordan' },
    { value: 'lebanon', label: 'Lebanon' },
    { value: 'syria', label: 'Syria' },
    { value: 'iraq', label: 'Iraq' },
    { value: 'iran', label: 'Iran' },
    { value: 'pakistan', label: 'Pakistan' },
    { value: 'bangladesh', label: 'Bangladesh' },
    { value: 'sri_lanka', label: 'Sri Lanka' },
    { value: 'nepal', label: 'Nepal' },
    { value: 'bhutan', label: 'Bhutan' },
    { value: 'myanmar', label: 'Myanmar' },
    { value: 'thailand', label: 'Thailand' },
    { value: 'vietnam', label: 'Vietnam' },
    { value: 'cambodia', label: 'Cambodia' },
    { value: 'laos', label: 'Laos' },
    { value: 'malaysia', label: 'Malaysia' },
    { value: 'singapore', label: 'Singapore' },
    { value: 'indonesia', label: 'Indonesia' },
    { value: 'philippines', label: 'Philippines' },
    { value: 'brunei', label: 'Brunei' },
    { value: 'east_timor', label: 'East Timor' },
    { value: 'mongolia', label: 'Mongolia' },
    { value: 'kazakhstan', label: 'Kazakhstan' },
    { value: 'uzbekistan', label: 'Uzbekistan' },
    { value: 'turkmenistan', label: 'Turkmenistan' },
    { value: 'kyrgyzstan', label: 'Kyrgyzstan' },
    { value: 'tajikistan', label: 'Tajikistan' },
    { value: 'afghanistan', label: 'Afghanistan' },
    { value: 'south_africa', label: 'South Africa' },
    { value: 'nigeria', label: 'Nigeria' },
    { value: 'kenya', label: 'Kenya' },
    { value: 'tanzania', label: 'Tanzania' },
    { value: 'uganda', label: 'Uganda' },
    { value: 'ghana', label: 'Ghana' },
    { value: 'ethiopia', label: 'Ethiopia' },
    { value: 'morocco', label: 'Morocco' },
    { value: 'algeria', label: 'Algeria' },
    { value: 'tunisia', label: 'Tunisia' },
    { value: 'libya', label: 'Libya' },
    { value: 'egypt', label: 'Egypt' },
    { value: 'sudan', label: 'Sudan' },
    { value: 'south_sudan', label: 'South Sudan' },
    { value: 'chad', label: 'Chad' },
    { value: 'niger', label: 'Niger' },
    { value: 'mali', label: 'Mali' },
    { value: 'burkina_faso', label: 'Burkina Faso' },
    { value: 'senegal', label: 'Senegal' },
    { value: 'gambia', label: 'Gambia' },
    { value: 'guinea_bissau', label: 'Guinea-Bissau' },
    { value: 'guinea', label: 'Guinea' },
    { value: 'sierra_leone', label: 'Sierra Leone' },
    { value: 'liberia', label: 'Liberia' },
    { value: 'ivory_coast', label: 'Ivory Coast' },
    { value: 'benin', label: 'Benin' },
    { value: 'togo', label: 'Togo' },
    { value: 'cameroon', label: 'Cameroon' },
    { value: 'central_african_republic', label: 'Central African Republic' },
    { value: 'equatorial_guinea', label: 'Equatorial Guinea' },
    { value: 'gabon', label: 'Gabon' },
    { value: 'congo', label: 'Republic of the Congo' },
    { value: 'dr_congo', label: 'Democratic Republic of the Congo' },
    { value: 'angola', label: 'Angola' },
    { value: 'zambia', label: 'Zambia' },
    { value: 'zimbabwe', label: 'Zimbabwe' },
    { value: 'botswana', label: 'Botswana' },
    { value: 'namibia', label: 'Namibia' },
    { value: 'lesotho', label: 'Lesotho' },
    { value: 'eswatini', label: 'Eswatini' },
    { value: 'madagascar', label: 'Madagascar' },
    { value: 'mauritius', label: 'Mauritius' },
    { value: 'seychelles', label: 'Seychelles' },
    { value: 'comoros', label: 'Comoros' },
    { value: 'djibouti', label: 'Djibouti' },
    { value: 'somalia', label: 'Somalia' },
    { value: 'eritrea', label: 'Eritrea' },
    { value: 'burundi', label: 'Burundi' },
    { value: 'rwanda', label: 'Rwanda' },
    { value: 'mozambique', label: 'Mozambique' },
    { value: 'malawi', label: 'Malawi' },
    { value: 'other', label: 'Other' }
  ];

  // Dynamic data state
  const [learningStats, setLearningStats] = useState<LearningStats>({
    totalSessions: 0,
    totalHours: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageRating: 0,
    languagesLearned: 0,
    certificatesEarned: 0,
    challengesCompleted: 0,
    level: 1,
    experience: 0,
    experienceToNextLevel: 100
  });

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Mock data for premium experience - using useMemo to prevent re-renders
  const mockAchievements = useMemo<Achievement[]>(() => [
    {
      id: '1',
      title: t('profile_page.achievement_data.first_steps'),
      description: t('profile_page.achievement_data.first_steps_desc'),
      icon: '🚀',
      color: '#667eea',
      unlockedAt: '2024-01-15',
      rarity: 'common'
    },
    {
      id: '2',
      title: t('profile_page.achievement_data.week_warrior'),
      description: t('profile_page.achievement_data.week_warrior_desc'),
      icon: '🔥',
      color: '#ff6b6b',
      unlockedAt: '2024-01-22',
      rarity: 'rare'
    },
    {
      id: '3',
      title: t('profile_page.achievement_data.language_master'),
      description: t('profile_page.achievement_data.language_master_desc'),
      icon: '👑',
      color: '#feca57',
      unlockedAt: '2024-02-01',
      rarity: 'epic'
    },
    {
      id: '4',
      title: t('profile_page.achievement_data.legendary_learner'),
      description: t('profile_page.achievement_data.legendary_learner_desc'),
      icon: '⭐',
      color: '#ff9ff3',
      unlockedAt: '2024-02-15',
      rarity: 'legendary'
    }
  ], [t]);

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Update profile name with translation when ready
  useEffect(() => {
    if (!session?.user?.name) {
      setProfile(prev => ({
        ...prev,
        name: t('profile_page.full_name')
      }));
    }
  }, [t, session?.user?.name]);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          setProfile(data.user);
          setOriginalProfile(data.user); // Store original profile for comparison
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        toast.error(t('profile_page.failed_to_load_profile'));
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.email) {
      loadProfile();
    } else {
      setIsLoading(false);
    }
  }, [session]);

  // Load dynamic data
  useEffect(() => {
    const loadDynamicData = async () => {
      try {
        // Load learning stats
        const statsResponse = await fetch('/api/profile/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setLearningStats(statsData);
        } else {
          // Fallback to mock data
          setLearningStats({
            totalSessions: 47,
            totalHours: 23.5,
            currentStreak: 12,
            longestStreak: 28,
            averageRating: 4.8,
            languagesLearned: 3,
            certificatesEarned: 5,
            challengesCompleted: 12,
            level: 12,
            experience: 750,
            experienceToNextLevel: 100
          });
        }

        // Load achievements
        const achievementsResponse = await fetch('/api/profile/achievements');
        if (achievementsResponse.ok) {
          const achievementsData = await achievementsResponse.json();
          setAchievements(achievementsData);
        } else {
          // Fallback to mock data
          setAchievements(mockAchievements);
        }

        // Load activity data
        const activityResponse = await fetch(`/api/profile/activity?period=${activityPeriod}`);
        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          setActivityData(activityData);
        } else {
          // Fallback to mock data
          setActivityData(generateMockActivityData(activityPeriod));
        }

        // Load recent activity
        const recentResponse = await fetch('/api/profile/recent-activity');
        if (recentResponse.ok) {
          const recentData = await recentResponse.json();
          setRecentActivity(recentData);
        } else {
          // Fallback to mock data
          setRecentActivity(generateMockRecentActivity());
        }

      } catch (error) {
        console.error('Failed to load dynamic data:', error);
        // Set fallback data
        setLearningStats({
          totalSessions: 47,
          totalHours: 23.5,
          currentStreak: 12,
          longestStreak: 28,
          averageRating: 4.8,
          languagesLearned: 3,
          certificatesEarned: 5,
          challengesCompleted: 12,
          level: 12,
          experience: 750,
          experienceToNextLevel: 100
        });
        setAchievements(mockAchievements);
        setActivityData(generateMockActivityData(activityPeriod));
        setRecentActivity(generateMockRecentActivity());
      }
    };

    if (session?.user?.email) {
      loadDynamicData();
    }
  }, [session, activityPeriod, mockAchievements]);

  // Generate mock activity data
  const generateMockActivityData = (period: string): ActivityData[] => {
    const data: ActivityData[] = [];
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        sessions: Math.floor(Math.random() * 3) + 1,
        hours: Math.random() * 2 + 0.5,
        words: Math.floor(Math.random() * 50) + 10
      });
    }
    return data;
  };

  // Generate mock recent activity
  const generateMockRecentActivity = () => {
    return [
      {
        id: 1,
        type: 'session_completed',
        title: 'Completed Spanish Session',
        description: 'Finished lesson on basic greetings',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        icon: '🇪🇸'
      },
      {
        id: 2,
        type: 'achievement_unlocked',
        title: 'Week Warrior Achievement',
        description: 'Maintained 7-day learning streak',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        icon: '🏆'
      },
      {
        id: 3,
        type: 'level_up',
        title: 'Level Up!',
        description: 'Reached level 12',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '⭐'
      }
    ];
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Name validation
    if (!profile.name.trim()) {
      errors.name = t('profile_page.validation.name_required');
    } else if (profile.name.trim().length < 2) {
      errors.name = t('profile_page.validation.name_min_length');
    }

    // Language validation
    if (!profile.language.trim()) {
      errors.language = t('profile_page.validation.language_required');
    }

    // Course interests validation
    if (profile.courseInterests && profile.courseInterests.length > 0) {
      const invalidInterests = profile.courseInterests.filter(interest => !interest.trim());
      if (invalidInterests.length > 0) {
        errors.courseInterests = t('profile_page.validation.invalid_interests');
      }
    }

    // Target languages validation
    if (profile.learningGoals?.targetLanguages && profile.learningGoals.targetLanguages.length > 0) {
      const invalidLanguages = profile.learningGoals.targetLanguages.filter(lang => !lang.trim());
      if (invalidLanguages.length > 0) {
        errors.learningGoals = t('profile_page.validation.invalid_languages');
      }
    }

    // Bio validation
    if (profile.bio && profile.bio.length > 500) {
      errors.bio = t('profile_page.validation.bio_max_length');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if profile has changes
  const hasChanges = useMemo(() => {
    if (!originalProfile) return false;
    return JSON.stringify(profile) !== JSON.stringify(originalProfile);
  }, [profile, originalProfile]);

  // Update profile
  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      toast.error(t('profile_page.validation.fix_errors'));
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        toast.success(t('profile_page.profile_updated_successfully'));
        setEditMode(false);
        setOriginalProfile(profile); // Update original profile
        setFormErrors({}); // Clear errors
        // Refresh data
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
      } else {
        const error = await response.json();
        toast.error(error.error || t('profile_page.update_failed'));
      }
    } catch (error) {
      toast.error(t('profile_page.update_failed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Upload photo
  const uploadPhoto = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        // Update the profile with the new photo URL
        setProfile(prev => ({ ...prev, photo: data.photoUrl }));
        // Also update the original profile to persist the change
        setOriginalProfile(prev => prev ? { ...prev, photo: data.photoUrl } : null);
        toast.success(t('profile_page.profile_photo_updated'));
        setShowPhotoModal(false);
      } else {
        const error = await response.json();
        toast.error(error.error || t('profile_page.upload_failed'));
      }
    } catch (error) {
      toast.error(t('profile_page.upload_failed'));
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please select a JPG, PNG, GIF, or WebP image.');
        return;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        toast.error('File too large. Please select an image smaller than 5MB.');
        return;
      }

      // Show preview before upload
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        // You could show a preview here if needed
        uploadPhoto(file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Refresh activity data when period changes
  const refreshActivityData = async (period: 'week' | 'month' | 'year') => {
    try {
      const response = await fetch(`/api/profile/activity?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setActivityData(data);
      } else {
        console.error('Failed to load activity data:', response.status);
        setActivityData(generateMockActivityData(period));
      }
    } catch (error) {
      console.error('Failed to refresh activity data:', error);
      setActivityData(generateMockActivityData(period));
    }
  };

  // Refresh achievements data
  const refreshAchievementsData = async () => {
    try {
      const response = await fetch('/api/profile/achievements');
      if (response.ok) {
        const data = await response.json();
        setAchievements(data);
      } else {
        console.error('Failed to load achievements:', response.status);
        setAchievements(mockAchievements);
      }
    } catch (error) {
      console.error('Failed to refresh achievements:', error);
      setAchievements(mockAchievements);
    }
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        toast.success(t('profile_page.settings_saved'));
      } else {
        const error = await response.json();
        toast.error(error.error || t('profile_page.save_failed'));
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(t('profile_page.save_failed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Filter achievements by rarity
  const filteredAchievements = useMemo(() => {
    if (achievementFilter === 'all') return achievements;
    return achievements.filter(achievement => achievement.rarity === achievementFilter);
  }, [achievements, achievementFilter]);

  // Get rarity filter label
  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'common': return t('profile_page.filter_common');
      case 'rare': return t('profile_page.filter_rare');
      case 'epic': return t('profile_page.filter_epic');
      case 'legendary': return t('profile_page.filter_legendary');
      default: return rarity;
    }
  };

  // Calculate level progress
  const levelProgress = useMemo(() => {
    return (learningStats.experience / learningStats.experienceToNextLevel) * 100;
  }, [learningStats.experience, learningStats.experienceToNextLevel]);

  // Refresh data
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Reload all data
      const [statsResponse, achievementsResponse, activityResponse] = await Promise.all([
        fetch('/api/profile/stats'),
        fetch('/api/profile/achievements'),
        fetch(`/api/profile/activity?period=${activityPeriod}`)
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setLearningStats(statsData);
      }

      if (achievementsResponse.ok) {
        const achievementsData = await achievementsResponse.json();
        setAchievements(achievementsData);
      }

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivityData(activityData);
      }

      toast.success('Data refreshed successfully!');
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [activityPeriod]);

  if (isLoading) {
    return (
      <div className="premium-profile-container">
        <StudentNavbar />
        <div className="premium-loading-container">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
          </div>
          <p className="spinner-text">{t('profile_page.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <StudentNavbar />
      
      {/* Changes Indicator */}
      {editMode && hasChanges && (
        <div className="changes-indicator">
          ✏️ {t('profile_page.unsaved_changes')}
        </div>
      )}
      
      <div className="profile-content">
        <div className="profile-header">
          <div className="profile-info">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {profile.photo ? (
                  <img 
                    src={profile.photo} 
                    alt={profile.name}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=150&background=667eea&color=fff&bold=true`;
                    }}
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="avatar-edit-overlay">
                  <button 
                    className="edit-avatar-btn"
                    onClick={() => setShowPhotoModal(true)}
                  >
                    📷
                  </button>
                </div>
              </div>
            </div>
            <div className="profile-details">
              <h1 className="profile-name">{profile.name}</h1>
              <p className="profile-email">{profile.email}</p>
              <div className="profile-meta">
                <span className="join-date">
                  {t('profile_page.joined')} {new Date(profile.joinDate).toLocaleDateString()}
                </span>
                <span className="last-active">
                  {t('profile_page.last_active')} {new Date(profile.lastActive).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="profile-actions">
            {!editMode ? (
              <button 
                className="edit-btn"
                onClick={() => setEditMode(true)}
              >
                <span className="edit-icon">✏️</span>
                {t('profile_page.edit_profile')}
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  className="save-btn"
                  onClick={updateProfile}
                  disabled={isSaving || !hasChanges}
                >
                  {isSaving ? (
                    <>
                      <span className="spinner-ring"></span>
                      {t('profile_page.saving')}
                    </>
                  ) : (
                    <>
                      <span className="save-icon">💾</span>
                      {t('profile_page.save_changes')}
                    </>
                  )}
                </button>
                <button 
                  className="cancel-btn"
                  onClick={() => {
                    setProfile(originalProfile || profile);
                    setEditMode(false);
                    setFormErrors({});
                  }}
                  disabled={isSaving}
                >
                  <span className="cancel-icon">❌</span>
                  {t('profile_page.cancel')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs-section">
          <div className="tabs-container">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span className="tab-icon">📊</span>
              {t('profile_page.overview')}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
              onClick={() => setActiveTab('achievements')}
            >
              <span className="tab-icon">🏆</span>
              {t('profile_page.achievements')} ({achievements.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <span className="tab-icon">📈</span>
              {t('profile_page.activity')}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className="tab-icon">⚙️</span>
              {t('profile_page.settings')}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
          {activeTab === 'overview' && (
            <div className={`tab-content overview-tab ${activeTab === 'overview' ? 'visible' : ''}`}>
              <div className="content-grid">
                {/* Profile Information */}
                <div className="content-card">
                  <h3>{t('profile_page.profile_information')}</h3>
                  {editMode ? (
                    <form onSubmit={updateProfile} className="edit-form">
                      <div className="form-group">
                        <label>{t('profile_page.full_name')}</label>
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                        {formErrors.name && <p className="error-message">{formErrors.name}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.learning_language')}</label>
                        <select
                          value={profile.language}
                          onChange={(e) => setProfile(prev => ({ ...prev, language: e.target.value }))}
                        >
                          <option value="">{t('profile_page.selection_options.select_learning_language')}</option>
                          {languageOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {formErrors.language && <p className="error-message">{formErrors.language}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.language_level')}</label>
                        <select
                          value={profile.languageLevel}
                          onChange={(e) => setProfile(prev => ({ ...prev, languageLevel: e.target.value as any }))}
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="native">Native</option>
                        </select>
                        {formErrors.languageLevel && <p className="error-message">{formErrors.languageLevel}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.course_interests')}</label>
                        <select
                          multiple
                          value={profile.courseInterests || []}
                          onChange={(e) => {
                            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                            setProfile(prev => ({ 
                            ...prev, 
                              courseInterests: selectedOptions
                            }));
                          }}
                          className="multi-select"
                        >
                          {courseInterestOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <small className="form-hint">{t('profile_page.selection_options.multi_select_hint')}</small>
                        {formErrors.courseInterests && <p className="error-message">{formErrors.courseInterests}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.tutor_accent_preference')}</label>
                        <select
                          multiple
                          value={profile.tutorPreferences?.accent ? [profile.tutorPreferences.accent] : []}
                          onChange={(e) => {
                            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                            setProfile(prev => ({ 
                            ...prev, 
                              tutorPreferences: { ...prev.tutorPreferences, accent: selectedOptions.join(', ') }
                            }));
                          }}
                          className="multi-select"
                        >
                          {accentOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <small className="form-hint">{t('profile_page.selection_options.multi_select_hint')}</small>
                        {formErrors.tutorPreferences && <p className="error-message">{formErrors.tutorPreferences}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.preferred_teaching_style')}</label>
                        <select
                          value={profile.tutorPreferences?.teachingStyle || ''}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            tutorPreferences: { ...prev.tutorPreferences, teachingStyle: e.target.value }
                          }))}
                        >
                          <option value="">{t('profile_page.selection_options.select_teaching_style')}</option>
                          {teachingStyleOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {formErrors.tutorPreferences && <p className="error-message">{formErrors.tutorPreferences}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.preferred_availability')}</label>
                        <select
                          value={profile.tutorPreferences?.availability || ''}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            tutorPreferences: { ...prev.tutorPreferences, availability: e.target.value }
                          }))}
                        >
                          <option value="">{t('profile_page.selection_options.select_availability')}</option>
                          {availabilityOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {formErrors.tutorPreferences && <p className="error-message">{formErrors.tutorPreferences}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.preferred_tutor_experience')}</label>
                        <select
                          value={profile.tutorPreferences?.experience || ''}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            tutorPreferences: { ...prev.tutorPreferences, experience: e.target.value }
                          }))}
                        >
                          <option value="">{t('profile_page.selection_options.select_experience')}</option>
                          {experienceOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {formErrors.tutorPreferences && <p className="error-message">{formErrors.tutorPreferences}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.short_term_goal')}</label>
                        <textarea
                          value={profile.learningGoals?.shortTerm || ''}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            learningGoals: { ...prev.learningGoals, shortTerm: e.target.value }
                          }))}
                          placeholder={t('profile_page.short_term_goal_placeholder')}
                          rows={2}
                          maxLength={200}
                        />
                        <div className="char-counter">
                          {profile.learningGoals?.shortTerm?.length || 0}/200
                        </div>
                        {formErrors.learningGoals && <p className="error-message">{formErrors.learningGoals}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.long_term_goal')}</label>
                        <textarea
                          value={profile.learningGoals?.longTerm || ''}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            learningGoals: { ...prev.learningGoals, longTerm: e.target.value }
                          }))}
                          placeholder={t('profile_page.long_term_goal_placeholder')}
                          rows={2}
                          maxLength={200}
                        />
                        <div className="char-counter">
                          {profile.learningGoals?.longTerm?.length || 0}/200
                        </div>
                        {formErrors.learningGoals && <p className="error-message">{formErrors.learningGoals}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.target_languages')}</label>
                        <select
                          multiple
                          value={profile.learningGoals?.targetLanguages || []}
                          onChange={(e) => {
                            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                            setProfile(prev => ({ 
                            ...prev, 
                            learningGoals: { 
                              ...prev.learningGoals, 
                                targetLanguages: selectedOptions
                              }
                            }));
                          }}
                          className="multi-select"
                        >
                          {languageOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <small className="form-hint">Hold Ctrl (or Cmd on Mac) to select multiple options</small>
                        {formErrors.learningGoals && <p className="error-message">{formErrors.learningGoals}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.proficiency_target')}</label>
                        <select
                          value={profile.learningGoals?.proficiencyTarget || ''}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            learningGoals: { ...prev.learningGoals, proficiencyTarget: e.target.value }
                          }))}
                        >
                          <option value="">Select proficiency level</option>
                          {proficiencyOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {formErrors.learningGoals && <p className="error-message">{formErrors.learningGoals}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.country')}</label>
                        <select
                          value={profile.country || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, country: e.target.value }))}
                        >
                          <option value="">Select country</option>
                          {countryOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {formErrors.country && <p className="error-message">{formErrors.country}</p>}
                      </div>
                      <div className="form-group">
                        <label>{t('profile_page.bio')}</label>
                        <textarea
                          value={profile.bio || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                          placeholder={t('profile_page.bio_placeholder')}
                          rows={3}
                          maxLength={500}
                        />
                        <div className="char-counter">
                          {profile.bio?.length || 0}/500
                        </div>
                        {formErrors.bio && <p className="error-message">{formErrors.bio}</p>}
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="save-btn" disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <span className="spinner-ring"></span>
                              {t('profile_page.saving')}
                            </>
                          ) : (
                            t('profile_page.save_changes')
                          )}
                        </button>
                        <button 
                          type="button" 
                          className="cancel-btn"
                          onClick={() => {
                            setProfile(originalProfile || profile);
                            setEditMode(false);
                            setFormErrors({});
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="profile-details">
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.full_name')}:</span>
                        <span className="info-value">{profile.name}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.learning_language')}:</span>
                        <span className="info-value">{profile.language}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.language_level')}:</span>
                        <span className="info-value">{profile.languageLevel}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.course_interests')}:</span>
                        <span className="info-value">
                          {profile.courseInterests && profile.courseInterests.length > 0 
                            ? profile.courseInterests.join(', ') 
                            : t('profile_page.not_specified')
                          }
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.tutor_accent_preference')}:</span>
                        <span className="info-value">{profile.tutorPreferences?.accent || t('profile_page.not_specified')}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.preferred_teaching_style')}:</span>
                        <span className="info-value">{profile.tutorPreferences?.teachingStyle || t('profile_page.not_specified')}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.preferred_availability')}:</span>
                        <span className="info-value">{profile.tutorPreferences?.availability || t('profile_page.not_specified')}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.preferred_tutor_experience')}:</span>
                        <span className="info-value">{profile.tutorPreferences?.experience || t('profile_page.not_specified')}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.short_term_goal')}:</span>
                        <span className="info-value">{profile.learningGoals?.shortTerm || t('profile_page.not_specified')}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.long_term_goal')}:</span>
                        <span className="info-value">{profile.learningGoals?.longTerm || t('profile_page.not_specified')}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.target_languages')}:</span>
                        <span className="info-value">
                          {profile.learningGoals?.targetLanguages && profile.learningGoals.targetLanguages.length > 0 
                            ? profile.learningGoals.targetLanguages.join(', ') 
                            : t('profile_page.not_specified')
                          }
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.proficiency_target')}:</span>
                        <span className="info-value">{profile.learningGoals?.proficiencyTarget || t('profile_page.not_specified')}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.country')}:</span>
                        <span className="info-value">{profile.country || t('profile_page.not_specified')}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('profile_page.bio')}:</span>
                        <span className="info-value">{profile.bio || t('profile_page.not_specified')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className={`tab-content achievements-tab ${activeTab === 'achievements' ? 'visible' : ''}`}>
            <div className="content-grid">
              <div className="content-card">
                <h3>{t('profile_page.achievements')}</h3>
                <div className="achievements-filter">
                  <button 
                    className={`filter-btn ${achievementFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setAchievementFilter('all')}
                  >
                    {t('profile_page.filter_all')}
                  </button>
                  <button 
                    className={`filter-btn ${achievementFilter === 'common' ? 'active' : ''}`}
                    onClick={() => setAchievementFilter('common')}
                  >
                    {t('profile_page.filter_common')}
                  </button>
                  <button 
                    className={`filter-btn ${achievementFilter === 'rare' ? 'active' : ''}`}
                    onClick={() => setAchievementFilter('rare')}
                  >
                    {t('profile_page.filter_rare')}
                  </button>
                  <button 
                    className={`filter-btn ${achievementFilter === 'epic' ? 'active' : ''}`}
                    onClick={() => setAchievementFilter('epic')}
                  >
                    {t('profile_page.filter_epic')}
                  </button>
                  <button 
                    className={`filter-btn ${achievementFilter === 'legendary' ? 'active' : ''}`}
                    onClick={() => setAchievementFilter('legendary')}
                  >
                    {t('profile_page.filter_legendary')}
                  </button>
                  <button 
                    className="refresh-btn"
                    onClick={refreshAchievementsData}
                    title={t('profile_page.refresh_achievements')}
                  >
                    🔄
                  </button>
                </div>
                <div className="achievements-grid">
                  {filteredAchievements.map(achievement => (
                    <div key={achievement.id} className={`achievement-card ${achievement.rarity}`}>
                      <div className="achievement-icon" style={{ color: achievement.color }}>
                        {achievement.icon}
                      </div>
                      <div className="achievement-info">
                        <h4 className="achievement-title">{achievement.title}</h4>
                        <p className="achievement-description">{achievement.description}</p>
                        <div className="achievement-meta">
                          <span className="achievement-rarity">{getRarityLabel(achievement.rarity)}</span>
                          <span className="achievement-date">
                            {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className={`tab-content activity-tab ${activeTab === 'activity' ? 'visible' : ''}`}>
            <div className="content-grid">
              <div className="content-card">
                <h3>{t('profile_page.activity')}</h3>
                <div className="activity-filters">
                  <button 
                    className={`filter-btn ${activityPeriod === 'week' ? 'active' : ''}`}
                    onClick={() => {
                      setActivityPeriod('week');
                      refreshActivityData('week');
                    }}
                  >
                    {t('profile_page.this_week')}
                  </button>
                  <button 
                    className={`filter-btn ${activityPeriod === 'month' ? 'active' : ''}`}
                    onClick={() => {
                      setActivityPeriod('month');
                      refreshActivityData('month');
                    }}
                  >
                    {t('profile_page.this_month')}
                  </button>
                  <button 
                    className={`filter-btn ${activityPeriod === 'year' ? 'active' : ''}`}
                    onClick={() => {
                      setActivityPeriod('year');
                      refreshActivityData('year');
                    }}
                  >
                    {t('profile_page.this_year')}
                  </button>
                </div>
                <div className="activity-chart">
                  <div className="chart-container">
                    {activityData.map((data, index) => (
                      <div key={index} className="chart-bar">
                        <div 
                          className="bar-fill" 
                          style={{ height: `${(data.sessions / Math.max(...activityData.map(d => d.sessions))) * 100}%` }}
                        ></div>
                        <span className="bar-label">{new Date(data.date).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="activity-stats">
                  <div className="stat-item">
                    <span className="stat-label">{t('profile_page.total_sessions')}</span>
                    <span className="stat-value">{activityData.reduce((sum, data) => sum + data.sessions, 0)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">{t('profile_page.total_hours')}</span>
                    <span className="stat-value">{activityData.reduce((sum, data) => sum + data.hours, 0)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">{t('profile_page.words_learned')}</span>
                    <span className="stat-value">{activityData.reduce((sum, data) => sum + data.words, 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className={`tab-content settings-tab ${activeTab === 'settings' ? 'visible' : ''}`}>
            <div className="content-grid">
              <div className="content-card">
                <h3>{t('profile_page.settings')}</h3>
                <div className="settings-section">
                  <h4>{t('profile_page.notifications')}</h4>
                  <div className="setting-item">
                    <label className="setting-label">
                      <input
                        type="checkbox"
                        checked={profile.preferences?.notifications || false}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, notifications: e.target.checked }
                        }))}
                      />
                      {t('profile_page.enable_notifications')}
                    </label>
                  </div>
                  <div className="setting-item">
                    <label className="setting-label">
                      <input
                        type="checkbox"
                        checked={profile.preferences?.emailUpdates || false}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, emailUpdates: e.target.checked }
                        }))}
                      />
                      {t('profile_page.email_updates')}
                    </label>
                  </div>
                </div>
                <div className="settings-section">
                  <h4>{t('profile_page.privacy')}</h4>
                  <div className="setting-item">
                    <label className="setting-label">
                      <input
                        type="checkbox"
                        checked={profile.preferences?.publicProfile || false}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, publicProfile: e.target.checked }
                        }))}
                      />
                      {t('profile_page.public_profile')}
                    </label>
                  </div>
                </div>
                <div className="settings-actions">
                  <button 
                    className="save-btn"
                    onClick={saveSettings}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span className="spinner-ring"></span>
                        {t('profile_page.saving')}
                      </>
                    ) : (
                      t('profile_page.save_settings')
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="modal-overlay" onClick={() => setShowPhotoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('profile_page.update_profile_photo')}</h3>
              <button className="close-btn" onClick={() => setShowPhotoModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="photo-upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <div className="upload-preview">
                  {profile.photo && (
                    <img 
                      src={profile.photo} 
                      alt="Current profile photo" 
                      className="current-photo"
                    />
                  )}
                </div>
                <button 
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <span className="upload-spinner"></span>
                      {t('profile_page.loading')}
                    </>
                  ) : (
                    <>
                      📷 {t('profile_page.choose_photo')}
                    </>
                  )}
                </button>
                <p className="upload-hint">{t('profile_page.photo_upload_hint')}</p>
                <div className="upload-requirements">
                  <p>• Supported formats: JPG, PNG, GIF, WebP</p>
                  <p>• Maximum file size: 5MB</p>
                  <p>• Recommended size: 300x300 pixels</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        <style jsx>{`
          .multi-select {
            min-height: 120px;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: white;
            font-size: 14px;
          }
          
          .multi-select option {
            padding: 8px;
            margin: 2px 0;
            border-radius: 2px;
          }
          
          .multi-select option:checked {
            background-color: #667eea;
            color: white;
          }
          
          .form-hint {
            color: #666;
            font-size: 12px;
            margin-top: 4px;
            display: block;
          }
          
          .form-group select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            background-color: white;
          }
          
          .form-group select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
          }

          .achievements-filter, .activity-filters {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
          }

          .filter-btn {
            padding: 8px 16px !important;
            border: 1px solid #ddd !important;
            border-radius: 20px !important;
            background: white !important;
            cursor: pointer !important;
            font-size: 14px !important;
            transition: all 0.3s ease !important;
            color: #333 !important;
            font-weight: 500 !important;
            text-decoration: none !important;
            outline: none !important;
            box-shadow: none !important;
          }

          .filter-btn:hover {
            background: #f5f5f5 !important;
            border-color: #667eea !important;
            color: #667eea !important;
          }

          .filter-btn.active {
            background: #667eea !important;
            color: white !important;
            border-color: #667eea !important;
            font-weight: 600 !important;
          }

          .achievements-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }

          .achievement-card {
            display: flex;
            align-items: center;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: white;
            transition: all 0.3s ease;
          }

          .achievement-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
          }

          .achievement-icon {
            font-size: 2rem;
            margin-right: 15px;
            min-width: 50px;
          }

          .achievement-info {
            flex: 1;
          }

          .achievement-title {
            margin: 0 0 5px 0;
            font-size: 16px;
            font-weight: 600;
          }

          .achievement-description {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 14px;
          }

          .achievement-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
          }

          .achievement-rarity {
            padding: 2px 8px;
            border-radius: 12px;
            background: #f0f0f0;
            color: #666;
          }

          .activity-chart {
            margin: 20px 0;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
          }

          .chart-container {
            display: flex;
            align-items: end;
            gap: 10px;
            height: 200px;
            margin-bottom: 20px;
          }

          .chart-bar {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
          }

          .bar-fill {
            width: 100%;
            background: #667eea;
            border-radius: 4px 4px 0 0;
            min-height: 4px;
            transition: height 0.3s ease;
          }

          .bar-label {
            margin-top: 8px;
            font-size: 12px;
            color: #666;
            text-align: center;
          }

          .activity-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }

          .stat-item {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #ddd;
          }

          .stat-label {
            display: block;
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }

          .stat-value {
            display: block;
            font-size: 24px;
            font-weight: 600;
            color: #667eea;
          }

          .settings-section {
            margin-bottom: 30px;
          }

          .settings-section h4 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 18px;
          }

          .setting-item {
            margin-bottom: 15px;
          }

          .setting-label {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            font-size: 16px;
          }

          .setting-label input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: #667eea;
          }

          .settings-actions {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }

          .refresh-btn {
            padding: 8px 12px !important;
            border: 1px solid #ddd !important;
            border-radius: 20px !important;
            background: white !important;
            cursor: pointer !important;
            font-size: 16px !important;
            transition: all 0.3s ease !important;
            margin-left: 10px !important;
            color: #333 !important;
            text-decoration: none !important;
            outline: none !important;
            box-shadow: none !important;
          }

          .refresh-btn:hover {
            background: #f5f5f5 !important;
            transform: rotate(180deg) !important;
            border-color: #667eea !important;
            color: #667eea !important;
          }

          .tab-content {
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .tab-content.visible {
            display: block;
            opacity: 1;
          }

          .content-grid {
            display: grid;
            gap: 20px;
            margin-top: 20px;
          }

          .content-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            border: 1px solid #ddd;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .content-card h3 {
            margin: 0 0 20px 0;
            color: #333;
            font-size: 20px;
            font-weight: 600;
          }
        `}</style>
    </div>
  );
} 