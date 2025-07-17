'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from "next/image";

interface Tutor {
  id: number;
  name: string;
  title: string;
  accent: string;
  rating: number;
  proficiency: string;
  isOnline: boolean;
  profileImage: string;
  reviews: number;
  languages: string[];
  industries: string[];
  interests: string[];
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  isPro: boolean;
  isFavorite: boolean;
}

const initialTutors: Tutor[] = [
  {
    id: 1,
    name: "Andy Talker",
    title: "SUPER TUTOR",
    accent: "USA",
    rating: 99,
    proficiency: "Intermediate proficiency",
    isOnline: true,
    profileImage: "/api/placeholder/300/200",
    reviews: 1250,
    languages: ["Spanish", "French"],
    industries: ["Business", "Technology"],
    interests: ["Travel", "Sports"],
    level: 'intermediate',
    isPro: true,
    isFavorite: false
  },
  {
    id: 2,
    name: "Tutor Rhosael",
    title: "SUPER TUTOR",
    accent: "Canadian",
    rating: 99,
    proficiency: "all proficiency levels",
    isOnline: true,
    profileImage: "/api/placeholder/300/200",
    reviews: 980,
    languages: ["French", "German"],
    industries: ["Education", "Healthcare"],
    interests: ["Reading", "Music"],
    level: 'all',
    isPro: true,
    isFavorite: false
  },
  {
    id: 3,
    name: "Valda",
    title: "SUPER TUTOR",
    accent: "USA",
    rating: 99,
    proficiency: "all proficiency levels",
    isOnline: true,
    profileImage: "/api/placeholder/300/200",
    reviews: 1100,
    languages: ["Portuguese", "Italian"],
    industries: ["Marketing", "Finance"],
    interests: ["Cooking", "Art"],
    level: 'all',
    isPro: true,
    isFavorite: false
  },
  {
    id: 4,
    name: "Edwin hwv101cr",
    title: "",
    accent: "USA",
    rating: 97,
    proficiency: "Intermediate proficiency",
    isOnline: true,
    profileImage: "/api/placeholder/300/200",
    reviews: 750,
    languages: ["Japanese", "Korean"],
    industries: ["Technology", "Gaming"],
    interests: ["Gaming", "Anime"],
    level: 'intermediate',
    isPro: false,
    isFavorite: false
  },
  {
    id: 5,
    name: "Asha",
    title: "",
    accent: "British",
    rating: 99,
    proficiency: "all proficiency levels",
    isOnline: false,
    profileImage: "/api/placeholder/300/200",
    reviews: 890,
    languages: ["Hindi", "Urdu"],
    industries: ["Education", "Literature"],
    interests: ["Literature", "History"],
    level: 'all',
    isPro: false,
    isFavorite: false
  },
  {
    id: 6,
    name: "Jasmine Jones",
    title: "",
    accent: "USA",
    rating: 97,
    proficiency: "all proficiency levels",
    isOnline: false,
    profileImage: "/api/placeholder/300/200",
    reviews: 650,
    languages: ["Spanish", "Portuguese"],
    industries: ["Healthcare", "Psychology"],
    interests: ["Psychology", "Wellness"],
    level: 'all',
    isPro: false,
    isFavorite: false
  },
  {
    id: 7,
    name: "Sam",
    title: "",
    accent: "North American",
    rating: 95,
    proficiency: "all proficiency levels",
    isOnline: false,
    profileImage: "/api/placeholder/300/200",
    reviews: 420,
    languages: ["French", "Spanish"],
    industries: ["Business", "Sales"],
    interests: ["Business", "Entrepreneurship"],
    level: 'all',
    isPro: true,
    isFavorite: false
  },
  {
    id: 8,
    name: "Mark Stainton",
    title: "",
    accent: "British",
    rating: 97,
    proficiency: "all proficiency levels",
    isOnline: false,
    profileImage: "/api/placeholder/300/200",
    reviews: 820,
    languages: ["German", "Dutch"],
    industries: ["Engineering", "Manufacturing"],
    interests: ["Engineering", "Innovation"],
    level: 'all',
    isPro: false,
    isFavorite: false
  }
];

export default function Tutors() {
  const [tutors, setTutors] = useState<Tutor[]>(initialTutors);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    availability: 'all',
    showPro: false,
    showSuperTutors: false,
    accent: 'all',
    language: 'all',
    level: 'all',
    industry: 'all',
    interest: 'all'
  });
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'reviews'>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Simulate real-time online status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTutors(prev => prev.map(tutor => ({
        ...tutor,
        isOnline: Math.random() > 0.3 // 70% chance of being online
      })));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Get unique filter options
  const filterOptions = useMemo(() => {
    const accents = [...new Set(tutors.map(t => t.accent))];
    const languages = [...new Set(tutors.flatMap(t => t.languages))];
    const industries = [...new Set(tutors.flatMap(t => t.industries))];
    const interests = [...new Set(tutors.flatMap(t => t.interests))];
    
    return { accents, languages, industries, interests };
  }, [tutors]);

  // Filter and sort tutors
  const filteredTutors = useMemo(() => {
    let filtered = tutors.filter(tutor => {
      const matchesSearch = tutor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tutor.proficiency.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAvailability = filters.availability === 'all' || 
                                 (filters.availability === 'online' && tutor.isOnline) ||
                                 (filters.availability === 'offline' && !tutor.isOnline);
      
      const matchesPro = !filters.showPro || tutor.isPro;
      const matchesSuperTutor = !filters.showSuperTutors || tutor.title === 'SUPER TUTOR';
      const matchesAccent = filters.accent === 'all' || tutor.accent === filters.accent;
      const matchesLanguage = filters.language === 'all' || tutor.languages.includes(filters.language);
      const matchesLevel = filters.level === 'all' || tutor.level === filters.level;
      const matchesIndustry = filters.industry === 'all' || tutor.industries.includes(filters.industry);
      const matchesInterest = filters.interest === 'all' || tutor.interests.includes(filters.interest);

      return matchesSearch && matchesAvailability && matchesPro && matchesSuperTutor && 
             matchesAccent && matchesLanguage && matchesLevel && matchesIndustry && matchesInterest;
    });

    // Sort tutors
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating - a.rating;
        case 'reviews':
          return b.reviews - a.reviews;
        default:
          return 0;
      }
    });

    return filtered;
  }, [tutors, searchTerm, filters, sortBy]);

  const toggleFavorite = (tutorId: number) => {
    setTutors(prev => prev.map(tutor => 
      tutor.id === tutorId ? { ...tutor, isFavorite: !tutor.isFavorite } : tutor
    ));
  };

  const handleCall = (tutorId: number) => {
    const tutor = tutors.find(t => t.id === tutorId);
    if (tutor) {
      alert(`Calling ${tutor.name}...`);
      // Here you would implement actual calling functionality
    }
  };

  const resetFilters = () => {
    setFilters({
      availability: 'all',
      showPro: false,
      showSuperTutors: false,
      accent: 'all',
      language: 'all',
      level: 'all',
      industry: 'all',
      interest: 'all'
    });
    setSearchTerm('');
  };

  const onlineCount = tutors.filter(t => t.isOnline).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Cambly</span>
              </div>
            </div>
            <nav className="flex space-x-8">
              <a href="/" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">Home</a>
              <a href="/tutors" className="text-gray-900 border-b-2 border-gray-900 px-3 py-2 text-sm font-medium">Tutors</a>
              <a href="#" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">Learn</a>
              <a href="#" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">Progress</a>
            </nav>
            <div className="flex items-center space-x-4">
              <button className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800">
                Subscribe
              </button>
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Search and Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tutors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'rating' | 'reviews')}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="rating">Rating</option>
                <option value="name">Name</option>
                <option value="reviews">Reviews</option>
              </select>
            </div>
            
            <div className="flex border border-gray-300 rounded">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm font-medium text-gray-700">{onlineCount} Online Now</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select 
              value={filters.availability}
              onChange={(e) => setFilters(prev => ({ ...prev, availability: e.target.value }))}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Availability</option>
              <option value="online">Online Now</option>
              <option value="offline">Offline</option>
            </select>
            
            <button
              onClick={() => setFilters(prev => ({ ...prev, showPro: !prev.showPro }))}
              className={`border rounded px-3 py-2 text-sm ${filters.showPro ? 'bg-blue-100 border-blue-300' : 'border-gray-300'}`}
            >
              Pro Only
            </button>
            
            <button
              onClick={() => setFilters(prev => ({ ...prev, showSuperTutors: !prev.showSuperTutors }))}
              className={`border rounded px-3 py-2 text-sm ${filters.showSuperTutors ? 'bg-blue-100 border-blue-300' : 'border-gray-300'}`}
            >
              Super Tutors
            </button>
            
            <select 
              value={filters.accent}
              onChange={(e) => setFilters(prev => ({ ...prev, accent: e.target.value }))}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Accents</option>
              {filterOptions.accents.map(accent => (
                <option key={accent} value={accent}>{accent}</option>
              ))}
            </select>
            
            <select 
              value={filters.language}
              onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">Also speaks</option>
              {filterOptions.languages.map(language => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
            
            <select 
              value={filters.level}
              onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            
            <select 
              value={filters.industry}
              onChange={(e) => setFilters(prev => ({ ...prev, industry: e.target.value }))}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Industries</option>
              {filterOptions.industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
            
            <select 
              value={filters.interest}
              onChange={(e) => setFilters(prev => ({ ...prev, interest: e.target.value }))}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Interests</option>
              {filterOptions.interests.map(interest => (
                <option key={interest} value={interest}>{interest}</option>
              ))}
            </select>
            
            <button
              onClick={resetFilters}
              className="text-sm text-orange-600 hover:text-orange-800 px-2"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-sm text-gray-600">
          Showing {filteredTutors.length} of {tutors.length} tutors
        </p>
      </div>

      {/* Tutors Grid/List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredTutors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No tutors found matching your criteria.</p>
            <button
              onClick={resetFilters}
              className="mt-4 text-orange-600 hover:text-orange-800 font-medium"
            >
              Clear filters and try again
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" 
            : "space-y-4"
          }>
            {filteredTutors.map((tutor) => (
              <div 
                key={tutor.id} 
                className={`bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow ${
                  viewMode === 'list' ? 'flex p-4' : ''
                }`}
              >
                {/* Video/Image Container */}
                <div className={`relative bg-gray-900 ${viewMode === 'list' ? 'w-32 h-24 flex-shrink-0' : 'h-48'}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button 
                      onClick={() => handleCall(tutor.id)}
                      className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all"
                    >
                      <div className="w-0 h-0 border-l-[8px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
                    </button>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  {tutor.isOnline && (
                    <div className="absolute top-2 right-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full block"></span>
                    </div>
                  )}
                </div>

                {/* Tutor Info */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{tutor.name}</h3>
                    <button 
                      onClick={() => toggleFavorite(tutor.id)}
                      className={`transition-colors ${tutor.isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <svg className="w-5 h-5" fill={tutor.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>

                  {tutor.title && (
                    <div className="mb-2">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                        {tutor.title}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <span className="w-4 h-4 mr-2">🗺️</span>
                      <span>{tutor.accent} Accent</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-4 h-4 mr-2">👍</span>
                      <span>{tutor.rating}% positive reviews ({tutor.reviews} reviews)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-4 h-4 mr-2">📊</span>
                      <span>Good with: {tutor.proficiency}</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${tutor.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span>{tutor.isOnline ? 'Online Now' : 'Offline'}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleCall(tutor.id)}
                      disabled={!tutor.isOnline}
                      className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        tutor.isOnline 
                          ? 'bg-orange-500 text-white hover:bg-orange-600' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {tutor.isOnline ? 'Call now' : 'Offline'}
                    </button>
                    <button 
                      onClick={() => toggleFavorite(tutor.id)}
                      className="text-gray-400 hover:text-gray-600 p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}