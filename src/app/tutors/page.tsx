import Image from "next/image";

interface Tutor {
  id: number;
  name: string;
  title: string;
  accent: string;
  rating: string;
  proficiency: string;
  isOnline: boolean;
  profileImage: string;
  reviews: string;
}

const tutors: Tutor[] = [
  {
    id: 1,
    name: "Andy Talker",
    title: "SUPER TUTOR",
    accent: "USA Accent",
    rating: "99% positive reviews",
    proficiency: "Good with: Intermediate proficiency",
    isOnline: true,
    profileImage: "/api/placeholder/300/200",
    reviews: "99%"
  },
  {
    id: 2,
    name: "Tutor Rhosael",
    title: "SUPER TUTOR",
    accent: "Canadian Accent",
    rating: "99% positive reviews",
    proficiency: "Good with: all proficiency levels",
    isOnline: true,
    profileImage: "/api/placeholder/300/200",
    reviews: "99%"
  },
  {
    id: 3,
    name: "Valda",
    title: "SUPER TUTOR",
    accent: "USA Accent",
    rating: "99% positive reviews",
    proficiency: "Good with: all proficiency levels",
    isOnline: true,
    profileImage: "/api/placeholder/300/200",
    reviews: "99%"
  },
  {
    id: 4,
    name: "Edwin hwv101cr",
    title: "",
    accent: "USA Accent",
    rating: "97% positive reviews",
    proficiency: "Good with: Intermediate proficiency",
    isOnline: true,
    profileImage: "/api/placeholder/300/200",
    reviews: "97%"
  },
  {
    id: 5,
    name: "Asha",
    title: "",
    accent: "Standard British Accent",
    rating: "99% positive reviews",
    proficiency: "Good with: all proficiency levels",
    isOnline: false,
    profileImage: "/api/placeholder/300/200",
    reviews: "99%"
  },
  {
    id: 6,
    name: "Jasmine Jones",
    title: "",
    accent: "USA Accent",
    rating: "97% positive reviews",
    proficiency: "Good with: all proficiency levels",
    isOnline: false,
    profileImage: "/api/placeholder/300/200",
    reviews: "97%"
  },
  {
    id: 7,
    name: "Sam",
    title: "",
    accent: "North American Accent",
    rating: "95% positive reviews",
    proficiency: "Good with: all proficiency levels",
    isOnline: false,
    profileImage: "/api/placeholder/300/200",
    reviews: "95%"
  },
  {
    id: 8,
    name: "Mark Stainton",
    title: "",
    accent: "Standard British Accent",
    rating: "97% positive reviews",
    proficiency: "Good with: all proficiency levels",
    isOnline: false,
    profileImage: "/api/placeholder/300/200",
    reviews: "97%"
  }
];

export default function Tutors() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
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
              <a href="#" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">Home</a>
              <a href="#" className="text-gray-900 border-b-2 border-gray-900 px-3 py-2 text-sm font-medium">Tutors</a>
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

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm font-medium text-gray-700">Online Now</span>
          </div>
          <div className="flex space-x-2">
            <select className="border border-gray-300 rounded px-3 py-2 text-sm">
              <option>Availability</option>
            </select>
            <button className="border border-gray-300 rounded px-3 py-2 text-sm">Pro</button>
            <button className="border border-gray-300 rounded px-3 py-2 text-sm">Supertutors</button>
            <select className="border border-gray-300 rounded px-3 py-2 text-sm">
              <option>Accent</option>
            </select>
            <select className="border border-gray-300 rounded px-3 py-2 text-sm">
              <option>Also speaks</option>
            </select>
            <select className="border border-gray-300 rounded px-3 py-2 text-sm">
              <option>Preferred levels</option>
            </select>
            <select className="border border-gray-300 rounded px-3 py-2 text-sm">
              <option>Industry</option>
            </select>
            <select className="border border-gray-300 rounded px-3 py-2 text-sm">
              <option>Interests</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tutors Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tutors.map((tutor) => (
            <div key={tutor.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              {/* Video/Image Container */}
              <div className="relative h-48 bg-gray-900">
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all">
                    <div className="w-0 h-0 border-l-[8px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
                  </button>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>

              {/* Tutor Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{tutor.name}</h3>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <span>{tutor.accent}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 mr-2">👍</span>
                    <span>{tutor.rating}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 mr-2">📊</span>
                    <span>{tutor.proficiency}</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${tutor.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <span>{tutor.isOnline ? 'Online Now' : 'Offline'}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50">
                    Call now
                  </button>
                  <button className="text-gray-400 hover:text-gray-600 p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}