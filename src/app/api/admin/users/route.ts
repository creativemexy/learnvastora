import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin or Super Admin
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (role) {
      where.role = role;
    }
    
    if (status) {
      where.active = status === 'active';
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Get users with related data
    const users = await prisma.user.findMany({
      where,
      include: {
        tutorProfile: {
          select: {
            id: true,
            bio: true,
            hourlyRate: true,
            rating: true,
            totalSessions: true,
            isPro: true,
            isSupertutor: true
          }
        },
        _count: {
          select: {
            bookingsAsStudent: true,
            bookingsAsTutor: true,
            reviewsGiven: true,
            reviewsReceived: true,
            notifications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // Get total count for pagination
    const totalUsers = await prisma.user.count({ where });
    const totalPages = Math.ceil(totalUsers / limit);

    // Get user statistics
    const stats = await prisma.user.groupBy({
      by: ['role'],
      where,
      _count: {
        id: true
      }
    });

    // Get active/inactive stats
    const activeStats = await prisma.user.groupBy({
      by: ['active'],
      where,
      _count: {
        id: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          totalUsers,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats: {
          byRole: stats,
          byStatus: activeStats
        }
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin or Super Admin
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, isActive = true } = body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        active: isActive,
        isOnline: false
      },
      include: {
        tutorProfile: true,
        _count: {
          select: {
            bookingsAsStudent: true,
            bookingsAsTutor: true,
            reviewsGiven: true,
            reviewsReceived: true,
            notifications: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin or Super Admin
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, email, role, isActive, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      role,
      active: isActive
    };

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        tutorProfile: true,
        _count: {
          select: {
            bookingsAsStudent: true,
            bookingsAsTutor: true,
            reviewsGiven: true,
            reviewsReceived: true,
            notifications: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin or Super Admin
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent deleting your own account
    if (id === (session.user as any).id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user (this will cascade delete related data)
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 