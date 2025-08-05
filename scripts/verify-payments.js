const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyPayments() {
  try {
    console.log('Verifying Payment & Billing Data...\n');

    // Check payments
    const payments = await prisma.payment.findMany({
      include: {
        user: { select: { name: true, email: true } },
        booking: {
          select: {
            tutor: { select: { name: true } }
          }
        }
      },
      take: 5
    });

    console.log(`Found ${payments.length} payments:`);
    payments.forEach(payment => {
      console.log(`- ${payment.user.name} -> ${payment.booking?.tutor.name}: $${payment.amount} (${payment.status})`);
    });

    // Check payouts
    const payouts = await prisma.payout.findMany({
      include: {
        tutor: { select: { name: true, email: true } }
      },
      take: 5
    });

    console.log(`\nFound ${payouts.length} payouts:`);
    payouts.forEach(payout => {
      console.log(`- ${payout.tutor.name}: $${payout.amount} (${payout.status}) - ${payout.method}`);
    });

    // Get statistics
    const paymentStats = await prisma.payment.aggregate({
      _count: { id: true },
      _sum: { amount: true }
    });

    const payoutStats = await prisma.payout.aggregate({
      _count: { id: true },
      _sum: { amount: true }
    });

    console.log('\n📊 Financial Summary:');
    console.log(`Total Payments: ${paymentStats._count.id}`);
    console.log(`Total Payment Amount: $${paymentStats._sum.amount || 0}`);
    console.log(`Total Payouts: ${payoutStats._count.id}`);
    console.log(`Total Payout Amount: $${payoutStats._sum.amount || 0}`);
    console.log(`Net Revenue: $${(paymentStats._sum.amount || 0) - (payoutStats._sum.amount || 0)}`);

    // Status breakdown
    const paymentStatuses = await prisma.payment.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const payoutStatuses = await prisma.payout.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    console.log('\n📈 Status Breakdown:');
    console.log('Payments:');
    paymentStatuses.forEach(stat => {
      console.log(`  - ${stat.status}: ${stat._count.id}`);
    });

    console.log('Payouts:');
    payoutStatuses.forEach(stat => {
      console.log(`  - ${stat.status}: ${stat._count.id}`);
    });

    console.log('\n✅ Payment & Billing data verified successfully!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPayments(); 