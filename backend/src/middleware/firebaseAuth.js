const FIREBASE_LOOKUP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:lookup";

function extractBearerToken(headerValue) {
    if (!headerValue || typeof headerValue !== "string") {
        return null;
    }

    const [scheme, token] = headerValue.split(" ");
    if (scheme !== "Bearer" || !token) {
        return null;
    }

    return token.trim();
}

function buildDevUser(req) {
    const fallbackUid = req.headers["x-dev-uid"] || req.body?.uid || req.params?.uid;
    if (!fallbackUid) {
        return null;
    }

    return {
        uid: String(fallbackUid),
        email: req.body?.email || null,
        displayName: req.body?.displayName || "Dev User",
    };
}

async function verifyFirebaseIdToken(idToken) {
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
        throw new Error("Firebase API key is not configured");
    }

    const response = await fetch(`${FIREBASE_LOOKUP_URL}?key=${apiKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload || !Array.isArray(payload.users) || payload.users.length === 0) {
        const message = payload?.error?.message || "Invalid Firebase token";
        throw new Error(message);
    }

    const account = payload.users[0];
    return {
        uid: account.localId,
        email: account.email || null,
        displayName: account.displayName || null,
        photoURL: account.photoUrl || null,
    };
}

async function requireFirebaseUser(req, res, next) {
    const token = extractBearerToken(req.headers.authorization);

    if (token) {
        try {
            req.firebaseUser = await verifyFirebaseIdToken(token);
            return next();
        } catch (error) {
            return res.status(401).json({ message: "Invalid or expired auth token" });
        }
    }

    if (process.env.NODE_ENV !== "production" && !process.env.FIREBASE_API_KEY) {
        const devUser = buildDevUser(req);
        if (devUser) {
            req.firebaseUser = devUser;
            return next();
        }
    }

    return res.status(401).json({ message: "Authentication required" });
}

module.exports = {
    extractBearerToken,
    verifyFirebaseIdToken,
    requireFirebaseUser,
};
