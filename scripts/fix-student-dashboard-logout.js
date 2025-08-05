const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Student Dashboard Logout Button...\n');

const dashboardPath = path.join(__dirname, '../src/app/dashboard/page.tsx');

try {
  let content = fs.readFileSync(dashboardPath, 'utf8');
  
  // Add signOut import if not present
  if (!content.includes("import { signOut }")) {
    if (content.includes("import { useSession }")) {
      content = content.replace(
        "import { useSession }",
        "import { useSession, signOut }"
      );
    } else {
      // Add new import line after existing imports
      const importMatch = content.match(/import.*from "next-auth\/react";/);
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          importMatch[0] + "\nimport { signOut } from 'next-auth/react';"
        );
      }
    }
    console.log('✅ Added signOut import');
  }
  
  // Find the dashboard header and add logout button
  const headerPattern = /(<div className="dashboard-header">[\s\S]*?)(<\/div>\s*<\/div>)/;
  
  if (content.match(headerPattern)) {
    const logoutButton = `
            <button 
              className="btn btn-danger logout-btn"
              onClick={() => signOut({ callbackUrl: '/' })}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
              }}
            >
              <span>🚪</span>
              Logout
            </button>`;
    
    content = content.replace(headerPattern, `$1${logoutButton}$2`);
    console.log('✅ Added logout button to dashboard header');
  } else {
    // If no header found, add to the main content area
    const mainPattern = /(<main[\s\S]*?)(<div className=")/;
    if (content.match(mainPattern)) {
      const logoutButton = `
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button 
            className="btn btn-danger logout-btn"
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
            }}
          >
            <span>🚪</span>
            Logout
          </button>
        </div>`;
      
      content = content.replace(mainPattern, `$1${logoutButton}$2`);
      console.log('✅ Added logout button to main content');
    }
  }
  
  // Write the updated content
  fs.writeFileSync(dashboardPath, content, 'utf8');
  
  console.log('\n✅ Student Dashboard Logout Button Fixed!');
  console.log('📱 Test the logout functionality:');
  console.log('   1. Go to: http://localhost:3000/dashboard');
  console.log('   2. Look for the red "Logout" button');
  console.log('   3. Click to sign out');
  console.log('   4. Should redirect to home page');
  
} catch (error) {
  console.error('❌ Error fixing student dashboard:', error.message);
} 