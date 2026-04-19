let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;
let tokenPromise: Promise<string | null> | null = null;

/**
 * Common helper to get a fresh access token from the local OAuth proxy.
 * Deduplicates concurrent calls so only one network request is in-flight at a time.
 */
export async function getAccessToken(): Promise<string | null> {
    // Check if we have a valid cached token
    if (cachedAccessToken && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }

    // Deduplicate: if a request is already in-flight, wait for it
    if (tokenPromise) {
        return tokenPromise;
    }

    tokenPromise = (async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch('/api/token', { signal: controller.signal });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 401) {
                    return null;
                }
                throw new Error(`Proxy error: ${response.status}`);
            }

            const data = await response.json();
            if (!data.access_token) return null;

            cachedAccessToken = data.access_token;
            tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
            return cachedAccessToken;
        } catch {
            return null;
        } finally {
            tokenPromise = null;
        }
    })();

    return tokenPromise;
}