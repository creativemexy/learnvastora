const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetSuperAdminPassword() {
  console.log('🔧 Resetting Super Admin Password...\n');
  
  try {
    // Find super admin user
    const superAdmin = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN'
      }
    });
    
    if (!superAdmin) {
      console.log('❌ No Super Admin found!');
      return;
    }
    
    // Reset password to admin123
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await prisma.user.update({
      where: {
        id: superAdmin.id
      },
      data: {
        password: hashedPassword
      }
    });
    
    console.log('✅ Super Admin password reset successfully!');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   New Password: ${newPassword}`);
    
    console.log('\n📋 Login Instructions:');
    console.log('   1. Go to: http://localhost:3000/auth/signin');
    console.log('   2. Email: super@learnvastora.com');
    console.log('   3. Password: admin123');
    console.log('   4. After login, go to: http://localhost:3000/super-admin');
    console.log('   5. You should now see all 21 users in the User Management section');
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetSuperAdminPassword(); 