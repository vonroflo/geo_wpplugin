// /lib/gcp/firestore.ts
import admin from "firebase-admin";

let _app: admin.app.App | null = null;

export function getFirebaseAdminApp() {
    if (_app) return _app;

    if (!admin.apps.length) {
        _app = admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } else {
        _app = admin.app();
    }

    return _app;
}

export function getFirestore() {
    const app = getFirebaseAdminApp();
    const db = admin.firestore(app);
    db.settings({ ignoreUndefinedProperties: true });
    return db;
}