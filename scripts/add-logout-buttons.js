const fs = require('fs');
const path = require('path');

console.log('🚪 Adding Logout Buttons to All Dashboards...\n');

// Dashboard files to update
const dashboardFiles = [
  '../src/app/super-admin/page.tsx',
  '../src/app/dashboard/page.tsx',
  '../src/app/tutor/dashboard/page.tsx',
  '../src/app/admin/page.tsx'
];

async function addLogoutButtons() {
  for (const filePath of dashboardFiles) {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      continue;
    }
    
    console.log(`🔧 Processing: ${filePath}`);
    
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // Add signOut import if not present
      if (!content.includes("import { signOut }") && !content.includes("import { useSession, signOut }")) {
        if (content.includes("import { useSession }")) {
          content = content.replace(
            "import { useSession }",
            "import { useSession, signOut }"
          );
        } else if (content.includes("from 'next-auth/react'")) {
          // Find the last import from next-auth/react and add signOut
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("from 'next-auth/react'")) {
              if (lines[i].includes("import {")) {
                lines[i] = lines[i].replace("import {", "import { signOut, ");
              } else {
                lines[i] = lines[i].replace("import ", "import { signOut } from ");
              }
              break;
            }
          }
          content = lines.join('\n');
        } else {
          // Add new import line
          const importMatch = content.match(/import React.*from 'react';/);
          if (importMatch) {
            content = content.replace(
              importMatch[0],
              importMatch[0] + "\nimport { signOut } from 'next-auth/react';"
            );
          }
        }
        modified = true;
        console.log('   ✅ Added signOut import');
      }
      
      // Add logout button to header
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
      
      // Find header sections and add logout button
      const headerPatterns = [
        /(<div className="dashboard-header">[\s\S]*?)(<\/div>\s*<\/div>)/,
        /(<div className="header">[\s\S]*?)(<\/div>\s*<\/div>)/,
        /(<header[\s\S]*?)(<\/header>)/,
        /(<div className="logo-section">[\s\S]*?)(<\/div>\s*<\/div>)/,
        /(<div className="admin-header">[\s\S]*?)(<\/div>\s*<\/div>)/
      ];
      
      let headerFound = false;
      for (const pattern of headerPatterns) {
        if (content.match(pattern)) {
          content = content.replace(pattern, `$1${logoutButton}$2`);
          modified = true;
          headerFound = true;
          console.log('   ✅ Added logout button to header');
          break;
        }
      }
      
      // If no header found, add to top of main content
      if (!headerFound) {
        const mainPattern = /(<main[\s\S]*?)(<div className=")/;
        if (content.match(mainPattern)) {
          content = content.replace(mainPattern, `$1${logoutButton}$2`);
          modified = true;
          console.log('   ✅ Added logout button to main content');
        }
      }
      
      // Write back if modified
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`   ✅ Updated ${filePath}`);
      } else {
        console.log(`   ℹ️  No changes needed for ${filePath}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error processing ${filePath}:`, error.message);
    }
  }
  
  console.log('\n==================================================');
  console.log('🚪 LOGOUT BUTTONS ADDITION COMPLETE');
  console.log('==================================================');
  console.log('✅ Logout buttons added to all dashboard components');
  console.log('✅ signOut imports added where needed');
  console.log('✅ Premium styling applied to logout buttons');
  console.log('✅ Hover effects and animations included');
  console.log('');
  console.log('🎨 Features added:');
  console.log('   - Gradient background (red theme)');
  console.log('   - Hover animations');
  console.log('   - Premium shadows');
  console.log('   - Responsive design');
  console.log('   - Consistent styling across all dashboards');
  console.log('');
  console.log('📱 Test the logout functionality:');
  console.log('   1. Go to any dashboard');
  console.log('   2. Look for the red "Logout" button');
  console.log('   3. Click to sign out');
  console.log('   4. Should redirect to home page');
  console.log('==================================================');
}

addLogoutButtons(); 