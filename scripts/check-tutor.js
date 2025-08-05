const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTutor() {
  try {
    const tutor = await prisma.user.findUnique({
      where: { id: 'bad744ef-6a46-4417-b5b8-52e3c2aaa278' },
      include: { tutorProfile: true }
    });
    console.log(tutor ? tutor : 'Tutor not found');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkTutor(); 