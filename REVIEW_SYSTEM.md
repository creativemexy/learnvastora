# Review System Documentation

## Overview

The Review System allows students and tutors to rate and review their completed sessions, creating a feedback loop that improves platform quality and helps users make informed decisions.

## Features

### 1. Review Submission
- **Star Rating**: 1-5 star rating system with hover effects
- **Comments**: Optional text feedback (up to 500 characters)
- **Session Validation**: Only participants can review sessions
- **Duplicate Prevention**: One review per session per user

### 2. Review Display
- **Review Cards**: Individual review display with user info and timestamps
- **Review Lists**: Paginated lists with filtering options
- **Review Statistics**: Average ratings, distribution charts, and summary stats

### 3. Review Management
- **Pending Reviews**: Sessions awaiting review
- **Completed Reviews**: Reviews already submitted
- **Received Reviews**: Reviews from other users

## Components

### Core Components

#### `StarRating` (`src/components/ui/star-rating.tsx`)
- Interactive star rating component
- Supports hover effects and read-only mode
- Configurable sizes (sm, md, lg)
- Optional rating value display

#### `ReviewForm` (`src/components/review/ReviewForm.tsx`)
- Form for submitting new reviews
- Star rating selection
- Comment textarea with character limit
- Form validation and submission handling

#### `ReviewCard` (`src/components/review/ReviewCard.tsx`)
- Individual review display
- User avatar and name
- Rating display
- Comment text
- Timestamp

#### `ReviewList` (`src/components/review/ReviewList.tsx`)
- List of reviews with pagination
- Statistics display
- Loading and error states
- Filtering by user or session

#### `ReviewSummary` (`src/components/review/ReviewSummary.tsx`)
- Summary statistics display
- Average rating with color coding
- Rating distribution chart
- Review count and labels

### Modal Components

#### `ReviewModal` (`src/components/dashboard/ReviewModal.tsx`)
- Modal wrapper for review form
- Session context display
- Success notifications

## API Endpoints

### POST `/api/reviews`
Submit a new review for a session.

**Request Body:**
```json
{
  "sessionId": "string",
  "rating": 5,
  "comment": "Great session!"
}
```

**Response:**
```json
{
  "review": {
    "id": "string",
    "sessionId": "string",
    "reviewerId": "string",
    "revieweeId": "string",
    "rating": 5,
    "comment": "Great session!",
    "createdAt": "2024-01-15T10:00:00Z",
    "reviewer": {
      "id": "string",
      "name": "string",
      "image": "string"
    },
    "reviewee": {
      "id": "string",
      "name": "string",
      "image": "string"
    }
  }
}
```

### GET `/api/reviews`
Retrieve reviews with optional filtering.

**Query Parameters:**
- `userId`: Get reviews for a specific user
- `sessionId`: Get reviews for a specific session

**Response:**
```json
{
  "reviews": [
    {
      "id": "string",
      "rating": 5,
      "comment": "Great session!",
      "createdAt": "2024-01-15T10:00:00Z",
      "reviewer": {
        "id": "string",
        "name": "string",
        "image": "string"
      }
    }
  ]
}
```

## Database Schema

### Review Model
```prisma
model Review {
  id          String   @id @default(cuid())
  sessionId   String
  reviewerId  String
  revieweeId  String
  rating      Int
  comment     String?
  createdAt   DateTime @default(now())
  
  session     Session  @relation(fields: [sessionId], references: [id])
  reviewer    User     @relation("Reviewer", fields: [reviewerId], references: [id])
  reviewee    User     @relation("Reviewee", fields: [revieweeId], references: [id])
}
```

## Integration Points

### Student Dashboard
- Review buttons for completed sessions
- Review status indicators
- Integration with session history

### Tutor Dashboard
- Review display and statistics
- Performance metrics
- Quality indicators

### Reviews Page
- Dedicated page for review management
- Pending, completed, and received reviews
- Review statistics and analytics

## Usage Examples

### Adding Review Button to Session
```tsx
{session.status === "COMPLETED" && !session.reviewed && (
  <Button 
    onClick={() => {
      setSelectedSession(session)
      setShowReviewModal(true)
    }}
  >
    Review Session
  </Button>
)}
```

### Displaying Review Statistics
```tsx
<ReviewSummary
  averageRating={4.8}
  totalReviews={25}
  ratingDistribution={{ 1: 0, 2: 1, 3: 2, 4: 8, 5: 14 }}
  showDistribution={true}
/>
```

### Showing Review List
```tsx
<ReviewList
  userId={tutorId}
  showStats={true}
  maxReviews={5}
/>
```

## Notifications

The review system automatically creates notifications when:
- A user receives a new review
- Review is submitted successfully
- Review validation fails

## Future Enhancements

1. **Review Moderation**: Admin approval system for reviews
2. **Review Responses**: Allow tutors to respond to reviews
3. **Review Analytics**: Advanced statistics and insights
4. **Review Incentives**: Rewards for leaving reviews
5. **Review Categories**: Subject-specific rating criteria
6. **Review Photos**: Allow image attachments to reviews

## Security Considerations

- Only session participants can review
- One review per session per user
- Input validation and sanitization
- Rate limiting for review submissions
- Review content moderation

## Testing

The review system includes:
- Form validation testing
- API endpoint testing
- Component rendering tests
- User interaction testing
- Error handling validation 