const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkStudents() {
  try {
    console.log('👥 Checking students in database...\n');

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { 
        id: true, 
        name: true, 
        email: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Found ${students.length} students:\n`);

    students.forEach((student, index) => {
      console.log(`${index + 1}. ${student.name} (${student.email})`);
    });

    if (students.length > 0) {
      console.log(`\n✅ Use the first student's email for testing: ${students[0].email}`);
    }

  } catch (error) {
    console.error('❌ Error checking students:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudents(); 