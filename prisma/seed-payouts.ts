import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding payout data...');

  // Get a tutor user
  const tutor = await prisma.user.findFirst({
    where: { role: 'TUTOR' }
  });

  if (!tutor) {
    console.log('No tutor found. Please create a tutor user first.');
    return;
  }

  // Create sample bank accounts
  const bankAccounts = await Promise.all([
    prisma.connectedBank.upsert({
      where: { id: 'bank-1' },
      update: {},
      create: {
        id: 'bank-1',
        tutorId: tutor.id,
        bankName: 'Chase Bank',
        accountNumber: '1234567890',
        routingNumber: '021000021',
        balance: 0,
        connected: true
      }
    }),
    prisma.connectedBank.upsert({
      where: { id: 'bank-2' },
      update: {},
      create: {
        id: 'bank-2',
        tutorId: tutor.id,
        bankName: 'Bank of America',
        accountNumber: '0987654321',
        routingNumber: '026009593',
        balance: 0,
        connected: true
      }
    })
  ]);

  console.log('✅ Bank accounts created successfully!');
  console.log('✅ Payout data seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding payout data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 