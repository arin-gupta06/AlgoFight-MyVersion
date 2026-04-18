const crypto = require("crypto");

const FIREBASE_LOOKUP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:lookup";
const FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const DEFAULT_FIREBASE_PROJECT_ID = "algo-fight";
const FIREBASE_API_KEY_ENV_CANDIDATES = [
    "FIREBASE_API_KEY",
    "FIREBASE_WEB_API_KEY",
    "VITE_FIREBASE_API_KEY",
];
const FIREBASE_PROJECT_ID_ENV_CANDIDATES = [
    "FIREBASE_PROJECT_ID",
    "GOOGLE_CLOUD_PROJECT",
    "GCLOUD_PROJECT",
    "VITE_FIREBASE_PROJECT_ID",
];

let firebaseCertCache = {
    certs: null,
    expiresAt: 0,
};

function getFirebaseApiKey() {
    for (const envName of FIREBASE_API_KEY_ENV_CANDIDATES) {
        const value = process.env[envName];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

function getExplicitFirebaseProjectId() {
    for (const envName of FIREBASE_PROJECT_ID_ENV_CANDIDATES) {
        const value = process.env[envName];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

function getFirebaseProjectId() {
    return getExplicitFirebaseProjectId() || DEFAULT_FIREBASE_PROJECT_ID;
}

function isFirebaseAuthConfigured() {
    return Boolean(getFirebaseApiKey() || getExplicitFirebaseProjectId());
}

function parseMaxAgeSeconds(cacheControlValue) {
    if (!cacheControlValue || typeof cacheControlValue !== "string") {
        return 300;
    }

    const parts = cacheControlValue.split(",").map((part) => part.trim().toLowerCase());
    const maxAgePart = parts.find((part) => part.startsWith("max-age="));
    if (!maxAgePart) {
        return 300;
    }

    const parsed = Number(maxAgePart.split("=")[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
}

function decodeBase64Url(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4;
    const padded = padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
    return Buffer.from(padded, "base64");
}

function parseJwt(token) {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) {
        throw new Error("Malformed JWT");
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(decodeBase64Url(headerB64).toString("utf8"));
    const payload = JSON.parse(decodeBase64Url(payloadB64).toString("utf8"));

    return {
        header,
        payload,
        signingInput: `${headerB64}.${payloadB64}`,
        signature: decodeBase64Url(signatureB64),
    };
}

async function getFirebaseCerts() {
    const now = Date.now();
    if (firebaseCertCache.certs && firebaseCertCache.expiresAt > now) {
        return firebaseCertCache.certs;
    }

    const response = await fetch(FIREBASE_CERTS_URL, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload || typeof payload !== "object") {
        throw new Error("Unable to load Firebase certs");
    }

    const maxAgeSeconds = parseMaxAgeSeconds(response.headers.get("cache-control"));
    firebaseCertCache = {
        certs: payload,
        expiresAt: now + maxAgeSeconds * 1000,
    };

    return firebaseCertCache.certs;
}

function assertFirebaseClaims(payload, projectId) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const issuer = `https://securetoken.google.com/${projectId}`;

    if (!payload || typeof payload !== "object") {
        throw new Error("Invalid token payload");
    }
    if (payload.aud !== projectId) {
        throw new Error("Invalid token audience");
    }
    if (payload.iss !== issuer) {
        throw new Error("Invalid token issuer");
    }
    if (!payload.sub || typeof payload.sub !== "string") {
        throw new Error("Invalid token subject");
    }
    if (!Number.isFinite(Number(payload.exp)) || Number(payload.exp) <= nowSeconds) {
        throw new Error("Token expired");
    }
    if (Number.isFinite(Number(payload.iat)) && Number(payload.iat) > nowSeconds + 300) {
        throw new Error("Token issued in the future");
    }
}

function mapTokenClaimsToUser(claims) {
    return {
        uid: claims.user_id || claims.sub,
        email: claims.email || null,
        displayName: claims.name || null,
        photoURL: claims.picture || null,
    };
}

async function verifyFirebaseIdTokenViaLookup(idToken, apiKey) {
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
        const error = new Error(message);
        error.code = "FIREBASE_LOOKUP_FAILED";
        throw error;
    }

    const account = payload.users[0];
    return {
        uid: account.localId,
        email: account.email || null,
        displayName: account.displayName || null,
        photoURL: account.photoUrl || null,
    };
}

async function verifyFirebaseIdTokenViaCerts(idToken) {
    const projectId = getFirebaseProjectId();
    const { header, payload, signingInput, signature } = parseJwt(idToken);

    if (header?.alg !== "RS256") {
        throw new Error("Unsupported JWT algorithm");
    }
    if (!header?.kid) {
        throw new Error("Missing JWT key id");
    }

    const certs = await getFirebaseCerts();
    const cert = certs[header.kid];
    if (!cert) {
        throw new Error("Unknown Firebase signing key");
    }

    const isValidSignature = crypto.verify(
        "RSA-SHA256",
        Buffer.from(signingInput),
        cert,
        signature
    );

    if (!isValidSignature) {
        throw new Error("Invalid token signature");
    }

    assertFirebaseClaims(payload, projectId);
    return mapTokenClaimsToUser(payload);
}

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
    const apiKey = getFirebaseApiKey();

    if (apiKey) {
        try {
            return await verifyFirebaseIdTokenViaLookup(idToken, apiKey);
        } catch (error) {
            // Fall back to cert verification so auth still works when API key is missing/invalid.
        }
    }

    return verifyFirebaseIdTokenViaCerts(idToken);
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

    if (process.env.NODE_ENV !== "production" && !isFirebaseAuthConfigured()) {
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
    isFirebaseAuthConfigured,
    verifyFirebaseIdToken,
    requireFirebaseUser,
};
