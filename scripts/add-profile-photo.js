const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addProfilePhoto() {
  try {
    // Get a user to add profile photo to
    const user = await prisma.user.findFirst({
      where: {
        role: 'TUTOR'
      }
    });

    if (!user) {
      console.log('No tutor user found. Please create a user first.');
      return;
    }

    console.log(`Adding profile photo for user: ${user.name} (${user.id})`);

    // Update user with profile photo
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        // Alternative: use a local photo path
        // photo: '/uploads/profile_1753053008266.jpg',
      }
    });

    console.log('Profile photo added successfully!');
    console.log('Updated user:', {
      id: updatedUser.id,
      name: updatedUser.name,
      photo: updatedUser.photo
    });

  } catch (error) {
    console.error('Error adding profile photo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addProfilePhoto(); 