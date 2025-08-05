const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPaymentOutliers() {
  console.log('🔍 Checking for Payment Outliers...\n');

  try {
    // Get all payments
    const payments = await prisma.payment.findMany({
      include: {
        booking: {
          include: {
            tutor: {
              select: {
                name: true,
              }
            },
            student: {
              select: {
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        amount: 'desc'
      }
    });

    console.log(`Total payments found: ${payments.length}\n`);

    // Check for outliers (payments > $100)
    const outliers = payments.filter(p => p.amount > 100);
    
    if (outliers.length > 0) {
      console.log('⚠️  Potential outliers found (amounts > $100):');
      outliers.forEach(payment => {
        console.log(`   - Payment ${payment.id}: $${payment.amount} (${payment.status})`);
        console.log(`     * Tutor: ${payment.booking.tutor.name}`);
        console.log(`     * Student: ${payment.booking.student.name}`);
        console.log(`     * Date: ${payment.createdAt.toLocaleDateString()}`);
        console.log('');
      });
    } else {
      console.log('✅ No outliers found - all payments are reasonable amounts');
    }

    // Show payment distribution
    console.log('📊 Payment Amount Distribution:');
    const distribution = {
      'Under $10': payments.filter(p => p.amount < 10).length,
      '$10-$25': payments.filter(p => p.amount >= 10 && p.amount <= 25).length,
      '$26-$50': payments.filter(p => p.amount > 25 && p.amount <= 50).length,
      '$51-$100': payments.filter(p => p.amount > 50 && p.amount <= 100).length,
      'Over $100': payments.filter(p => p.amount > 100).length,
    };

    Object.entries(distribution).forEach(([range, count]) => {
      console.log(`   - ${range}: ${count} payments`);
    });

    // Calculate statistics
    const amounts = payments.map(p => p.amount);
    const avg = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const max = Math.max(...amounts);
    const min = Math.min(...amounts);

    console.log('\n📈 Payment Statistics:');
    console.log(`   - Average: $${avg.toFixed(2)}`);
    console.log(`   - Maximum: $${max.toFixed(2)}`);
    console.log(`   - Minimum: $${min.toFixed(2)}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
checkPaymentOutliers(); 