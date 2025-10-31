import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      roles: string[];
      name?: string | null;
      email?: string | null;
    } & DefaultSession["user"];
    accessToken?: string;
    error?: string;
  }

  interface User {
    id: string;
    fasttrakId: string;
    roles: string[];
    name?: string | null;
    email?: string | null;
    _accessToken: string;
    _refreshToken: string;
    _accessTokenExpiresAt: number;
    _refreshTokenExpiresAt: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rtrUserId?: string;
    fasttrakId?: string;
    roles?: string[];
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
    refreshTokenExpiresAt?: number;
    error?: string;
  }
}
