# Super Admin User Management & Messaging

LearnVastora now includes comprehensive user management and messaging capabilities for super administrators, allowing complete oversight and communication with all platform users.

## Overview

The super admin dashboard has been enhanced with two major new features:

1. **User Management** - Complete user oversight and administration
2. **Messaging System** - Direct communication with any user or bulk messaging

## User Management Features

### Access
- **URL**: `/super-admin` → "User Management" tab
- **Required Role**: `SUPER_ADMIN`
- **Features**: View, search, filter, and manage all platform users

### Core Functionality

#### 1. User List View
- **Real-time Data**: All user data is fetched dynamically from the database
- **Pagination**: 20 users per page with navigation controls
- **User Cards**: Each user displays:
  - Profile photo or avatar placeholder
  - Name, email, and role
  - Online status indicator
  - Last seen timestamp
  - Activity statistics (bookings, messages)
  - Account status (active/inactive)

#### 2. Search & Filtering
- **Text Search**: Search by name or email
- **Role Filter**: Filter by STUDENT, TUTOR, ADMIN, or SUPER_ADMIN
- **Status Filter**: Filter by active or inactive users
- **Real-time Results**: Filters apply instantly without page reload

#### 3. User Actions
- **Edit User**: Modify user details and settings
- **Send Message**: Direct messaging to any user
- **Delete User**: Remove users from the platform (with confirmation)
- **View Profile**: Access complete user profile information

#### 4. User Statistics
Each user displays:
- Total bookings (as student or tutor)
- Total messages sent
- Total reviews given/received
- Total payments made
- Profile completion status

### API Endpoints

#### GET `/api/super-admin/users`
Fetches paginated user list with filtering options.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Users per page (default: 20)
- `search` (string): Search by name or email
- `role` (string): Filter by user role
- `status` (string): Filter by active/inactive status

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-id",
        "name": "User Name",
        "email": "user@example.com",
        "role": "STUDENT",
        "status": "active",
        "isOnline": true,
        "lastSeen": "2025-07-23T21:07:01.761Z",
        "createdAt": "2025-07-23T21:07:01.761Z",
        "photo": "profile-photo-url",
        "profile": {
          "language": "English",
          "country": "USA",
          "bio": "User bio",
          "languageLevel": "Intermediate"
        },
        "tutorProfile": {
          "subjects": ["English", "Math"],
          "hourlyRate": 25,
          "isApproved": true,
          "totalSessions": 10,
          "rating": 4.5
        },
        "stats": {
          "totalBookings": 5,
          "totalReviews": 3,
          "totalPayments": 2,
          "totalMessages": 15
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

#### PUT `/api/super-admin/users`
Updates user information.

**Request Body:**
```json
{
  "userId": "user-id",
  "updates": {
    "name": "Updated Name",
    "email": "updated@example.com",
    "role": "TUTOR",
    "active": true
  }
}
```

#### DELETE `/api/super-admin/users?userId=user-id`
Deletes a user from the platform.

**Security Notes:**
- Cannot delete super admin users
- Cannot delete your own account
- Requires confirmation dialog

## Messaging Features

### Access
- **URL**: `/super-admin` → "Messaging" tab
- **Required Role**: `SUPER_ADMIN`
- **Features**: Individual and bulk messaging to any user

### Core Functionality

#### 1. Conversation Management
- **Conversation List**: Shows all users with message activity
- **Real-time Updates**: Live conversation status and message counts
- **User Information**: Display user details, role, and online status
- **Message History**: Complete conversation history with timestamps

#### 2. Individual Messaging
- **Direct Messages**: Send messages to any user
- **System Messages**: Special formatting for system communications
- **Message Threading**: Organized conversation view
- **Real-time Delivery**: Instant message delivery and notifications

#### 3. Bulk Messaging
- **User Selection**: Choose multiple users via checkboxes
- **Message Composition**: Write once, send to many
- **Delivery Tracking**: Track successful and failed deliveries
- **System Notifications**: Automatic notification creation for recipients

#### 4. Message Types
- **Regular Messages**: Standard user-to-user communication
- **System Messages**: Prefixed with `[SYSTEM]` for official communications
- **Bulk Messages**: Mass communication to selected users

### API Endpoints

#### GET `/api/super-admin/messages`
Fetches conversations or messages based on action parameter.

**Query Parameters:**
- `action` (string): `conversations`, `messages`, or `system_messages`
- `userId` (string): Required for `messages` action
- `page` (number): Page number for pagination
- `limit` (number): Items per page

**Response for Conversations:**
```json
{
  "success": true,
  "action": "conversations",
  "data": {
    "conversations": [
      {
        "userId": "user-id",
        "userName": "User Name",
        "userEmail": "user@example.com",
        "userRole": "STUDENT",
        "userPhoto": "photo-url",
        "isOnline": true,
        "lastSeen": "2025-07-23T21:07:01.761Z",
        "lastMessage": "Hello, how can I help?",
        "lastMessageTime": "2025-07-23T21:07:01.761Z",
        "totalMessages": 15
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 25
    }
  }
}
```

#### POST `/api/super-admin/messages`
Sends messages to users.

**Request Body for Individual Message:**
```json
{
  "action": "send_message",
  "userId": "user-id",
  "message": "Your message content here"
}
```

**Request Body for Bulk Message:**
```json
{
  "action": "send_bulk_message",
  "message": "Bulk message content",
  "userIds": ["user1-id", "user2-id", "user3-id"]
}
```

**Response:**
```json
{
  "success": true,
  "action": "send_bulk_message",
  "result": {
    "totalSent": 10,
    "successful": 9,
    "failed": 1,
    "details": [
      {
        "userId": "user1-id",
        "messageId": "msg-id",
        "bookingId": "booking-id",
        "sentAt": "2025-07-23T21:07:01.761Z"
      }
    ]
  }
}
```

## User Interface Features

### Modern Design
- **Glassmorphism UI**: Modern glass-like interface with blur effects
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Updates**: Live data without page refreshes
- **Loading States**: Visual feedback during data operations

### Navigation
- **Tab-based Interface**: Easy switching between features
- **Breadcrumb Navigation**: Clear location awareness
- **Quick Actions**: Fast access to common functions
- **Search Integration**: Global search capabilities

### User Experience
- **Intuitive Controls**: Easy-to-use interface elements
- **Confirmation Dialogs**: Prevents accidental actions
- **Error Handling**: Graceful error messages and recovery
- **Success Feedback**: Clear confirmation of successful actions

## Security & Permissions

### Access Control
- **Role-based Authorization**: Only SUPER_ADMIN can access
- **Session Validation**: Secure session management
- **API Protection**: All endpoints require authentication
- **Data Validation**: Input sanitization and validation

### Data Protection
- **User Privacy**: Respects user privacy settings
- **Audit Trail**: All actions are logged for accountability
- **Secure Communication**: Encrypted message transmission
- **Data Retention**: Configurable data retention policies

## Database Schema

### Key Tables
- **User**: User accounts and profiles
- **Message**: All platform messages
- **Booking**: Session bookings for message context
- **Notification**: System notifications for messages
- **TutorProfile**: Tutor-specific information

### Relationships
- Messages are linked to bookings for context
- Users can have multiple roles and profiles
- Notifications are created for message delivery
- All data is properly indexed for performance

## Testing & Verification

### Test Script
Run the test script to verify functionality:
```bash
node scripts/test-super-admin-features.js
```

### Test Data
The script creates:
- Test bookings for message context
- Sample messages between users
- System messages from super admin
- User activity data

### Verification Checklist
- [ ] Super admin can view all users
- [ ] Search and filtering work correctly
- [ ] User details are displayed accurately
- [ ] Messages can be sent to individual users
- [ ] Bulk messaging works with multiple users
- [ ] Real-time updates function properly
- [ ] Security restrictions are enforced
- [ ] UI is responsive on all devices

## Usage Examples

### Individual User Management
1. Navigate to Super Admin Dashboard
2. Click "User Management" tab
3. Search for a specific user
4. View user details and statistics
5. Send a direct message or edit user information

### Bulk Messaging
1. Click "Send Bulk Message" button
2. Select target users from the list
3. Compose your message
4. Review and send
5. Monitor delivery status

### System Communication
1. Use the messaging interface
2. Prefix messages with `[SYSTEM]` for official communications
3. Send to specific users or use bulk messaging
4. Track message delivery and responses

## Troubleshooting

### Common Issues
- **No Users Displayed**: Check database connection and user data
- **Messages Not Sending**: Verify API endpoints and authentication
- **Slow Performance**: Check database indexes and query optimization
- **UI Issues**: Clear browser cache and check responsive design

### Debug Information
- Check browser console for JavaScript errors
- Review server logs for API errors
- Verify database connectivity and permissions
- Test with different user roles and permissions

## Future Enhancements

### Planned Features
- **Advanced Analytics**: User behavior and engagement metrics
- **Message Templates**: Pre-defined message templates for common communications
- **Scheduled Messages**: Send messages at specific times
- **Message Analytics**: Track message open rates and engagement
- **Export Functionality**: Export user data and message history
- **Advanced Filtering**: More sophisticated user filtering options

### Integration Opportunities
- **Email Integration**: Send messages via email as backup
- **Push Notifications**: Mobile push notifications for messages
- **Webhook Support**: External system integrations
- **API Rate Limiting**: Prevent abuse and ensure performance
- **Message Encryption**: End-to-end message encryption

## Support & Maintenance

### Regular Maintenance
- Monitor database performance and optimize queries
- Review and update security policies
- Backup message data and user information
- Update UI components and dependencies

### User Support
- Provide training for super admin users
- Document common use cases and workflows
- Create troubleshooting guides
- Maintain user feedback channels

This comprehensive user management and messaging system provides super administrators with complete control over platform users and communication, ensuring effective platform management and user engagement. 