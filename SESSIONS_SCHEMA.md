# Sessions Collection Schema

## Collection: `sessions`

### Fields

| Field Name | Type | Description | Required | Validation |
|------------|------|-------------|----------|------------|
| `user_id` | string | Firebase UID of the user the session is scheduled for | Yes | Must be a valid user ID |
| `day` | timestamp | Date and time of the session | Yes | Must be a Firestore Timestamp |
| `time` | string | Time of day in HH:MM format (e.g., "15:00") | Yes | Format: "HH:MM" |
| `duration` | number | Session duration in minutes | Yes | Default: 90 minutes |
| `status` | string | Status of the session | Yes | Allowed values: "scheduled", "finished", "cancelled" |
| `coach` | string | Type of coaching session | Yes | Allowed values: "Nutricion", "Transpersonal" |
| `stage` | string | Program stage/phase | Yes | e.g., "Fase 1", "Fase 2", "Fase 3" |
| `title` | string | Session title | Yes | e.g., "Sesión Nutricion", "Sesión Transpersonal" |
| `created_at` | timestamp | When the session was created | No | Auto-generated |

### Example Document

```json
{
  "user_id": "abc123xyz456",
  "day": Timestamp(2025-10-25 15:00:00),
  "time": "15:00",
  "duration": 90,
  "status": "scheduled",
  "coach": "Nutricion",
  "stage": "Fase 1",
  "title": "Sesión Nutricion",
  "created_at": Timestamp(2025-10-22 10:30:00)
}
```

## Security Rules

### Read Access
- **Admins**: Can read all sessions
- **Users**: Can only read their own sessions (where `user_id` matches their Firebase UID)

### Create Access
- **Users**: Can create sessions for themselves with:
  - `user_id` must match their Firebase UID
  - `status` must be "scheduled"
  - `coach` must be "Nutricion" or "Transpersonal"
  - `duration` must be 90 minutes
- **Admins**: Can create sessions for any user with:
  - Any valid `user_id`
  - `status` can be "scheduled", "finished", or "cancelled"
  - `coach` must be "Nutricion" or "Transpersonal"
  - Any valid duration

### Update Access
- **Admins only**: Can update any session

### Delete Access
- **Admins only**: Can delete any session

## UI Components

### User Panel (`/panel`)
- **NextActivityCard**: Shows the next scheduled session for the user
  - If no session exists: Shows "Ninguna programada" with "Programar Sesión" button
  - If session exists: Shows day, time, and duration
- **ScheduleSessionModal**: Modal for users to schedule their own sessions
  - Week view with next 7 days
  - Time selection (8:00 AM - 8:00 PM)
  - Coach selection (Nutricion / Transpersonal)
  - Fixed 90-minute duration

### Admin Calendar (`/calendario`)
- **Calendar View**: Shows all scheduled sessions
  - **Nutricion sessions**: Fluorescent green (`bg-green-400`)
  - **Transpersonal sessions**: Bright golden (`bg-yellow-400`)
- **AdminScheduleSessionModal**: Modal for admins to add sessions
  - User selection dropdown
  - Next 30 days calendar
  - Time selection (8:00 AM - 8:00 PM)
  - Coach selection
  - Customizable duration
- **Delete Functionality**: Click on any session in the calendar to delete it

## Firestore Indexes

You may need to create these composite indexes in Firestore:

1. **Index for fetching user's next session**:
   - Collection: `sessions`
   - Fields:
     - `user_id` (Ascending)
     - `status` (Ascending)
     - `day` (Ascending)

To create this index, Firebase will provide a link in the console error when you first run the query.
