const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTutorProfiles() {
  console.log('🔧 Updating Tutor Profiles with new fields...\n');
  
  try {
    // Get all tutors
    const tutors = await prisma.user.findMany({
      where: { role: 'TUTOR' },
      include: { tutorProfile: true }
    });
    
    console.log(`Found ${tutors.length} tutors to update`);
    
    for (const tutor of tutors) {
      console.log(`\nUpdating ${tutor.name} (${tutor.email})...`);
      
      // Sample data for new fields
      const subjects = [
        'Mathematics', 'English', 'Science', 'History', 'Geography',
        'Literature', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
        'Art', 'Music', 'Physical Education', 'Economics', 'Psychology'
      ];
      
      const sampleSubjects = subjects.slice(0, Math.floor(Math.random() * 4) + 2);
      const rating = (Math.random() * 2 + 3).toFixed(1); // 3.0 to 5.0
      const totalSessions = Math.floor(Math.random() * 100) + 10; // 10 to 110
      
      if (tutor.tutorProfile) {
        // Update existing profile
        await prisma.tutorProfile.update({
          where: { userId: tutor.id },
          data: {
            subjects: sampleSubjects,
            rating: parseFloat(rating),
            totalSessions: totalSessions
          }
        });
        console.log(`  ✅ Updated existing profile`);
      } else {
        // Create new profile
        await prisma.tutorProfile.create({
          data: {
            userId: tutor.id,
            bio: `Experienced tutor in ${sampleSubjects.join(', ')}`,
            skills: sampleSubjects,
            subjects: sampleSubjects,
            languages: ['English'],
            experience: Math.floor(Math.random() * 10) + 1,
            education: 'Bachelor\'s Degree',
            hourlyRate: Math.floor(Math.random() * 20) + 20,
            rating: parseFloat(rating),
            totalSessions: totalSessions,
            isPro: Math.random() > 0.7,
            isSupertutor: Math.random() > 0.9,
            instantBookingEnabled: Math.random() > 0.5,
            instantBookingPrice: Math.floor(Math.random() * 15) + 25,
            responseTime: Math.floor(Math.random() * 60) + 5
          }
        });
        console.log(`  ✅ Created new profile`);
      }
      
      console.log(`  - Subjects: ${sampleSubjects.join(', ')}`);
      console.log(`  - Rating: ${rating}/5`);
      console.log(`  - Total Sessions: ${totalSessions}`);
    }
    
    console.log('\n==================================================');
    console.log('🎉 TUTOR PROFILES UPDATED SUCCESSFULLY!');
    console.log('==================================================');
    console.log('✅ Added subjects field to all tutors');
    console.log('✅ Added rating field to all tutors');
    console.log('✅ Added totalSessions field to all tutors');
    console.log('✅ Sample data populated for testing');
    console.log('==================================================');
    
  } catch (error) {
    console.error('❌ Error updating tutor profiles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTutorProfiles(); 