// /lib/gcp/firestore.ts
// Singleton pattern for Firebase Admin + Firestore
// Uses globalThis to persist across Next.js hot reloads

import admin from "firebase-admin";

// Use globalThis to survive hot module reloading in Next.js dev mode
const globalForFirebase = globalThis as unknown as {
    _firebaseApp: admin.app.App | undefined;
    _firestore: FirebaseFirestore.Firestore | undefined;
    _firestoreSettingsApplied: boolean | undefined;
};

function isEmulatorMode(): boolean {
    return !!process.env.FIRESTORE_EMULATOR_HOST;
}

function getProjectId(): string {
    const projectId =
        process.env.GCP_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        process.env.FIREBASE_PROJECT_ID;

    if (!projectId) {
        throw new Error(
            "Missing GCP_PROJECT environment variable. " +
                "Set GCP_PROJECT in .env.local for local dev or in your deployment environment."
        );
    }
    return projectId;
}

function getCredential(): admin.credential.Credential | undefined {
    // EMULATOR MODE: No credentials needed - return undefined
    // Firebase Admin SDK will skip credential validation when connecting to emulator
    if (isEmulatorMode()) {
        return undefined as unknown as admin.credential.Credential;
    }

    // Production: Use service account JSON if provided
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (serviceAccountJson) {
        try {
            const serviceAccount = JSON.parse(serviceAccountJson);
            return admin.credential.cert(serviceAccount);
        } catch {
            throw new Error("Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON: must be valid JSON");
        }
    }

    // Fallback: Application Default Credentials (works on GCP, Cloud Run, etc.)
    return admin.credential.applicationDefault();
}

export function getFirebaseAdminApp(): admin.app.App {
    if (globalForFirebase._firebaseApp) {
        return globalForFirebase._firebaseApp;
    }

    if (admin.apps.length) {
        globalForFirebase._firebaseApp = admin.app();
        return globalForFirebase._firebaseApp;
    }

    const projectId = getProjectId();
    const credential = getCredential();

    // For emulator mode, initialize without credential
    const initOptions: admin.AppOptions = { projectId };
    if (credential) {
        initOptions.credential = credential;
    }

    globalForFirebase._firebaseApp = admin.initializeApp(initOptions);

    return globalForFirebase._firebaseApp;
}

export function getFirestore(): FirebaseFirestore.Firestore {
    if (globalForFirebase._firestore) {
        return globalForFirebase._firestore;
    }

    const app = getFirebaseAdminApp();
    const db = admin.firestore(app);

    // Only call settings() once, ever - track with a separate flag
    if (!globalForFirebase._firestoreSettingsApplied) {
        db.settings({ ignoreUndefinedProperties: true });
        globalForFirebase._firestoreSettingsApplied = true;
    }

    globalForFirebase._firestore = db;
    return db;
}