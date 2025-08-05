import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

import { useEffect } from "react";

const tabs = [
  { name: "Dashboard", href: "/tutor/dashboard" },
  { name: "Calendar", href: "/tutor/schedule" },
  { name: "Library", href: "/tutor/library" },
  { name: "Analytics", href: "/tutor/analytics" },
  { name: "History", href: "/tutor/history" },
  { name: "Wallet", href: "/tutor/earnings" },
];

// Default avatar SVG as a data URL
const DEFAULT_AVATAR = "data:image/svg+xml;base64," + btoa(`
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="18" fill="#e5e7eb"/>
    <circle cx="18" cy="14" r="6" fill="#9ca3af"/>
    <path d="M6 30c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="#9ca3af"/>
  </svg>
`);

export default function TutorNavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  
  const handleNavClick = (href: string) => {
    console.log('Navbar link clicked:', href);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  // Get user's profile photo or use default
  const getProfilePhoto = () => {
    // Check for user image from session
    if (session?.user?.image) {
      return session.user.image;
    }
    
    // Check for custom photo field
    if (session?.user && (session.user as any)?.photo) {
      return (session.user as any).photo;
    }
    
    // Check for uploaded profile photo
    if (session?.user && (session.user as any)?.profilePhoto) {
      return (session.user as any).profilePhoto;
    }
    
    return DEFAULT_AVATAR;
  };

  // Get user's name for fallback
  const getUserName = () => {
    return session?.user?.name || (session?.user as any)?.name || 'User';
  };

  // Get user's initial for fallback
  const getUserInitial = () => {
    const name = getUserName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light cambly-navbar shadow-sm" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      zIndex: 1050,
      backdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
    }}>
      <div className="container-fluid">
        {/* Left side - Logo */}
        <Link href="/" className="navbar-brand cambly-logo fw-bold" onClick={() => handleNavClick('/')}>LearnVastora</Link>
        
        {/* Center - Navigation tabs */}
        <ul className="navbar-nav flex-row gap-2 mx-auto">
          {tabs.map(tab => (
            <li className="nav-item" key={tab.name}>
              <Link
                href={tab.href}
                className={`nav-link cambly-tab${pathname?.startsWith(tab.href) ? " active" : ""}`}
                onClick={() => handleNavClick(tab.href)}
                style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              >
                {tab.name}
              </Link>
            </li>
          ))}
        </ul>
        
        {/* Right side - Status, notifications, avatar, and logout */}
        <ul className="navbar-nav flex-row align-items-center gap-3">
          <li className="nav-item"><i className="bi bi-bell fs-5 text-secondary"></i></li>
          <li className="nav-item">
            <Link href="/tutor/profile" className="avatar-container" style={{ position: 'relative', width: 36, height: 36, display: 'block', textDecoration: 'none' }}>
              <div style={{ position: 'relative', width: 36, height: 36 }}>
                <Image
                  src={getProfilePhoto()}
                  alt={`${getUserName()} Profile`}
                  width={36}
                  height={36}
                  className="rounded-circle"
                  style={{ 
                    objectFit: 'cover', 
                    cursor: 'pointer',
                    border: '2px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onError={(e) => {
                    // Hide the image and show fallback initial
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const container = target.parentElement;
                    if (container) {
                      const fallback = container.querySelector('.profile-fallback') as HTMLElement;
                      if (fallback) {
                        fallback.style.display = 'flex';
                      }
                    }
                  }}
                />
                {/* Fallback initial circle */}
                <div 
                  className="profile-fallback"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    border: '2px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {getUserInitial()}
                </div>
              </div>
            </Link>
          </li>
          <li className="nav-item">
            <button 
              onClick={handleLogout}
              className="btn btn-outline-danger btn-sm"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.transform = 'translateY(-1px)';
                target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.transform = 'translateY(0)';
                target.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
              }}
            >
              <span>🚪</span>
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
} 