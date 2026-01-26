import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function formatPrivateKey(key: string) {
    return key.replace(/\\n/g, "\n");
}

export function createFirebaseAdminApp(): App {
    const apps = getApps();
    if (apps.length > 0) {
        return apps[0];
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
        // If provided as a JSON string (e.g. in Vercel env vars)
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            return initializeApp({
                credential: cert(serviceAccount),
            });
        } catch (error) {
            console.error("Firebase admin initialization error: Invalid JSON in FIREBASE_SERVICE_ACCOUNT_KEY", error);
        }
    }

    // Fallback to individual env vars
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
        return initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey: formatPrivateKey(privateKey),
            }),
        });
    }

    // If no credentials found, throw error or initialize default (for local dev if using GOOGLE_APPLICATION_CREDENTIALS)
    // But for this use case we typically need explicit credentials.
    throw new Error("Missing Firebase Admin credentials. Please set FIREBASE_SERVICE_ACCOUNT_KEY or individual vars.");
}

export const adminAuth = () => {
    const app = createFirebaseAdminApp();
    return getAuth(app);
};

export const adminDb = () => {
    const app = createFirebaseAdminApp();
    return getFirestore(app);
};
