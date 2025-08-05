const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/super-admin/components/UserManagement.tsx');

console.log('🔧 Fixing User Management Filter Errors...');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add computed statistics if not present
  if (!content.includes('// Computed statistics with null safety')) {
    const statsCode = `
  // Computed statistics with null safety
  const stats = React.useMemo(() => {
    const usersArray = Array.isArray(users) ? users : [];
    
    return {
      total: usersArray.length,
      tutors: usersArray.filter(u => u?.role === 'TUTOR').length,
      students: usersArray.filter(u => u?.role === 'STUDENT').length,
      admins: usersArray.filter(u => u?.role === 'ADMIN').length,
      active: usersArray.filter(u => u?.active === true).length,
      inactive: usersArray.filter(u => u?.active === false).length
    };
  }, [users]);`;

    // Insert after state declarations
    const stateEndIndex = content.indexOf('const [showDeleteModal, setShowDeleteModal] = useState(false);');
    if (stateEndIndex !== -1) {
      const insertIndex = content.indexOf(';', stateEndIndex) + 1;
      content = content.slice(0, insertIndex) + statsCode + content.slice(insertIndex);
      console.log('✅ Added computed statistics');
    }
  }

  // Fix inline filter errors
  const filterFixes = [
    {
      pattern: /users\.filter\(u => u\.role === 'TUTOR'\)\.length/g,
      replacement: 'stats.tutors'
    },
    {
      pattern: /users\.filter\(u => u\.role === 'STUDENT'\)\.length/g,
      replacement: 'stats.students'
    },
    {
      pattern: /users\.filter\(u => u\.role === 'ADMIN'\)\.length/g,
      replacement: 'stats.admins'
    },
    {
      pattern: /users\.filter\(u => u\.active === true\)\.length/g,
      replacement: 'stats.active'
    },
    {
      pattern: /users\.filter\(u => u\.active === false\)\.length/g,
      replacement: 'stats.inactive'
    }
  ];

  let fixesApplied = 0;
  filterFixes.forEach(fix => {
    if (content.match(fix.pattern)) {
      content = content.replace(fix.pattern, fix.replacement);
      fixesApplied++;
      console.log(`✅ Fixed filter: ${fix.pattern.source}`);
    }
  });

  // Write the updated content
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log(`\n🎉 Filter Fix Complete!`);
  console.log(`📊 Fixes Applied: ${fixesApplied}`);
  console.log(`✅ File Updated: ${filePath}`);
  
} catch (error) {
  console.error('❌ Error fixing filters:', error.message);
  process.exit(1);
} 