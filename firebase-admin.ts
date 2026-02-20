import {
    initializeApp,
    getApps,
    App,
    getApp,
    cert,
} from "firebase-admin/app"

import { getFirestore, Firestore } from "firebase-admin/firestore"

// THIS LETS US WRITE TO AND DELETE ANYTHING

let app: App;
let adminDb: Firestore;

function initFirebaseAdmin() {
    if (adminDb) return adminDb;
    const serviceKeyB64 = process.env.SERVICE_ACCOUNT_KEY_BASE64;
    if (!serviceKeyB64) throw new Error("SERVICE_ACCOUNT_KEY_BASE64 is required");
    const serviceKeyJson = Buffer.from(serviceKeyB64, "base64").toString("utf-8");
    const serviceKey = JSON.parse(serviceKeyJson);
    if (getApps().length === 0) {
        app = initializeApp({ credential: cert(serviceKey) });
    } else {
        app = getApp();
    }
    adminDb = getFirestore(app);
    return adminDb;
}

// Lazy init: skip during CI build (GitHub Actions sets CI=true) to avoid cert parse with placeholder key
if (process.env.CI !== "true") {
    initFirebaseAdmin();
} else {
    adminDb = null as unknown as Firestore;
}

export { app as adminApp };
export { adminDb };