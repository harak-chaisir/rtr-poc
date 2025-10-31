import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDB } from "@/lib/db";
import { authenticateFastTrak, refreshFastTrakToken } from "@/lib/fasttrak";
import { RtrUser } from "@/lib/models/User";
import { decrypt, encrypt } from '@/lib/crypto';

// Constants
const SESSION_MAX_AGE = 60 * 60; // 60 minutes in seconds
const TOKEN_REFRESH_BUFFER_MS = 10 * 1000; // 10 seconds buffer before token expires

export const authOptions: AuthOptions = {
    providers:[
        CredentialsProvider({
            id: 'fasttrak',
            name: 'FastTrak',
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials) return null;
                
                try {
                    const fasttrak = await authenticateFastTrak(credentials.username, credentials.password);
                    await connectToDB();

                    // Calculate expiration timestamps from seconds
                    const now = Date.now();
                    const accessTokenExpiresAt = now + (fasttrak.accessTokenExpirationSeconds * 1000);
                    const refreshTokenExpiresAt = now + (fasttrak.refreshTokenExpiratinSeconds * 1000);

                    const user = await RtrUser.findOneAndUpdate(
                        {fasttrakId: fasttrak.id},
                        { 
                            $setOnInsert: { createdAt: new Date() }, 
                            $set: { 
                                lastSeen: new Date(),
                                roles: fasttrak.roles // Update roles from FastTrak response
                            } 
                        },
                        { upsert: true, new: true }
                    ).lean() as any;

                    if (!user) {
                        throw new Error('Failed to create or update user');
                    }

                    return {
                        id: user._id.toString(),
                        fasttrakId: fasttrak.id,
                        roles: fasttrak.roles || [], // Use roles from FastTrak response
                        name: user.name || null,
                        email: user.email || null,
                        _accessToken: fasttrak.accessToken,
                        _refreshToken: fasttrak.refreshToken,
                        _accessTokenExpiresAt: accessTokenExpiresAt,
                        _refreshTokenExpiresAt: refreshTokenExpiresAt
                    };
                } catch (error) {
                    return null;
                }
            }
        })
    ],
    session: { 
        strategy: 'jwt' as const,
        maxAge: SESSION_MAX_AGE
    },
    callbacks: {
        async jwt({ token, user }) {
            const now = Date.now();

            if (user) {
                token.rtrUserId = user.id;
                token.roles = user.roles;
                token.fasttrakId = user.fasttrakId;
                token.accessToken = user._accessToken;
                token.refreshToken = user._refreshToken;
                token.accessTokenExpiresAt = user._accessTokenExpiresAt;
                token.refreshTokenExpiresAt = user._refreshTokenExpiresAt;
                return token;
            }
            if (token.accessToken && token.accessTokenExpiresAt && now < token.accessTokenExpiresAt - TOKEN_REFRESH_BUFFER_MS) {
                // If the access token is still valid, return the token
                return token;
            }

            try {
                const encRefreshToken = token.refreshToken;

                if(!encRefreshToken || !token.fasttrakId) {
                    throw new Error('No refresh token or FastTrak ID available');  
                }
                const refreshToken = decrypt(encRefreshToken);
                const refreshed = await refreshFastTrakToken(token.fasttrakId, refreshToken);

                token.accessToken = refreshed.accessToken;
                token.accessTokenExpiresAt = now + (refreshed.accessTokenExpirationSeconds * 1000);
                token.refreshToken = encrypt(refreshed.refreshToken || refreshToken);
                token.refreshTokenExpiresAt = now + (refreshed.refreshTokenExpirationSeconds * 1000);
                return token;
            } catch (err) {
                delete token.accessToken;
                delete token.refreshToken;
                delete token.accessTokenExpiresAt;
                delete token.refreshTokenExpiresAt;
                token.error = 'RefreshAccessTokenError';
                return token;
            }
        },

        async session({ session, token }) {
            session.user = session.user || {};
            session.user.id = token.rtrUserId || '';
            session.user.roles = token.roles || [];
            session.accessToken = token.accessToken;
            session.error = token.error;
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };