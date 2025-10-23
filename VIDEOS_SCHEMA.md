# Videos Collection Schema

## Collection: `videos`

Stores metadata for all coaching videos in the Kiconu program.

### Document Structure

```typescript
{
  id: string;                              // Auto-generated document ID
  title: string;                           // Video title
  description: string;                     // Video description
  thumbnail_url: string;                   // Mux-generated thumbnail URL
  phase: 1 | 2 | 3;                       // Program phase (1, 2, or 3)
  order: number;                           // Sort order within phase (0-based)
  date_added: Timestamp;                   // Upload date/time
  status: 'Publicado' | 'Borrador';       // Publication status
  duration: number;                        // Video duration in seconds
  mux_asset_id: string;                   // Mux asset identifier
  mux_playback_id: string;                // Mux playback identifier for streaming
  category: 'Nutrición' | 'Transpersonal'; // Coach category
  created_by: string;                      // User ID of admin who uploaded
}
```

### Example Document

```json
{
  "id": "abc123xyz",
  "title": "Introducción a la Nutrición Consciente",
  "description": "En este video aprenderás los fundamentos de la nutrición consciente y cómo aplicarla en tu vida diaria.",
  "thumbnail_url": "https://image.mux.com/xyz123/thumbnail.jpg?width=640&height=360&time=1",
  "phase": 1,
  "order": 0,
  "date_added": "2024-03-15T10:30:00Z",
  "status": "Publicado",
  "duration": 1245,
  "mux_asset_id": "xyz123abc456",
  "mux_playback_id": "xyz123",
  "category": "Nutrición",
  "created_by": "user123abc"
}
```

### Indexes

Required composite indexes:
1. `phase` (Ascending) + `order` (Ascending)
2. `status` (Ascending) + `phase` (Ascending)

---

## Collection: `user_video_progress`

Tracks user viewing progress and completion status for analytics.

### Document Structure

```typescript
{
  id: string;                    // Auto-generated document ID
  user_id: string;              // User identifier
  video_id: string;             // Reference to videos collection
  watched_seconds: number;      // Total seconds watched
  total_duration: number;       // Video duration (cached from video doc)
  progress_percentage: number;  // Calculated: (watched_seconds / total_duration) * 100
  completed: boolean;           // true if progress_percentage >= 90
  last_watched: Timestamp;      // Last viewing timestamp
  completed_date?: Timestamp;   // Optional: When video was marked complete
}
```

### Example Document

```json
{
  "id": "progress123",
  "user_id": "user123abc",
  "video_id": "abc123xyz",
  "watched_seconds": 1120,
  "total_duration": 1245,
  "progress_percentage": 89.96,
  "completed": false,
  "last_watched": "2024-03-20T14:25:30Z"
}
```

### Completed Video Example

```json
{
  "id": "progress456",
  "user_id": "user123abc",
  "video_id": "def456uvw",
  "watched_seconds": 1850,
  "total_duration": 1800,
  "progress_percentage": 100,
  "completed": true,
  "last_watched": "2024-03-21T16:45:00Z",
  "completed_date": "2024-03-21T16:45:00Z"
}
```

### Indexes

Required composite indexes:
1. `user_id` (Ascending) + `video_id` (Ascending) - For finding specific user progress
2. `user_id` (Ascending) + `completed` (Ascending) - For finding completed videos per user
3. `video_id` (Ascending) + `completed` (Ascending) - For video completion analytics

### Progress Calculation

```javascript
// Calculate progress percentage
progress_percentage = (watched_seconds / total_duration) * 100;

// Mark as completed if >= 90%
completed = progress_percentage >= 90;

// Set completion date when first completed
if (completed && !completed_date) {
  completed_date = Timestamp.now();
}
```

---

## Usage Patterns

### Creating Video Progress

When a user watches a video, create or update their progress:

```typescript
const progressRef = collection(db, 'user_video_progress');
const q = query(
  progressRef, 
  where('user_id', '==', userId),
  where('video_id', '==', videoId)
);

const snapshot = await getDocs(q);

if (snapshot.empty) {
  // Create new progress record
  await addDoc(progressRef, {
    user_id: userId,
    video_id: videoId,
    watched_seconds: currentTime,
    total_duration: videoDuration,
    progress_percentage: (currentTime / videoDuration) * 100,
    completed: (currentTime / videoDuration) * 100 >= 90,
    last_watched: Timestamp.now(),
  });
} else {
  // Update existing progress
  const docRef = doc(db, 'user_video_progress', snapshot.docs[0].id);
  await updateDoc(docRef, {
    watched_seconds: Math.max(existingProgress, currentTime),
    progress_percentage: (currentTime / videoDuration) * 100,
    completed: (currentTime / videoDuration) * 100 >= 90,
    last_watched: Timestamp.now(),
  });
}
```

### Querying User's Video Progress

```typescript
// Get all videos user has started watching
const progressRef = collection(db, 'user_video_progress');
const q = query(
  progressRef,
  where('user_id', '==', userId)
);
const snapshot = await getDocs(q);

// Get completed videos only
const completedQ = query(
  progressRef,
  where('user_id', '==', userId),
  where('completed', '==', true)
);
const completedSnapshot = await getDocs(completedQ);

// Get in-progress videos (started but not completed)
const inProgressQ = query(
  progressRef,
  where('user_id', '==', userId),
  where('completed', '==', false)
);
const inProgressSnapshot = await getDocs(inProgressQ);
```

### Video Analytics

```typescript
// Get completion rate for a specific video
const progressRef = collection(db, 'user_video_progress');
const videoProgressQ = query(
  progressRef,
  where('video_id', '==', videoId)
);
const snapshot = await getDocs(videoProgressQ);

const totalViews = snapshot.size;
const completedViews = snapshot.docs.filter(
  doc => doc.data().completed
).length;

const completionRate = (completedViews / totalViews) * 100;

// Get average watch time
const totalWatchTime = snapshot.docs.reduce(
  (sum, doc) => sum + doc.data().watched_seconds,
  0
);
const avgWatchTime = totalWatchTime / totalViews;
```

---

## Security Considerations

### Videos Collection
- Public read access for authenticated users
- Write access restricted to admins only
- Validates all fields on create/update

### User Video Progress Collection  
- Users can only read/write their own progress
- Admins can read all progress data
- Cannot modify user_id or video_id after creation
- Prevents progress manipulation

---

## Data Migration

If you need to migrate existing video data:

```typescript
// Example migration script
const videos = [
  {
    title: "Video Title",
    description: "Description",
    // ... other fields
  }
];

const batch = writeBatch(db);
videos.forEach(video => {
  const docRef = doc(collection(db, 'videos'));
  batch.set(docRef, {
    ...video,
    date_added: Timestamp.now(),
    order: video.order || 0,
  });
});

await batch.commit();
```
