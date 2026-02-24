import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  documentId,
  writeBatch,
} from "firebase/firestore";
import { db, COLLECTIONS } from "./firestore";
import type {
  User,
  UserWeight,
  UserObjective,
  Video,
  UserVideoProgress,
  JournalEntry,
  Course,
  CourseSection,
  CourseItem,
  CourseItemType,
  SessionAvailability,
  UserType,
  ObjectiveStatus,
  CourseAccessLevel,
  CourseStatus,
  Meditation,
} from "./firestore-schema";

/**
 * User Management Functions
 */

// Create a new user profile (called after Firebase Auth registration)
export async function createUserProfile(
  userId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);

  const userData: Omit<User, "registration_date"> & { registration_date: ReturnType<typeof serverTimestamp> } = {
    user_id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
    registration_date: serverTimestamp(),
    is_admin: false,
    user_type: "base",  // New users start with base plan
  };

  await setDoc(userRef, userData);
}

// Update user profile with registration details
export async function updateUserRegistrationDetails(
  userId: string,
  details: {
    first_name?: string;
    last_name?: string;
    age: number;
    height: number;
    weight: number;
    gender: "male" | "female" | "other" | "prefer_not_to_say";
  }
): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, details);
}

// Get user profile
export async function getUserProfile(userId: string): Promise<User | null> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      ...data,
      registration_date: data.registration_date?.toDate() || new Date(),
    } as User;
  }

  return null;
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<User, "user_id" | "email" | "registration_date" | "is_admin">>
): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, updates);
}

// Admin function: Update user type
export async function updateUserType(userId: string, userType: UserType): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, { user_type: userType });
}

// Admin function: Set user as admin
export async function setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, { is_admin: isAdmin });
}

// Admin function: Update a specific user field
export async function updateUserField(userId: string, field: string, value: unknown): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, { [field]: value });
}

// Admin function: Update user email
export async function updateUserEmail(userId: string, newEmail: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, { email: newEmail });
}

// Admin function: Get all users
export async function getAllUsers(): Promise<User[]> {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const querySnapshot = await getDocs(usersRef);

  return querySnapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    const registrationTimestamp = data.registration_date ?? data.date_added;

    return {
      ...data,
      user_id: docSnapshot.id, // Ensure doc ID is included
      id: docSnapshot.id, // Also include as 'id' for compatibility
      registration_date: registrationTimestamp?.toDate?.() || new Date(),
    } as User & { id: string };
  });
}


/**
 * Coach Management Functions
 */

// Get all users who are coaches
export async function getCoachUsers(): Promise<User[]> {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const q = query(usersRef, where("isCoach", "==", true));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      ...data,
      user_id: docSnapshot.id, // Ensure doc ID is included
      id: docSnapshot.id, // Also include as 'id' for compatibility
      registration_date: data.registration_date?.toDate?.() || new Date(),
    } as User & { id: string };
  });
}


// Get users assigned to a specific coach
export async function getUsersByCoach(coachId: string): Promise<User[]> {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const q = query(usersRef, where("assignedCoaches", "array-contains", coachId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      ...data,
      user_id: docSnapshot.id, // Ensure doc ID is included
      id: docSnapshot.id, // Also include as 'id' for compatibility
      registration_date: data.registration_date?.toDate?.() || new Date(),
    } as User & { id: string };
  });
}


// Assign a coach to a user
export async function assignCoachToUser(userId: string, coachId: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    assignedCoaches: arrayUnion(coachId),
  });
}

// Remove a coach from a user
export async function removeCoachFromUser(userId: string, coachId: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    assignedCoaches: arrayRemove(coachId),
  });
}

// Get coaches assigned to a specific user
export async function getCoachesForUser(userId: string): Promise<User[]> {
  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile?.assignedCoaches || userProfile.assignedCoaches.length === 0) {
      return [];
    }

    // Fetch all coach profiles
    // We use Promise.allSettled to handle potential failures (e.g. permission errors) gracefully
    const coachPromises = userProfile.assignedCoaches.map(coachId => getUserProfile(coachId));
    const results = await Promise.allSettled(coachPromises);

    // Filter fulfilled promises and non-null user profiles
    const coaches = results
      .filter((result): result is PromiseFulfilledResult<User | null> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter((user): user is User => user !== null);

    return coaches;
  } catch (error) {
    console.error("Error fetching coaches for user:", error);
    return [];
  }
}

// Get availability rules for a specific coach
export async function getCoachAvailability(coachId: string): Promise<SessionAvailability[]> {
  try {
    const availabilityRef = collection(db, COLLECTIONS.SESSIONS_AVAILABILITY);
    const q = query(availabilityRef, where("user_id", "==", coachId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      start_date: doc.data().start_date?.toDate(),
      end_date: doc.data().end_date?.toDate(),
      created_at: doc.data().created_at?.toDate(),
    })) as SessionAvailability[];
  } catch (error) {
    console.error("Error fetching coach availability:", error);
    return [];
  }
}


// Update all coaches for a user (replace entire array)
export async function updateUserCoaches(userId: string, coachIds: string[]): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, { assignedCoaches: coachIds });
}

/**
 * Weight Management Functions
 */

// Add weight log
export async function addWeightLog(userId: string, weight: number, date?: Date): Promise<string> {
  const weightsRef = collection(db, COLLECTIONS.USER_WEIGHTS);

  const weightData: Omit<UserWeight, "id" | "date"> & { date: Timestamp } = {
    user_id: userId,
    weight,
    date: date ? Timestamp.fromDate(date) : Timestamp.now(),
  };

  const docRef = await addDoc(weightsRef, weightData);
  return docRef.id;
}

// Get user's weight logs
export async function getUserWeightLogs(userId: string): Promise<UserWeight[]> {
  const weightsRef = collection(db, COLLECTIONS.USER_WEIGHTS);
  const q = query(
    weightsRef,
    where("user_id", "==", userId),
    orderBy("date", "desc")
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      user_id: data.user_id,
      weight: data.weight,
      date: data.date?.toDate() || new Date(),
    };
  });
}

// Update weight log
export async function updateWeightLog(
  weightId: string,
  updates: Partial<Pick<UserWeight, "weight" | "date">>
): Promise<void> {
  const weightRef = doc(db, COLLECTIONS.USER_WEIGHTS, weightId);
  const updateData: Record<string, unknown> = {};

  if (updates.weight !== undefined) {
    updateData.weight = updates.weight;
  }
  if (updates.date !== undefined) {
    updateData.date = Timestamp.fromDate(updates.date);
  }

  await updateDoc(weightRef, updateData);
}

// Delete weight log
export async function deleteWeightLog(weightId: string): Promise<void> {
  const weightRef = doc(db, COLLECTIONS.USER_WEIGHTS, weightId);
  await deleteDoc(weightRef);
}

/**
 * Objectives Management Functions
 */

// Add objective
export async function addObjective(
  userId: string,
  objective: string,
  status: ObjectiveStatus = "in_progress"
): Promise<string> {
  const objectivesRef = collection(db, COLLECTIONS.USER_OBJECTIVES);

  const objectiveData: Omit<UserObjective, "id" | "date_added"> & { date_added: ReturnType<typeof serverTimestamp> } = {
    user_id: userId,
    objective,
    status,
    date_added: serverTimestamp(),
  };

  const docRef = await addDoc(objectivesRef, objectiveData);
  return docRef.id;
}

// Get user's objectives
export async function getUserObjectives(userId: string, statusFilter?: ObjectiveStatus): Promise<UserObjective[]> {
  const objectivesRef = collection(db, COLLECTIONS.USER_OBJECTIVES);

  let q = query(
    objectivesRef,
    where("user_id", "==", userId),
    orderBy("date_added", "desc")
  );

  if (statusFilter) {
    q = query(
      objectivesRef,
      where("user_id", "==", userId),
      where("status", "==", statusFilter),
      orderBy("date_added", "desc")
    );
  }

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      user_id: data.user_id,
      objective: data.objective,
      status: data.status,
      date_added: data.date_added?.toDate() || new Date(),
    };
  });
}

// Update objective
export async function updateObjective(
  objectiveId: string,
  updates: Partial<Pick<UserObjective, "objective" | "status">>
): Promise<void> {
  const objectiveRef = doc(db, COLLECTIONS.USER_OBJECTIVES, objectiveId);
  await updateDoc(objectiveRef, updates);
}

// Mark objective as completed
export async function completeObjective(objectiveId: string): Promise<void> {
  const objectiveRef = doc(db, COLLECTIONS.USER_OBJECTIVES, objectiveId);
  await updateDoc(objectiveRef, { status: "completed" });
}

// Delete objective
export async function deleteObjective(objectiveId: string): Promise<void> {
  const objectiveRef = doc(db, COLLECTIONS.USER_OBJECTIVES, objectiveId);
  await deleteDoc(objectiveRef);
}

/**
 * Course Management Functions
 */

// Create a new course
export async function createCourse(
  title: string,
  accessLevel: CourseAccessLevel,
  status: CourseStatus,
  createdBy: string,
  thumbnailUrl?: string,
  introVideoUrl?: string
): Promise<string> {
  const coursesRef = collection(db, COLLECTIONS.COURSES);

  const courseData: Omit<Course, "id" | "created_at"> & { created_at: ReturnType<typeof serverTimestamp> } = {
    title,
    access_level: accessLevel,
    status,
    created_by: createdBy,
    created_at: serverTimestamp(),
    ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
    ...(introVideoUrl ? { intro_video_url: introVideoUrl } : {}),
  };

  const docRef = await addDoc(coursesRef, courseData);
  return docRef.id;
}

// Get all courses
export async function getAllCourses(): Promise<Course[]> {
  const coursesRef = collection(db, COLLECTIONS.COURSES);
  const q = query(coursesRef, orderBy("created_at", "desc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      title: data.title,
      access_level: data.access_level,
      status: data.status,
      created_at: data.created_at?.toDate() || new Date(),
      created_by: data.created_by,
      thumbnail_url: data.thumbnail_url,
      intro_video_url: data.intro_video_url,
    } as Course;
  });
}

// Update a course
export async function updateCourse(
  courseId: string,
  updates: Partial<Pick<Course, "title" | "access_level" | "status" | "thumbnail_url" | "intro_video_url">>
): Promise<void> {
  const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
  await updateDoc(courseRef, updates);
}

// Delete a course
export async function deleteCourse(courseId: string): Promise<void> {
  const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
  await deleteDoc(courseRef);
}

// Assign a restricted course to a user
export async function assignCourseToUser(userId: string, courseId: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    course_access: arrayUnion(courseId),
  });
}

// Remove a restricted course from a user
export async function removeCourseFromUser(userId: string, courseId: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    course_access: arrayRemove(courseId),
  });
}

// Get users with access to a specific course
export async function getUsersWithCourseAccess(courseId: string): Promise<User[]> {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const q = query(usersRef, where("course_access", "array-contains", courseId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      ...data,
      registration_date: data.registration_date?.toDate() || new Date(),
    } as User;
  });
}

/**
 * Course Section Management Functions
 */

// Create a course section
export async function createCourseSection(
  courseId: string,
  title: string,
  order: number
): Promise<string> {
  const sectionsRef = collection(db, COLLECTIONS.COURSE_SECTIONS);

  const sectionData: Omit<CourseSection, "id" | "created_at"> & { created_at: ReturnType<typeof serverTimestamp> } = {
    course_id: courseId,
    title,
    order,
    created_at: serverTimestamp(),
  };

  const docRef = await addDoc(sectionsRef, sectionData);
  return docRef.id;
}

// Get all sections for a course
export async function getCourseSections(courseId: string): Promise<CourseSection[]> {
  const sectionsRef = collection(db, COLLECTIONS.COURSE_SECTIONS);
  const q = query(
    sectionsRef,
    where("course_id", "==", courseId),
    orderBy("order", "asc")
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      course_id: data.course_id,
      title: data.title,
      order: data.order,
      created_at: data.created_at?.toDate() || new Date(),
    } as CourseSection;
  });
}

// Update a course section
export async function updateCourseSection(
  sectionId: string,
  updates: Partial<Pick<CourseSection, "title" | "order">>
): Promise<void> {
  const sectionRef = doc(db, COLLECTIONS.COURSE_SECTIONS, sectionId);
  await updateDoc(sectionRef, updates);
}

// Delete a course section and all its items
export async function deleteCourseSection(sectionId: string): Promise<void> {
  // First delete all items in this section
  const itemsRef = collection(db, COLLECTIONS.COURSE_ITEMS);
  const q = query(itemsRef, where("section_id", "==", sectionId));
  const itemsSnapshot = await getDocs(q);

  const batch = writeBatch(db);
  itemsSnapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref);
  });

  // Delete the section
  const sectionRef = doc(db, COLLECTIONS.COURSE_SECTIONS, sectionId);
  batch.delete(sectionRef);

  await batch.commit();
}

// Reorder course sections
export async function reorderCourseSections(
  courseId: string,
  orderedIds: string[]
): Promise<void> {
  const batch = writeBatch(db);

  orderedIds.forEach((id, index) => {
    const sectionRef = doc(db, COLLECTIONS.COURSE_SECTIONS, id);
    batch.update(sectionRef, { order: index });
  });

  await batch.commit();
}

/**
 * Course Item Management Functions
 */

// Create a course item
export async function createCourseItem(
  sectionId: string,
  courseId: string,
  title: string,
  type: CourseItemType,
  fileUrl: string,
  muxData?: { playbackId: string; assetId: string }
): Promise<string> {
  // Get current max order for items in this section
  const itemsRef = collection(db, COLLECTIONS.COURSE_ITEMS);
  const q = query(itemsRef, where("section_id", "==", sectionId));
  const existingItems = await getDocs(q);
  const maxOrder = existingItems.docs.length > 0
    ? Math.max(...existingItems.docs.map(d => d.data().order || 0))
    : -1;

  // Build item data, only including mux fields if they exist
  const itemData: Record<string, unknown> = {
    section_id: sectionId,
    course_id: courseId,
    title,
    type,
    file_url: fileUrl,
    order: maxOrder + 1,
    created_at: serverTimestamp(),
  };

  // Only add mux fields for video type
  if (muxData) {
    itemData.mux_playback_id = muxData.playbackId;
    itemData.mux_asset_id = muxData.assetId;
  }

  const docRef = await addDoc(itemsRef, itemData);
  return docRef.id;
}

// Get all items for a section
export async function getCourseItems(sectionId: string): Promise<CourseItem[]> {
  const itemsRef = collection(db, COLLECTIONS.COURSE_ITEMS);
  const q = query(
    itemsRef,
    where("section_id", "==", sectionId),
    orderBy("order", "asc")
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      section_id: data.section_id,
      course_id: data.course_id,
      title: data.title,
      type: data.type,
      file_url: data.file_url,
      mux_playback_id: data.mux_playback_id,
      mux_asset_id: data.mux_asset_id,
      order: data.order,
      created_at: data.created_at?.toDate() || new Date(),
    } as CourseItem;
  });
}

// Get all items for a course
export async function getAllCourseItems(courseId: string): Promise<CourseItem[]> {
  const itemsRef = collection(db, COLLECTIONS.COURSE_ITEMS);
  const q = query(
    itemsRef,
    where("course_id", "==", courseId),
    orderBy("order", "asc")
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      section_id: data.section_id,
      course_id: data.course_id,
      title: data.title,
      type: data.type,
      file_url: data.file_url,
      mux_playback_id: data.mux_playback_id,
      mux_asset_id: data.mux_asset_id,
      order: data.order,
      created_at: data.created_at?.toDate() || new Date(),
    } as CourseItem;
  });
}

// Update a course item
export async function updateCourseItem(
  itemId: string,
  updates: Partial<Pick<CourseItem, "title" | "order">>
): Promise<void> {
  const itemRef = doc(db, COLLECTIONS.COURSE_ITEMS, itemId);
  await updateDoc(itemRef, updates);
}

// Delete a course item
export async function deleteCourseItem(itemId: string): Promise<void> {
  const itemRef = doc(db, COLLECTIONS.COURSE_ITEMS, itemId);
  await deleteDoc(itemRef);
}

// Reorder course items within a section
export async function reorderCourseItems(
  sectionId: string,
  orderedIds: string[]
): Promise<void> {
  const batch = writeBatch(db);

  orderedIds.forEach((id, index) => {
    const itemRef = doc(db, COLLECTIONS.COURSE_ITEMS, id);
    batch.update(itemRef, { order: index });
  });

  await batch.commit();
}

/**
 * Meditation Management Functions
 */

export const getMeditations = async (): Promise<Meditation[]> => {
  const q = query(collection(db, COLLECTIONS.MEDITATIONS), orderBy("created_at", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    created_at: doc.data().created_at?.toDate() || new Date(),
  } as Meditation));
};

export const createMeditation = async (title: string, fileUrl: string, userId: string, duration?: number): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTIONS.MEDITATIONS), {
    title,
    file_url: fileUrl,
    duration: duration || 0,
    created_by: userId,
    created_at: serverTimestamp(),
  });
  return docRef.id;
};

export const deleteMeditation = async (meditationId: string) => {
  await deleteDoc(doc(db, COLLECTIONS.MEDITATIONS, meditationId));
};
