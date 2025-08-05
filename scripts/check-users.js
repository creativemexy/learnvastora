const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Checking users in database...\n');

    // Get total user count
    const totalUsers = await prisma.user.count();
    console.log(`Total users: ${totalUsers}`);

    // Get users by role
    const students = await prisma.user.count({ where: { role: 'STUDENT' } });
    const tutors = await prisma.user.count({ where: { role: 'TUTOR' } });
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    const superAdmins = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });

    console.log(`Students: ${students}`);
    console.log(`Tutors: ${tutors}`);
    console.log(`Admins: ${admins}`);
    console.log(`Super Admins: ${superAdmins}`);

    // Get some sample users
    console.log('\nSample users:');
    const sampleUsers = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    sampleUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role} - Active: ${user.active}`);
    });

    // Check if there are any active users in last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await prisma.user.count({
      where: {
        lastSeen: { gte: last24Hours }
      }
    });
    console.log(`\nActive users (last 24h): ${activeUsers}`);

    // Check total sessions
    const totalSessions = await prisma.booking.count();
    console.log(`Total sessions: ${totalSessions}`);

    // Check total revenue
    const totalRevenue = await prisma.payment.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true }
    });
    console.log(`Total revenue: $${totalRevenue._sum.amount || 0}`);

  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers(); 