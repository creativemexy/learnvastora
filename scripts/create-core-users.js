const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function upsertUser({ name, email, role, password }) {
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, active: true, password: hashed },
    create: { name, email, role, active: true, password: hashed },
    select: { id: true, name: true, email: true, role: true, active: true }
  });
  return user;
}

async function main() {
  try {
    const users = [
      { name: 'Super Admin', email: 'super@learnvastora.com', role: 'SUPER_ADMIN', password: 'Super123!' },
      { name: 'Admin', email: 'admin@learnvastora.com', role: 'ADMIN', password: 'Admin123!' },
      { name: 'Student', email: 'student@learnvastora.com', role: 'STUDENT', password: 'Student123!' },
      { name: 'Test Tutor', email: 'tutor@learnvastora.com', role: 'TUTOR', password: 'Tutor123!' },
    ];

    console.log('🔧 Creating core users (upsert)...');
    const results = [];
    for (const u of users) {
      const res = await upsertUser(u);
      results.push(res);
      console.log(`✅ ${res.role} -> ${res.email}`);
    }

    console.log('\n📋 Credentials (default):');
    console.log(' - SUPER_ADMIN: super@learnvastora.com / Super123!');
    console.log(' - ADMIN:       admin@learnvastora.com / Admin123!');
    console.log(' - STUDENT:     student@learnvastora.com / Student123!');
    console.log(' - TUTOR:       tutor@learnvastora.com / Tutor123!');
  } catch (err) {
    console.error('❌ Failed to create users:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
