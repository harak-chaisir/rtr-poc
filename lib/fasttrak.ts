export type FastTrakAuthResp = {
    id: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpirationSeconds: number;
    refreshTokenExpiratinSeconds: number; // Note: API has typo in "Expiration"
    roles: string[];
}

export type FastTrakRefreshResp = {
    accessToken: string;
    refreshToken?: string;
    accessTokenExpirationSeconds: number;
    refreshTokenExpirationSeconds: number;
}

const FT_BASE = process.env.FASTTRAK_API || 'http://localhost:3001';

/**
 * Authenticates a user with the FastTrak API
 * 
 * @param username - FastTrak username
 * @param password - User password
 * @returns FastTrak authentication response with tokens, user ID, and roles
 * @throws Error if authentication fails or FastTrak API is unreachable
 * 
 * @example
 * ```typescript
 * const response = await authenticateFastTrak('user123', 'password');
 * console.log(response.accessToken, response.roles);
 * ```
 */
export async function authenticateFastTrak(username: string, password: string): Promise<FastTrakAuthResp> {
    try {
        const res = await fetch(`${FT_BASE}/authenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            next: { revalidate: 0 },
        });

        if (!res.ok) {
            throw new Error(`Failed to authenticate: ${res.status} ${res.statusText}`);
        }

                // Try to get response text first to handle potential content-type issues
        const responseText = await res.text();
        
        // Clean the response by removing any leading comments (FastTrak API sometimes includes comments)
        const cleanedResponse = responseText.replace(/^\/\/.*$/gm, '').trim();
        
        try {
            const jsonResponse = JSON.parse(cleanedResponse);
            return jsonResponse;
        } catch {
            throw new Error('FastTrak API returned invalid JSON response');
        }
    } catch (error) {
        // Check if this is a network error (FastTrak API not running)
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Unable to connect to FastTrak API. Please ensure the FastTrak service is running on ' + FT_BASE);
        }
        
        throw error;
    }
}

/**
 * Refreshes an expired FastTrak access token using a refresh token
 * 
 * @param fasttrakId - The user's FastTrak ID
 * @param refreshToken - Valid refresh token
 * @returns New access token and optionally a new refresh token
 * @throws Error if token refresh fails or FastTrak API is unreachable
 * 
 * @example
 * ```typescript
 * const response = await refreshFastTrakToken('user-id-123', 'refresh-token-xyz');
 * console.log(response.accessToken);
 * ```
 */
export async function refreshFastTrakToken(fasttrakId: string, refreshToken: string): Promise<FastTrakRefreshResp> {
    try {
        const res = await fetch(`${FT_BASE}/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshToken}`
            },
            body: JSON.stringify({ fasttrakId }),
            next: { revalidate: 0 }
        });

        if (!res.ok) {
            throw new Error(`Failed to refresh token: ${res.status} ${res.statusText}`);
        }

        const responseText = await res.text();
        
        try {
            const refreshResponse = JSON.parse(responseText);
            return refreshResponse;
        } catch {
            throw new Error('FastTrak refresh API returned invalid JSON response');
        }
    } catch (error) {
        // Check if this is a network error (FastTrak API not running)
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Unable to connect to FastTrak API for token refresh. Please ensure the FastTrak service is running on ' + FT_BASE);
        }
        
        throw error;
    }
}