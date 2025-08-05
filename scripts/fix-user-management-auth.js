const fs = require('fs');
const path = require('path');

console.log('🔐 Fixing User Management Authentication...\n');

const apiPath = path.join(__dirname, '../src/app/api/super-admin/users/route.ts');

try {
  let content = fs.readFileSync(apiPath, 'utf8');
  
  console.log('1. Checking current API implementation...');
  
  // Check for authentication implementation
  const hasAuth = content.includes('getServerSession') || content.includes('authOptions');
  const hasRoleCheck = content.includes('SUPER_ADMIN');
  const hasPrisma = content.includes('prisma.user.findMany');
  
  console.log(`   Authentication check: ${hasAuth ? '✅' : '❌'}`);
  console.log(`   Role check: ${hasRoleCheck ? '✅' : '❌'}`);
  console.log(`   Database query: ${hasPrisma ? '✅' : '❌'}`);
  
  // Fix authentication if needed
  if (!hasAuth) {
    console.log('\n2. Adding authentication...');
    
    // Add proper imports
    if (!content.includes("import { getServerSession }")) {
      const importMatch = content.match(/import.*from.*;/);
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          importMatch[0] + "\nimport { getServerSession } from 'next-auth';"
        );
      }
    }
    
    // Add authOptions import
    if (!content.includes("import { authOptions }")) {
      const importMatch = content.match(/import.*from.*;/);
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          importMatch[0] + "\nimport { authOptions } from '@/lib/auth';"
        );
      }
    }
    
    // Add authentication check to GET method
    const getMethodPattern = /export async function GET\(req: Request\) \{[\s\S]*?\}/;
    if (content.match(getMethodPattern)) {
      const newGetMethod = `export async function GET(req: Request) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      data: users,
      count: users.length
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}`;
      
      content = content.replace(getMethodPattern, newGetMethod);
      console.log('   ✅ Added proper authentication');
    }
  }
  
  // Write the updated content
  fs.writeFileSync(apiPath, content, 'utf8');
  
  console.log('\n3. Testing database connection...');
  
  // Test database connection
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    const userCount = await prisma.user.count();
    console.log(`   ✅ Database connected - ${userCount} users found`);
    
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });
    
    if (superAdmin) {
      console.log(`   ✅ Super Admin exists: ${superAdmin.email}`);
    } else {
      console.log('   ❌ No Super Admin found');
    }
    
  } catch (error) {
    console.error('   ❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log('\n✅ User Management API Fixed!');
  console.log('📱 Test Instructions:');
  console.log('   1. Make sure you are logged in as Super Admin');
  console.log('   2. Go to: http://localhost:3000/super-admin');
  console.log('   3. Click on "Users" tab');
  console.log('   4. You should now see all users');
  console.log('');
  console.log('🔧 If still not working:');
  console.log('   1. Clear browser cache and cookies');
  console.log('   2. Log out and log back in');
  console.log('   3. Check browser console for errors (F12)');
  
} catch (error) {
  console.error('❌ Error fixing API:', error.message);
} 