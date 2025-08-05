const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTotalSpent() {
  console.log('🔍 Debugging Total Spent Calculation...\n');

  try {
    // Get all payments with full details
    console.log('1. All Payments in Database:');
    const allPayments = await prisma.payment.findMany({
      include: {
        booking: {
          include: {
            tutor: {
              select: { name: true }
            },
            student: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Total payments found: ${allPayments.length}\n`);

    allPayments.forEach((payment, index) => {
      console.log(`${index + 1}. Payment ${payment.id}:`);
      console.log(`   - Amount: $${payment.amount}`);
      console.log(`   - Status: ${payment.status}`);
      console.log(`   - Tutor: ${payment.booking.tutor.name}`);
      console.log(`   - Student: ${payment.booking.student.name}`);
      console.log(`   - Date: ${payment.createdAt.toLocaleDateString()}`);
      console.log('');
    });

    // Check payments by status
    console.log('2. Payments by Status:');
    const byStatus = {};
    allPayments.forEach(payment => {
      const status = payment.status;
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(payment);
    });

    Object.entries(byStatus).forEach(([status, payments]) => {
      const total = payments.reduce((sum, p) => sum + p.amount, 0);
      console.log(`   - ${status}: ${payments.length} payments, Total: $${total.toFixed(2)}`);
    });

    // Check what the API calculation would return
    console.log('\n3. API Calculation Breakdown:');
    
    // Get all bookings with payments
    const bookings = await prisma.booking.findMany({
      include: {
        payment: {
          select: {
            amount: true,
            status: true,
          }
        }
      }
    });

    console.log(`Total bookings with payments: ${bookings.filter(b => b.payment).length}`);

    // Step by step calculation
    const step1 = bookings.filter(b => b.payment?.amount);
    console.log(`   Step 1 - Bookings with payment amounts: ${step1.length}`);

    const step2 = step1.filter(b => b.payment.status === "PAID");
    console.log(`   Step 2 - Bookings with PAID status: ${step2.length}`);

    const step3 = step2.filter(b => b.payment.amount <= 1000);
    console.log(`   Step 3 - Bookings with reasonable amounts (≤$1000): ${step3.length}`);

    const finalTotal = step3.reduce((sum, b) => sum + b.payment.amount, 0);
    console.log(`   Final Total: $${finalTotal.toFixed(2)}`);

    // Show the payments that would be included
    console.log('\n4. Payments that would be included in total:');
    step3.forEach((booking, index) => {
      console.log(`   ${index + 1}. $${booking.payment.amount.toFixed(2)} (${booking.payment.status})`);
    });

    // Check if there are any issues with the student filtering
    console.log('\n5. Checking student-specific payments:');
    const studentId = 'emeka'; // Replace with actual student ID if needed
    console.log(`Looking for student: ${studentId}`);
    
    const studentBookings = bookings.filter(b => 
      b.studentId && b.studentId.includes(studentId)
    );
    console.log(`Student bookings found: ${studentBookings.length}`);

    const studentPayments = studentBookings.filter(b => 
      b.payment?.amount && b.payment.status === "PAID" && b.payment.amount <= 1000
    );
    console.log(`Student paid payments: ${studentPayments.length}`);

    const studentTotal = studentPayments.reduce((sum, b) => sum + b.payment.amount, 0);
    console.log(`Student total spent: $${studentTotal.toFixed(2)}`);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugTotalSpent(); 