import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const { userId, newPassword, adminUid } = await req.json();

        if (!userId || !newPassword || !adminUid) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify the requester is an admin in Firestore
        // Note: In a real production app, we should verify the ID token from headers to ensure the request comes from an authenticated admin.
        // For now, checking the adminUid against Firestore 'users' collection is a basic check, but it trusts the client to send the correct adminUid.
        // A better approach is to verify the Authorization header token.

        // Let's grab the token from header if possible, effectively replacing the trust in `adminUid` body param
        // However, for simplicity if the user context is not passed in header easily, we will do a token verification.

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth().verifyIdToken(token);

        // Check if the user is admin in Firestore
        const adminDoc = await adminDb().collection("users").doc(decodedToken.uid).get();

        if (!adminDoc.exists || !adminDoc.data()?.is_admin) {
            return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
        }

        // Validate password length
        if (newPassword.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        // Update password
        await adminAuth().updateUser(userId, {
            password: newPassword,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating password:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
