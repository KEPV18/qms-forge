
let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Common helper to get a fresh access token from the local OAuth proxy
 */
export async function getAccessToken(): Promise<string | null> {
    // Check if we have a valid cached token
    if (cachedAccessToken && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }

    try {
        // Use relative path for production (served by unified express server)
        // For local vite development, we might need the full URL if running on different ports
        const isDev = import.meta.env.DEV;
        const apiBase = isDev ? 'http://localhost:3001' : '';

        const response = await fetch(`${apiBase}/api/token`).catch(e => {
            console.error('DEBUG: OAuth API is not reachable.');
            throw new Error('OAuth API is not reachable. If running locally, please run RUN_LOCAL.bat.');
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.error('DEBUG: No refresh token found. User needs to authenticate.');
                return null;
            }
            throw new Error(`Proxy error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.access_token) return null;

        cachedAccessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
        return cachedAccessToken;
    } catch (error) {
        console.error('DEBUG: getAccessToken Error:', error);
        return null;
    }
}
