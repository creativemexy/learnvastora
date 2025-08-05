import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // Default settings
    const defaultSettings = {
      platform: {
        name: 'LearnVastora',
        description: 'Language learning platform',
        version: '1.0.0',
        maintenanceMode: false,
        maintenanceMessage: 'Platform is under maintenance',
        maxFileSize: 10,
        allowedFileTypes: ['jpg', 'png', 'pdf', 'doc'],
        sessionTimeout: 30,
        maxSessionsPerUser: 5
      },
      features: {
        instantBooking: true,
        videoRecording: true,
        groupSessions: true,
        mobileApp: true,
        notifications: true,
        badges: true,
        reviews: true,
        payments: true
      },
      security: {
        twoFactorAuth: false,
        passwordMinLength: 8,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        lockoutDuration: 15,
        sslRequired: true,
        apiRateLimit: 100
      },
      payments: {
        currency: 'USD',
        taxRate: 0.1,
        platformFee: 0.15,
        minimumWithdrawal: 10,
        maximumWithdrawal: 1000,
        autoPayout: false,
        payoutSchedule: 'weekly',
        supportedGateways: ['stripe', 'paypal', 'paystack']
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        defaultEmailTemplate: 'Welcome to LearnVastora!',
        smsProvider: 'twilio',
        notificationSchedule: 'immediate'
      },
      analytics: {
        trackingEnabled: true,
        googleAnalyticsId: '',
        facebookPixelId: '',
        dataRetentionDays: 365,
        anonymizeData: false
      },
      support: {
        supportEmail: 'support@learnvastora.com',
        supportPhone: '+1-555-0123',
        liveChatEnabled: true,
        helpCenterUrl: 'https://help.learnvastora.com',
        ticketSystem: 'zendesk',
        autoResponseEnabled: true
      }
    };

    // Reset to defaults
    const resetSettings = await prisma.globalSettings.upsert({
      where: { id: 1 },
      update: defaultSettings,
      create: {
        id: 1,
        settings: defaultSettings,
        version: '1.0.0'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Settings reset to defaults successfully',
      settings: resetSettings
    });

  } catch (error) {
    console.error('Settings reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset settings' },
      { status: 500 }
    );
  }
} 