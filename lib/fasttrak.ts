import { config } from '@/lib/config';

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

export type FastTrakRegisterResp = {
    id: string; // FastTrak user ID
    username: string;
    message: string;
}

const FT_BASE = config.fastTrakApi;

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

/**
 * Registers a new user in the FastTrak system
 * 
 * @param username - Unique username for the new user
 * @param password - User password (will be hashed by FastTrak)
 * @param email - User email address
 * @param name - User's full name
 * @returns FastTrak registration response with user ID
 * @throws Error if registration fails or FastTrak API is unreachable
 * 
 * @example
 * ```typescript
 * const response = await registerFastTrakUser('john.doe', 'SecureP@ss123', 'john@example.com', 'John Doe');
 * console.log(response.id); // FastTrak user ID
 * ```
 */
export async function registerFastTrakUser(
    username: string,
    password: string,
    email: string,
    name: string
): Promise<FastTrakRegisterResp> {
    try {
        const res = await fetch(`${FT_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, email, name }),
            next: { revalidate: 0 },
        });

        if (!res.ok) {
            const errorText = await res.text();
            let errorMessage = `Failed to register user: ${res.status} ${res.statusText}`;
            
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.message) {
                    errorMessage = errorJson.message;
                }
            } catch {
                // Error response not JSON
            }
            
            throw new Error(errorMessage);
        }

        const responseText = await res.text();
        
        try {
            const registerResponse = JSON.parse(responseText);
            return registerResponse;
        } catch {
            throw new Error('FastTrak register API returned invalid JSON response');
        }
    } catch (error) {
        // Check if this is a network error (FastTrak API not running)
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Unable to connect to FastTrak API for registration. Please ensure the FastTrak service is running on ' + FT_BASE);
        }
        
        throw error;
    }
}