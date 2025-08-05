const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addVideoFields() {
  try {
    console.log('Adding video fields to tutor profiles...');

    // Sample video URLs for demonstration
    const sampleVideos = [
      'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4'
    ];

    // Get all tutors
    const tutors = await prisma.user.findMany({
      where: {
        role: 'TUTOR'
      },
      include: {
        tutorProfile: true
      }
    });

    console.log(`Found ${tutors.length} tutors to update`);

    // Update each tutor with video fields
    for (let i = 0; i < tutors.length; i++) {
      const tutor = tutors[i];
      const videoIndex = i % sampleVideos.length;
      const videoUrl = sampleVideos[videoIndex];
      
      // Create thumbnail URL (for now, using a placeholder)
      const thumbnailUrl = `https://via.placeholder.com/400x300/7c3aed/ffffff?text=${encodeURIComponent(tutor.name)}`;

      if (tutor.tutorProfile) {
        // Update existing tutor profile
        await prisma.tutorProfile.update({
          where: {
            id: tutor.tutorProfile.id
          },
          data: {
            introVideoUrl: videoUrl
          }
        });
        console.log(`Updated tutor profile for ${tutor.name} with video: ${videoUrl}`);
      } else {
        // Create new tutor profile with video fields
        await prisma.tutorProfile.create({
          data: {
            userId: tutor.id,
            bio: `Hi, I'm ${tutor.name}! I'm passionate about teaching and helping students achieve their language goals.`,
            languages: ['English'],
            skills: ['Conversation', 'Grammar', 'Pronunciation'],
            experience: 3,
            education: 'Bachelor\'s Degree',
            hourlyRate: 25 + (i * 5), // Varying rates
            instantBookingEnabled: true,
            instantBookingPrice: 15 + (i * 3),
            introVideoUrl: videoUrl
          }
        });
        console.log(`Created tutor profile for ${tutor.name} with video: ${videoUrl}`);
      }
    }

    console.log('✅ Successfully added video fields to all tutor profiles!');
  } catch (error) {
    console.error('❌ Error adding video fields:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addVideoFields(); 