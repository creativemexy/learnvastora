# Global Settings Implementation

## Overview

The Global Settings system provides super admins with comprehensive control over platform-wide configurations, features, security settings, payment parameters, and system behavior. This implementation includes a complete settings management interface with real-time updates, backup/restore functionality, and audit logging.

## Features

### 🔧 Core Functionality
- **Platform Configuration**: Branding, version control, maintenance mode
- **Feature Toggles**: Enable/disable platform features dynamically
- **Security Settings**: Authentication, session management, rate limiting
- **Payment Configuration**: Fees, currencies, withdrawal limits
- **Notification Settings**: Email, SMS, push notification controls
- **Analytics Configuration**: Tracking, data retention, privacy settings
- **Support Settings**: Contact information, help center, ticket systems

### 📊 Management Features
- **Real-time Updates**: Instant application of setting changes
- **Export/Import**: Backup and restore settings configurations
- **Reset to Defaults**: Restore factory settings
- **Audit Logging**: Track all setting changes with admin activity
- **Backup System**: Automatic and manual settings backups
- **Validation**: Input validation and error handling

## Database Schema

### GlobalSettings Model
```prisma
model GlobalSettings {
  id        Int      @id @default(1)
  settings  Json     // JSON object containing all global settings
  version   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### SettingsBackup Model
```prisma
model SettingsBackup {
  id        String   @id @default(uuid())
  backupId  String   @unique
  settings  Json     // JSON object containing backed up settings
  version   String
  createdBy String
  createdAt DateTime @default(now())
}
```

### AdminActivity Model
```prisma
model AdminActivity {
  id        String   @id @default(uuid())
  adminId   String
  action    String
  details   Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  admin User @relation(fields: [adminId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

### GET /api/super-admin/settings
Fetch global settings or specific category settings.

**Query Parameters:**
- `category` (optional): Specific settings category to fetch

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": { ... },
    "features": { ... },
    "security": { ... },
    "payments": { ... },
    "notifications": { ... },
    "analytics": { ... },
    "support": { ... }
  }
}
```

### PUT /api/super-admin/settings
Update specific category settings.

**Request Body:**
```json
{
  "category": "platform",
  "settings": {
    "name": "Updated Platform Name",
    "version": "1.1.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "category": "platform",
  "data": { ... },
  "message": "Settings updated successfully"
}
```

### POST /api/super-admin/settings
Perform settings management actions.

**Actions:**
- `reset_to_defaults`: Reset all settings to factory defaults
- `export_settings`: Export current settings as JSON
- `import_settings`: Import settings from JSON
- `backup_settings`: Create a backup of current settings
- `restore_settings`: Restore settings from backup

## Settings Categories

### Platform Settings
```typescript
platform: {
  name: string;                    // Platform name
  description: string;             // Platform description
  version: string;                 // Current version
  maintenanceMode: boolean;        // Maintenance mode toggle
  maintenanceMessage: string;      // Maintenance message
  maxFileSize: number;             // Maximum file upload size
  allowedFileTypes: string[];      // Allowed file extensions
  sessionTimeout: number;          // Session timeout in minutes
  maxSessionsPerUser: number;      // Max concurrent sessions
}
```

### Feature Toggles
```typescript
features: {
  instantBooking: boolean;         // Enable instant booking
  videoRecording: boolean;         // Enable session recording
  groupSessions: boolean;          // Enable group sessions
  mobileApp: boolean;              // Mobile app availability
  notifications: boolean;          // Notification system
  badges: boolean;                 // Achievement badges
  reviews: boolean;                // Review system
  payments: boolean;               // Payment processing
}
```

### Security Settings
```typescript
security: {
  twoFactorAuth: boolean;          // Enable 2FA
  passwordMinLength: number;       // Minimum password length
  sessionTimeout: number;          // Session timeout
  maxLoginAttempts: number;        // Max failed login attempts
  lockoutDuration: number;         // Account lockout duration
  sslRequired: boolean;            // Require SSL
  apiRateLimit: number;            // API rate limit per minute
}
```

### Payment Settings
```typescript
payments: {
  currency: string;                // Default currency
  taxRate: number;                 // Tax rate (decimal)
  platformFee: number;             // Platform fee percentage
  minimumWithdrawal: number;       // Minimum withdrawal amount
  maximumWithdrawal: number;       // Maximum withdrawal amount
  autoPayout: boolean;             // Automatic payouts
  payoutSchedule: string;          // Payout frequency
  supportedGateways: string[];     // Payment gateways
}
```

### Notification Settings
```typescript
notifications: {
  emailEnabled: boolean;           // Email notifications
  smsEnabled: boolean;             // SMS notifications
  pushEnabled: boolean;            // Push notifications
  defaultEmailTemplate: string;    // Default email template
  smsProvider: string;             // SMS service provider
  notificationSchedule: string;    // Notification timing
}
```

### Analytics Settings
```typescript
analytics: {
  trackingEnabled: boolean;        // Enable analytics tracking
  googleAnalyticsId: string;       // Google Analytics ID
  facebookPixelId: string;         // Facebook Pixel ID
  dataRetentionDays: number;       // Data retention period
  anonymizeData: boolean;          // Anonymize user data
}
```

### Support Settings
```typescript
support: {
  supportEmail: string;            // Support email address
  supportPhone: string;            // Support phone number
  liveChatEnabled: boolean;        // Live chat availability
  helpCenterUrl: string;           // Help center URL
  ticketSystem: string;            // Ticket system type
  autoResponseEnabled: boolean;    // Auto-response system
}
```

## User Interface

### Settings Navigation
The settings interface includes a sidebar navigation with categorized settings:
- **Platform**: Basic platform configuration
- **Features**: Feature toggle controls
- **Security**: Security and authentication settings
- **Payments**: Payment processing configuration
- **Notifications**: Communication settings
- **Analytics**: Tracking and data settings
- **Support**: Customer support configuration

### Settings Panel
Each category displays relevant settings with:
- **Input Fields**: Text, number, and textarea inputs
- **Checkboxes**: Boolean toggles for features
- **Select Dropdowns**: Predefined option lists
- **Validation**: Real-time input validation
- **Save Buttons**: Category-specific save actions

### Management Actions
- **Export**: Download settings as JSON file
- **Import**: Upload and apply settings from JSON
- **Reset**: Restore factory default settings
- **Advanced**: Access advanced configuration options

## Implementation Details

### Frontend Components
- **Settings Navigation**: Category-based navigation sidebar
- **Settings Panel**: Dynamic settings form rendering
- **Settings Grid**: Responsive grid layout for form fields
- **Action Buttons**: Export, import, reset functionality
- **Loading States**: Loading indicators for async operations
- **Error Handling**: User-friendly error messages

### Backend Services
- **Settings Service**: CRUD operations for settings
- **Validation Service**: Input validation and sanitization
- **Backup Service**: Settings backup and restore
- **Audit Service**: Activity logging and tracking
- **Cache Service**: Settings caching for performance

### Security Features
- **Authentication**: Super admin role verification
- **Authorization**: Role-based access control
- **Input Validation**: Server-side validation
- **Audit Logging**: Complete change tracking
- **Rate Limiting**: API rate limiting protection

## Usage Examples

### Updating Platform Settings
```javascript
const response = await fetch('/api/super-admin/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    category: 'platform',
    settings: {
      name: 'New Platform Name',
      maintenanceMode: true,
      maintenanceMessage: 'Scheduled maintenance in progress'
    }
  })
});
```

### Exporting Settings
```javascript
const response = await fetch('/api/super-admin/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'export_settings' })
});

const data = await response.json();
const blob = new Blob([JSON.stringify(data.result, null, 2)]);
const url = URL.createObjectURL(blob);
// Download the file
```

### Resetting to Defaults
```javascript
const response = await fetch('/api/super-admin/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'reset_to_defaults' })
});
```

## Testing

### Test Script
Run the comprehensive test suite:
```bash
node scripts/test-global-settings.js
```

### Test Coverage
- Database schema validation
- CRUD operations testing
- Settings structure verification
- Backup/restore functionality
- Admin activity logging
- Data integrity checks

## Best Practices

### Settings Management
1. **Backup Before Changes**: Always create backups before major changes
2. **Test in Staging**: Test settings changes in staging environment first
3. **Document Changes**: Maintain change logs for all modifications
4. **Validate Inputs**: Always validate user inputs server-side
5. **Monitor Impact**: Monitor system performance after settings changes

### Security Considerations
1. **Role Verification**: Ensure only super admins can modify settings
2. **Input Sanitization**: Sanitize all user inputs
3. **Audit Logging**: Log all settings changes with user details
4. **Rate Limiting**: Implement API rate limiting
5. **Session Management**: Proper session handling for admin users

### Performance Optimization
1. **Caching**: Cache frequently accessed settings
2. **Lazy Loading**: Load settings categories on demand
3. **Batch Updates**: Group related settings updates
4. **Database Indexing**: Proper indexing for settings queries
5. **Connection Pooling**: Efficient database connection management

## Troubleshooting

### Common Issues
1. **Settings Not Saving**: Check authentication and permissions
2. **Import Failures**: Validate JSON format and structure
3. **Performance Issues**: Check database indexing and caching
4. **UI Not Updating**: Verify real-time update mechanisms
5. **Backup Failures**: Check disk space and permissions

### Debug Steps
1. Check server logs for error messages
2. Verify database connectivity
3. Test API endpoints directly
4. Validate user authentication
5. Check browser console for frontend errors

## Future Enhancements

### Planned Features
- **Settings Templates**: Predefined settings configurations
- **Environment-Specific Settings**: Different settings per environment
- **Settings Migration**: Automated settings migration tools
- **Advanced Validation**: Complex validation rules
- **Settings Analytics**: Usage analytics for settings changes
- **Multi-language Support**: Localized settings interface
- **Settings API**: Public API for settings access
- **Settings Marketplace**: Community settings sharing

### Integration Opportunities
- **CI/CD Pipeline**: Automated settings deployment
- **Monitoring Systems**: Settings change monitoring
- **Alert Systems**: Settings change notifications
- **Backup Services**: Cloud backup integration
- **Version Control**: Git-based settings versioning 