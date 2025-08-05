const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkAndCreateAdminUsers() {
  console.log('🔍 Checking Admin Users...\n');
  
  try {
    // Check existing admin users
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true
      }
    });
    
    console.log(`📊 Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.name}) - ${user.active ? 'Active' : 'Inactive'}`);
    });
    
    // Check if we have an active admin
    const activeAdmin = adminUsers.find(user => user.active);
    
    if (!activeAdmin) {
      console.log('\n⚠️  No active admin user found. Creating one...');
      
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@learnvastora.com',
          name: 'System Admin',
          password: hashedPassword,
          role: 'ADMIN',
          active: true
        }
      });
      
      console.log('✅ Created admin user:');
      console.log(`   - Email: ${newAdmin.email}`);
      console.log(`   - Password: admin123`);
      console.log(`   - Role: ${newAdmin.role}`);
      console.log(`   - Status: ${newAdmin.active ? 'Active' : 'Inactive'}`);
    } else {
      console.log('\n✅ Active admin user found:', activeAdmin.email);
    }
    
    // Also check super admin
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN', active: true }
    });
    
    console.log('\n🔍 Super Admin Status:');
    if (superAdmin) {
      console.log(`✅ Active Super Admin: ${superAdmin.email}`);
    } else {
      console.log('❌ No active Super Admin found');
    }
    
    console.log('\n==================================================');
    console.log('🎯 LOGIN CREDENTIALS SUMMARY');
    console.log('==================================================');
    console.log('Super Admin: super@learnvastora.com / admin123');
    console.log('Admin: admin@learnvastora.com / admin123');
    console.log('Tutor: tutor@learnvastora.com / password123');
    console.log('Student: student@learnvastora.com / password123');
    console.log('');
    console.log('📱 Expected Redirects:');
    console.log('✅ Super Admin → /super-admin');
    console.log('✅ Admin → /admin');
    console.log('✅ Tutor → /tutor/dashboard');
    console.log('✅ Student → /bookings');
    console.log('==================================================');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateAdminUsers(); 