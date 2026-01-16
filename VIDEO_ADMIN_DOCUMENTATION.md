# Video Administration System Documentation

## Overview
The Video Administration system allows admin users to upload, manage, and organize coaching videos for the Kiconu program. Videos are stored using Mux (video streaming service) and metadata is stored in Firestore.

## Architecture

### Mux Integration
- **Service**: Mux video streaming platform
- **Token ID**: Configured in `/lib/mux.ts`
- **Features**:
  - Direct video uploads
  - Automatic thumbnail generation
  - Video playback IDs
  - Analytics tracking (client-side)

### Firestore Collections

#### 1. `videos` Collection
Stores video metadata and Mux references.

**Fields**:
- `id` (string): Document ID
- `title` (string): Video title
- `description` (string): Video description
- `thumbnail_url` (string): Generated thumbnail from Mux
- `phase` (1 | 2 | 3): Program phase
- `order` (number): Sort order within phase
- `date_added` (timestamp): Upload date
- `status` ('Publicado' | 'Borrador'): Publication status
- `duration` (number): Video duration in seconds
- `mux_asset_id` (string): Mux asset identifier
- `mux_playback_id` (string): Mux playback identifier
- `category` ('Nutrición' | 'Transpersonal'): Coach category
- `created_by` (string): Admin user ID who uploaded

#### 2. `user_video_progress` Collection
Tracks user viewing progress and analytics.

**Fields**:
- `id` (string): Document ID
- `user_id` (string): User identifier
- `video_id` (string): Video document ID
- `watched_seconds` (number): Total seconds watched
- `total_duration` (number): Video duration
- `progress_percentage` (number): Calculated percentage
- `completed` (boolean): true if progress >= 90%
- `last_watched` (timestamp): Last viewing timestamp
- `completed_date` (timestamp, optional): Completion date

## Features

### 1. Video Upload
**Location**: `/adminvideos` page → "Subir Video" button

**Process**:
1. Admin selects video file (MP4, MOV, AVI, WebM, max 5GB)
2. Fills in metadata (title, description, category, phase, status)
3. System creates Mux direct upload URL
4. Video uploads to Mux
5. System polls Mux API until asset is ready
6. Thumbnail generated automatically
7. Video metadata saved to Firestore

**Components**:
- `UploadVideoModal.tsx`: Upload interface
- API: `/api/mux/create-upload`

### 2. Video Editing
**Location**: Click "edit" icon on any video row

**Editable Fields**:
- Title
- Description
- Category (Nutrición/Transpersonal)
- Phase (1/2/3)
- Status (Publicado/Borrador)

**Components**:
- `EditVideoModal.tsx`: Edit interface

### 3. Video Deletion
**Location**: Click "delete" icon on any video row

**Process**:
- Confirms deletion with user
- Removes document from Firestore
- Note: Mux asset is NOT automatically deleted (manual cleanup required)

### 4. Drag & Drop Reordering
**Location**: Drag the drag handle icon (visible on hover)

**Process**:
- Uses `@dnd-kit` library for drag and drop
- Reorders videos within the current phase
- Updates `order` field in Firestore batch write
- Maintains separate order sequences per phase

**Components**:
- `SortableRow`: Individual draggable row
- `DndContext`, `SortableContext`: Drag and drop providers

### 5. Filtering & Search
**Filters**:
- Search: Title/description text search
- Category: Nutrición or Transpersonal
- Status: Publicado or Borrador

**Phase Tabs**: Switch between Fase 1, 2, and 3

## API Endpoints

### POST `/api/mux/create-upload`
Creates a Mux direct upload URL.

**Response**:
```json
{
  "uploadId": "string",
  "uploadUrl": "string"
}
```

### GET `/api/mux/asset/[assetId]`
Retrieves Mux asset information.

**Response**:
```json
{
  "id": "string",
  "status": "ready" | "preparing",
  "duration": number,
  "playbackId": "string",
  "aspectRatio": "string",
  "maxStoredResolution": "string"
}
```

## Mux Utility Functions

### `getMuxThumbnailUrl(playbackId, options)`
Generates thumbnail URL from Mux playback ID.

**Options**:
- `width`: Thumbnail width (default: 640)
- `height`: Thumbnail height (default: 360)
- `time`: Timestamp in seconds (default: 0)

**Returns**: `string` - Thumbnail URL

### `createDirectUpload()`
Creates a direct upload URL for client-side uploads.

**Returns**: `Promise<{ uploadId, uploadUrl }>`

### `getMuxAsset(assetId)`
Retrieves asset details from Mux.

**Returns**: `Promise<Asset>`

### `deleteMuxAsset(assetId)`
Deletes asset from Mux (not currently used in UI).

## Security Rules

### Videos Collection
- **Read**: All authenticated users
- **Create/Update/Delete**: Admins only
- **Validation**: Enforces required fields and data types

### User Video Progress Collection
- **Read**: User owns record OR is admin
- **Create**: User can create own records only
- **Update**: User can update own records (cannot change user_id/video_id)
- **Delete**: Admins only

## Usage Flow

### Admin Workflow
1. Log in as admin user (is_admin = true)
2. Navigate to `/adminvideos`
3. Select phase tab (1, 2, or 3)
4. Click "Subir Video" to upload new video
5. Fill in video details and upload file
6. Wait for processing (up to 60 seconds)
7. Video appears in table
8. Drag to reorder, click edit to modify, or delete

### User Viewing (To Be Implemented)
1. User navigates to video player page
2. Selects video from phase list
3. Mux Player component loads video
4. Progress tracked with `timeupdate` events
5. Progress saved to `user_video_progress` collection
6. Video marked complete at 90% watched

## Dependencies

### NPM Packages
- `@mux/mux-node`: Mux server-side SDK
- `@mux/mux-player-react`: Mux video player component (for future use)
- `@dnd-kit/core`: Drag and drop core
- `@dnd-kit/sortable`: Sortable drag and drop
- `@dnd-kit/utilities`: Drag and drop utilities

### Firebase
- Firestore: Database for video metadata
- Authentication: Admin user verification

## Future Enhancements

### Recommended Improvements
1. **Webhook Integration**: Replace polling with Mux webhooks for faster asset processing
2. **Batch Upload**: Allow multiple video uploads at once
3. **Mux Asset Cleanup**: Delete Mux assets when videos are deleted from Firestore
4. **Video Preview**: Add video playback in edit modal
5. **Bulk Operations**: Select multiple videos for batch status changes or deletion
6. **Advanced Analytics**: Integrate Mux Data API for detailed viewing statistics
7. **Subtitle Support**: Add subtitle/caption upload and management
8. **Video Transcoding**: Configure custom video resolutions and formats
9. **Search Enhancement**: Full-text search using Algolia or similar
10. **Version History**: Track video edits and allow rollback

## Troubleshooting

### Video Upload Fails
- Check Mux credentials in `/lib/mux.ts`
- Verify file size is under 5GB
- Check network connectivity
- Review Mux dashboard for errors

### Drag and Drop Not Working
- Ensure table has data
- Check browser console for errors
- Verify dnd-kit packages are installed

### Videos Not Appearing
- Check Firestore rules
- Verify user has admin privileges
- Check browser console for Firestore errors

### Thumbnail Not Loading
- Verify Mux playback ID is correct
- Check Mux asset status (must be 'ready')
- Inspect thumbnail URL in browser

## Support
For issues with Mux, visit: https://docs.mux.com/
For Firebase issues, visit: https://firebase.google.com/docs
