const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('Creating super admin user...');
    
    // Check if super admin already exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (existingSuperAdmin) {
      console.log('Super admin already exists:', existingSuperAdmin.email);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('superadmin123', 12);

    // Create super admin user
    const superAdmin = await prisma.user.create({
      data: {
        name: 'Super Administrator',
        email: 'superadmin@learnvastora.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        active: true,
        isOnline: false,
        lastSeen: new Date(),
        createdAt: new Date(),
        language: 'English',
        country: 'United States',
        bio: 'Platform Super Administrator',
        languageLevel: 'Native',
        courseInterests: ['Administration', 'Management'],
        tutorPreferences: {},
        learningGoals: {},
        preferences: {}
      }
    });

    console.log('✅ Super admin created successfully!');
    console.log('Email:', superAdmin.email);
    console.log('Password: superadmin123');
    console.log('Role:', superAdmin.role);
    console.log('\nYou can now login with these credentials to test the super admin dashboard.');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin(); 