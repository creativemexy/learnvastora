const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentStudent() {
  console.log('👤 Checking Current Student and Payments...\n');

  try {
    // Get all students
    console.log('1. All Students in Database:');
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
      }
    });

    students.forEach((student, index) => {
      console.log(`${index + 1}. ${student.name} (${student.email}) - ID: ${student.id}`);
    });

    // Check payments for each student
    console.log('\n2. Payments by Student:');
    for (const student of students) {
      const studentBookings = await prisma.booking.findMany({
        where: { studentId: student.id },
        include: {
          payment: {
            select: {
              amount: true,
              status: true,
            }
          }
        }
      });

      const paidPayments = studentBookings.filter(b => 
        b.payment?.status === 'PAID' && b.payment.amount <= 1000
      );
      
      const totalPaid = paidPayments.reduce((sum, b) => sum + b.payment.amount, 0);
      
      console.log(`\n   ${student.name}:`);
      console.log(`   - Total bookings: ${studentBookings.length}`);
      console.log(`   - Paid bookings: ${paidPayments.length}`);
      console.log(`   - Total spent: $${totalPaid.toFixed(2)}`);
      
      if (paidPayments.length > 0) {
        paidPayments.forEach((booking, index) => {
          console.log(`     ${index + 1}. $${booking.payment.amount.toFixed(2)}`);
        });
      }
    }

    // Find the student with the most paid payments
    console.log('\n3. Student with Most Paid Payments:');
    let maxStudent = null;
    let maxPaid = 0;
    let maxTotal = 0;

    for (const student of students) {
      const studentBookings = await prisma.booking.findMany({
        where: { studentId: student.id },
        include: {
          payment: {
            select: {
              amount: true,
              status: true,
            }
          }
        }
      });

      const paidPayments = studentBookings.filter(b => 
        b.payment?.status === 'PAID' && b.payment.amount <= 1000
      );
      
      const totalPaid = paidPayments.reduce((sum, b) => sum + b.payment.amount, 0);
      
      if (paidPayments.length > maxPaid) {
        maxPaid = paidPayments.length;
        maxTotal = totalPaid;
        maxStudent = student;
      }
    }

    if (maxStudent) {
      console.log(`   Best candidate: ${maxStudent.name} (${maxStudent.email})`);
      console.log(`   - Paid payments: ${maxPaid}`);
      console.log(`   - Total spent: $${maxTotal.toFixed(2)}`);
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkCurrentStudent(); 