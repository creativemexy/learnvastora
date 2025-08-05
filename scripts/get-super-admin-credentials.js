const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function getSuperAdminCredentials() {
  console.log('🔍 Getting Super Admin Credentials...\n');
  
  try {
    // Find super admin user
    const superAdmin = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN'
      },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true
      }
    });
    
    if (!superAdmin) {
      console.log('❌ No Super Admin found! Creating one...\n');
      
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const newAdmin = await prisma.user.create({
        data: {
          name: 'Super Administrator',
          email: 'super@learnvastora.com',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          active: true
        }
      });
      
      console.log('✅ Created new Super Admin:');
      console.log(`   Name: ${newAdmin.name}`);
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Password: admin123`);
      
    } else {
      console.log('✅ Found existing Super Admin:');
      console.log(`   Name: ${superAdmin.name}`);
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Status: ${superAdmin.active ? 'Active' : 'Inactive'}`);
      console.log(`   Created: ${superAdmin.createdAt.toLocaleDateString()}`);
      
      // Check if we can reset the password
      console.log('\n🔧 To reset password, run: node scripts/reset-super-admin-password.js');
    }
    
    console.log('\n📋 Login Instructions:');
    console.log('   1. Go to: http://localhost:3000/auth/signin');
    console.log('   2. Email: super@learnvastora.com');
    console.log('   3. Password: admin123 (or check above for actual password)');
    console.log('   4. After login, go to: http://localhost:3000/super-admin');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getSuperAdminCredentials(); 