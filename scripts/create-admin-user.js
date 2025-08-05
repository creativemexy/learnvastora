const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: {
        email: 'admin@learnvastora.com'
      }
    });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Name:', existingAdmin.name);
      console.log('Role:', existingAdmin.role);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@learnvastora.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        isOnline: false,
        active: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', adminUser.email);
    console.log('Name:', adminUser.name);
    console.log('Role:', adminUser.role);
    console.log('Password: admin123');
    console.log('\nYou can now login with:');
    console.log('Email: admin@learnvastora.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser(); 