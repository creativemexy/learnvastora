const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Duplicate Import Error...\n');

const dashboardPath = path.join(__dirname, '../src/app/dashboard/page.tsx');

try {
  let content = fs.readFileSync(dashboardPath, 'utf8');
  
  // Remove duplicate signOut import
  const lines = content.split('\n');
  let signOutCount = 0;
  let newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('import') && line.includes('signOut')) {
      signOutCount++;
      if (signOutCount === 1) {
        // Keep the first one
        newLines.push(line);
      } else {
        // Skip duplicate
        console.log(`   ⚠️  Removed duplicate import: ${line.trim()}`);
      }
    } else {
      newLines.push(line);
    }
  }
  
  content = newLines.join('\n');
  
  // Write the fixed content
  fs.writeFileSync(dashboardPath, content, 'utf8');
  
  console.log('✅ Duplicate import fixed!');
  console.log('📱 The dashboard should now load properly');
  
} catch (error) {
  console.error('❌ Error fixing duplicate import:', error.message);
} 