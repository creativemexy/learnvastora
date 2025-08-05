const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('Resetting admin password...');

    // Find admin user
    const adminUser = await prisma.user.findUnique({
      where: {
        email: 'admin@learnvastora.com'
      }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found!');
      console.log('Please run create-admin-user.js first');
      return;
    }

    // Hash new password
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update admin password
    await prisma.user.update({
      where: {
        email: 'admin@learnvastora.com'
      },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    console.log('✅ Admin password reset successfully!');
    console.log('Email:', adminUser.email);
    console.log('Name:', adminUser.name);
    console.log('Role:', adminUser.role);
    console.log('New Password:', newPassword);
    console.log('\nYou can now login with:');
    console.log('Email: admin@learnvastora.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword(); 