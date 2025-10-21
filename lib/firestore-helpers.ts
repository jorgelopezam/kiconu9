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
} from "firebase/firestore";
import { db, COLLECTIONS } from "./firestore";
import type { User, UserWeight, UserObjective, UserType, ObjectiveStatus } from "./firestore-schema";

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
    user_type: null,  // User needs to select a plan
  };

  await setDoc(userRef, userData);
}

// Update user profile with registration details
export async function updateUserRegistrationDetails(
  userId: string,
  details: {
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

// Admin function: Get all users
export async function getAllUsers(): Promise<User[]> {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const querySnapshot = await getDocs(usersRef);

  return querySnapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    const registrationTimestamp = data.registration_date ?? data.date_added;

    return {
      ...data,
      registration_date: registrationTimestamp?.toDate?.() || new Date(),
    } as User;
  });
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
