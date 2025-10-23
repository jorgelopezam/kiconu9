# Firestore Database Schema & Security Rules

## Database Structure

### Collections

#### 1. `users` Collection
Main user profile collection.

**Document ID**: User's Firebase Auth UID

**Fields**:
- `user_id` (string): Firebase Auth UID
- `email` (string): User's email address
- `first_name` (string): User's first name
- `last_name` (string): User's last name
- `height` (number): User's height in centimeters
- `date_added` (timestamp): Account creation date
- `is_admin` (boolean): Whether user has admin privileges
- `user_type` (string): One of `"base"`, `"paid"`, or `"kiconu"`

**User Types**:
- **Admin User**: `is_admin = true` (can access all data)
- **Normal Users**: `is_admin = false`
  - **Base**: Free tier user (default for new registrations)
  - **Paid**: Paying subscriber
  - **Kiconu**: Premium tier user

---

#### 2. `user_weights` Collection
Weight tracking logs for users.

**Document ID**: Auto-generated

**Fields**:
- `user_id` (string): Reference to user's UID
- `date` (timestamp): Date of weight measurement
- `weight` (number): Weight in kilograms

---

#### 3. `user_objectives` Collection
User goals and objectives tracking.

**Document ID**: Auto-generated

**Fields**:
- `user_id` (string): Reference to user's UID
- `date_added` (timestamp): When objective was created
- `objective` (string): Description of the goal
- `status` (string): Either `"in_progress"` or `"completed"`

---

## Security Rules

### Access Control

**Admin Users** (`is_admin = true`):
- ✅ Read all users' data
- ✅ Update any user's profile (including user_type and is_admin)
- ✅ Delete users
- ✅ Read/write all weight logs
- ✅ Read/write all objectives

**Normal Users** (`is_admin = false`):
- ✅ Read only their own data
- ✅ Update their own profile (cannot change is_admin or user_type)
- ✅ Create/read/update/delete only their own weight logs
- ✅ Create/read/update/delete only their own objectives
- ❌ Cannot access other users' data

### New User Registration
When a user registers:
- Automatically created as `is_admin = false`
- Automatically assigned `user_type = "base"`
- Cannot self-assign admin privileges
- Cannot choose their user_type during registration

---

## Deployment Instructions

### 1. Deploy Firestore Security Rules

**Option A: Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `kiconu-app`
3. Navigate to **Firestore Database** > **Rules**
4. Copy the contents of `firestore.rules` and paste into the editor
5. Click **Publish**

**Option B: Firebase CLI**
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not done)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

### 2. Create Indexes (if needed)

For querying objectives by status, you may need a composite index:

```bash
firebase firestore:indexes
```

Or create manually in Firebase Console:
- Collection: `user_objectives`
- Fields: `user_id` (Ascending), `status` (Ascending), `date_added` (Descending)

---

## Usage Examples

### Create User Profile After Registration
```typescript
import { createUserProfile } from "@/lib/firestore-helpers";

// In your registration handler
await createUserProfile(
  user.uid,
  user.email!,
  "John",
  "Doe",
  175 // height in cm (optional)
);
```

### Add Weight Log
```typescript
import { addWeightLog } from "@/lib/firestore-helpers";

await addWeightLog(userId, 75.5); // weight in kg
```

### Get User's Weight History
```typescript
import { getUserWeightLogs } from "@/lib/firestore-helpers";

const weights = await getUserWeightLogs(userId);
```

### Add Objective
```typescript
import { addObjective } from "@/lib/firestore-helpers";

await addObjective(userId, "Lose 5kg in 3 months");
```

### Get User's Objectives
```typescript
import { getUserObjectives } from "@/lib/firestore-helpers";

// Get all objectives
const allObjectives = await getUserObjectives(userId);

// Get only in-progress objectives
const activeObjectives = await getUserObjectives(userId, "in_progress");
```

### Admin: Update User Type
```typescript
import { updateUserType } from "@/lib/firestore-helpers";

// Upgrade user to paid
await updateUserType(userId, "paid");
```

---

## Files Created

1. **`lib/firestore-schema.ts`** - TypeScript types and schema definitions
2. **`lib/firestore.ts`** - Firestore initialization
3. **`lib/firestore-helpers.ts`** - Helper functions for CRUD operations
4. **`firestore.rules`** - Security rules for Firestore

---

## Next Steps

1. Deploy the security rules to Firebase
2. Update the registration flow to create user profiles
3. Build UI components for weight tracking and objectives
4. Add admin dashboard features to manage users
