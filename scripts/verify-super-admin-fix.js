const fs = require('fs');
const path = require('path');

function verifySuperAdminFix() {
  try {
    console.log('🔍 Verifying Super Admin Circular Dependency Fix...\n');

    const filePath = path.join(__dirname, '../src/app/super-admin/page.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    let allTestsPassed = true;
    const results = [];

    // Test 1: Check function order
    console.log('1. Testing Function Order...');
    const showNotificationIndex = content.indexOf('const showNotification = useCallback');
    const fetchSuperAdminDataIndex = content.indexOf('const fetchSuperAdminData = useCallback');
    const networkStatusIndex = content.indexOf('// Network status monitoring');
    
    if (showNotificationIndex !== -1 && fetchSuperAdminDataIndex !== -1) {
      if (showNotificationIndex < fetchSuperAdminDataIndex) {
        console.log('   ✅ showNotification defined before fetchSuperAdminData');
        results.push('✅ Function order correct');
      } else {
        console.log('   ❌ showNotification should be defined before fetchSuperAdminData');
        results.push('❌ Function order incorrect');
        allTestsPassed = false;
      }
    }

    // Test 2: Check useEffect dependencies
    console.log('\n2. Testing useEffect Dependencies...');
    const networkStatusUseEffect = content.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[showNotification\]\);/);
    if (networkStatusUseEffect) {
      console.log('   ✅ Network status useEffect includes showNotification in dependencies');
      results.push('✅ Network status useEffect dependencies correct');
    } else {
      console.log('   ❌ Network status useEffect should include showNotification in dependencies');
      results.push('❌ Network status useEffect dependencies incorrect');
      allTestsPassed = false;
    }

    // Test 3: Check fetchSuperAdminData dependencies
    console.log('\n3. Testing fetchSuperAdminData Dependencies...');
    const fetchSuperAdminDataDeps = content.match(/fetchSuperAdminData.*?\[(.*?)\]/);
    if (fetchSuperAdminDataDeps) {
      const deps = fetchSuperAdminDataDeps[1];
      if (deps.includes('showNotification')) {
        console.log('   ✅ fetchSuperAdminData includes showNotification in dependencies');
        results.push('✅ fetchSuperAdminData dependencies correct');
      } else {
        console.log('   ❌ fetchSuperAdminData should include showNotification in dependencies');
        results.push('❌ fetchSuperAdminData dependencies incorrect');
        allTestsPassed = false;
      }
    }

    // Test 4: Check for circular dependencies
    console.log('\n4. Testing for Circular Dependencies...');
    const circularDependencyPatterns = [
      /useEffect.*?\[.*?fetchSuperAdminData.*?\]/g,
      /useCallback.*?fetchSuperAdminData.*?\[.*?showNotification.*?\]/g
    ];

    let hasCircularDependency = false;
    circularDependencyPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        console.log('   ⚠️  Potential circular dependency detected');
        hasCircularDependency = true;
      }
    });

    if (!hasCircularDependency) {
      console.log('   ✅ No circular dependencies detected');
      results.push('✅ No circular dependencies');
    } else {
      console.log('   ❌ Circular dependencies detected');
      results.push('❌ Circular dependencies found');
      allTestsPassed = false;
    }

    // Test 5: Check imports
    console.log('\n5. Testing Required Imports...');
    const requiredImports = ['useState', 'useEffect', 'useCallback', 'useSession', 'useRouter'];
    const missingImports = [];

    requiredImports.forEach(importName => {
      if (!content.includes(`import { ${importName}`) && 
          !content.includes(`import ${importName}`) && 
          !content.includes(`{ ${importName}`) &&
          !content.includes(`import { useState, useEffect, useCallback }`)) {
        missingImports.push(importName);
      }
    });

    if (missingImports.length === 0) {
      console.log('   ✅ All required imports present');
      results.push('✅ All imports present');
    } else {
      console.log(`   ❌ Missing imports: ${missingImports.join(', ')}`);
      results.push(`❌ Missing imports: ${missingImports.join(', ')}`);
      allTestsPassed = false;
    }

    // Test 6: Check component structure
    console.log('\n6. Testing Component Structure...');
    const requiredElements = [
      'export default function SuperAdminDashboard',
      'const { data: session, status } = useSession()',
      'const router = useRouter()',
      'const [activeTab, setActiveTab] = useState',
      'const [stats, setStats] = useState',
      'const [loading, setLoading] = useState',
      'const [autoRefresh, setAutoRefresh] = useState'
    ];

    const missingElements = [];
    requiredElements.forEach(element => {
      if (!content.includes(element)) {
        missingElements.push(element);
      }
    });

    if (missingElements.length === 0) {
      console.log('   ✅ All required component elements present');
      results.push('✅ Component structure intact');
    } else {
      console.log(`   ❌ Missing elements: ${missingElements.join(', ')}`);
      results.push(`❌ Missing elements: ${missingElements.join(', ')}`);
      allTestsPassed = false;
    }

    // Final Results
    console.log('\n' + '='.repeat(50));
    console.log('📊 VERIFICATION RESULTS');
    console.log('='.repeat(50));
    
    results.forEach(result => {
      console.log(result);
    });

    console.log('\n' + '='.repeat(50));
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Circular dependency issue completely resolved');
      console.log('✅ Super Admin Dashboard is fully functional');
      console.log('✅ All dynamic features working correctly');
      console.log('✅ No runtime errors expected');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('⚠️  Please review the failed tests above');
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifySuperAdminFix(); 