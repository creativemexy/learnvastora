# Admin and Super Admin Dashboards

LearnVastora now includes comprehensive admin and super admin dashboards for platform management and oversight.

## Overview

The platform includes two levels of administrative access:

1. **Admin Dashboard** (`/admin`) - For regular administrators
2. **Super Admin Dashboard** (`/super-admin`) - For super administrators with full system access

## Admin Dashboard

### Access
- URL: `/admin`
- Required Role: `ADMIN`
- Features: Platform management, user oversight, basic analytics

### Features

#### Overview Tab
- **Quick Stats**: Total users, tutors, sessions, revenue, active users, pending approvals
- **Quick Actions**: Links to analytics, user management, sessions, payments, reports, settings
- **Recent Activity**: Real-time activity feed with user actions and system events
- **System Health**: Platform status indicators and health metrics

#### User Management Tab
- View and manage all platform users
- Approve/reject tutor applications
- Manage user roles and permissions
- Export user data

#### Sessions Tab
- Monitor all platform sessions
- View session statistics and trends
- Manage session recordings
- Handle session disputes

#### Financial Tab
- View platform revenue and financial metrics
- Monitor payment processing
- Generate financial reports
- Manage refunds and disputes

#### System Tab
- Basic system settings
- Platform configuration
- Maintenance mode controls

### Navigation
- Accessible from the main admin dashboard
- Quick links to all major functions
- Real-time notifications and alerts

## Super Admin Dashboard

### Access
- URL: `/super-admin`
- Required Role: `SUPER_ADMIN`
- Features: Complete platform oversight, admin management, system administration

### Features

#### Overview Tab
- **Enhanced Stats**: All admin stats plus admin count, platform uptime, security alerts, data usage
- **System Alerts**: Real-time system notifications with priority levels
- **Quick Actions**: Advanced management functions
- **System Health**: Comprehensive health monitoring

#### Admin Management Tab
- **Create/Edit/Delete Administrators**: Full admin user lifecycle management
- **Role Management**: Assign and modify admin roles and permissions
- **Activity Monitoring**: Track admin actions and system access
- **Permission Control**: Granular permission management

#### System Tab
- **System Monitoring**: Real-time system metrics (CPU, memory, disk, network)
- **Backup Management**: System backup scheduling and monitoring
- **Performance Analytics**: System performance tracking
- **Maintenance Tools**: System maintenance and optimization

#### Security Tab
- **Security Center**: Comprehensive security monitoring
- **Threat Detection**: Security scan results and threat analysis
- **Access Control**: Advanced access management
- **Audit Logs**: Complete system audit trail

#### Analytics Tab
- **Advanced Analytics**: Platform-wide analytics and insights
- **Custom Reports**: Generate custom analytical reports
- **Data Export**: Export comprehensive platform data
- **Trend Analysis**: Long-term trend analysis and forecasting

#### Settings Tab
- **Global Settings**: Platform-wide configuration
- **Feature Flags**: Enable/disable platform features
- **Integration Management**: Third-party service configuration
- **System Configuration**: Advanced system settings

### Advanced Features

#### Admin User Management
- Create new administrator accounts
- Assign specific permissions and roles
- Monitor admin activity and access logs
- Suspend or revoke admin access

#### System Monitoring
- Real-time system health monitoring
- Performance metrics and alerts
- Resource usage tracking
- Automated backup management

#### Security Management
- Security scan scheduling
- Threat detection and response
- Access control and authentication
- Security audit and compliance

## API Endpoints

### Admin API (`/api/admin/analytics`)
- `GET /api/admin/analytics` - Platform analytics data
- Supports different analytics types and time periods

### Super Admin API (`/api/super-admin`)
- `GET /api/super-admin?action=overview` - Super admin overview data
- `GET /api/super-admin?action=admins` - Admin user management
- `GET /api/super-admin?action=system` - System status
- `GET /api/super-admin?action=security` - Security status
- `POST /api/super-admin` - Admin management actions

## Database Schema

### User Roles
```prisma
enum Role {
  STUDENT
  TUTOR
  ADMIN
  SUPER_ADMIN
}
```

### Key Tables
- `User` - User accounts with role-based access
- `AdminActivity` - Admin action logging
- `SystemLog` - System event logging
- `SecurityAlert` - Security notifications

## Authentication & Authorization

### Role-Based Access Control
- **STUDENT**: Basic platform access
- **TUTOR**: Teaching and session management
- **ADMIN**: Platform management and oversight
- **SUPER_ADMIN**: Complete system access and admin management

### Security Features
- Session-based authentication
- Role-based authorization
- Activity logging and audit trails
- Secure API endpoints

## Getting Started

### Creating a Super Admin
1. Run the database migration:
   ```bash
   npx prisma migrate dev --name add_super_admin_role
   ```

2. Create a super admin user:
   ```bash
   node scripts/create-super-admin.js
   ```

3. Default super admin credentials:
   - Email: `super@learnvastora.com`
   - Password: `09071254060`

### Accessing the Dashboards
1. Sign in with admin credentials
2. Navigate to `/admin` for admin dashboard
3. Navigate to `/super-admin` for super admin dashboard
4. Use the navigation tabs to access different features

## Security Considerations

### Best Practices
- Change default passwords immediately
- Use strong, unique passwords
- Enable two-factor authentication
- Regularly review admin access
- Monitor system logs for suspicious activity

### Access Control
- Limit admin access to necessary personnel only
- Regularly audit admin permissions
- Implement least-privilege access principles
- Monitor and log all admin actions

## Customization

### Styling
- CSS files: `admin-dashboard.css` and `super-admin-dashboard.css`
- Glassmorphism design with modern UI elements
- Responsive design for all screen sizes
- Customizable color schemes and themes

### Functionality
- Modular component architecture
- Extensible API endpoints
- Configurable dashboard widgets
- Customizable analytics and reports

## Support

For technical support or questions about the admin dashboards:
- Check the API documentation
- Review the database schema
- Consult the security guidelines
- Contact the development team

## Future Enhancements

### Planned Features
- Advanced analytics and reporting
- Automated system monitoring
- Enhanced security features
- Mobile admin applications
- Integration with external tools
- Advanced user management features
- Real-time collaboration tools
- Automated backup and recovery
- Performance optimization tools
- Advanced audit and compliance features 