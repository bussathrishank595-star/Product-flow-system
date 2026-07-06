import type { NextAuthConfig } from 'next-auth';

// Edge-safe auth config — no Node.js imports (no mongoose, no bcrypt)
// Used ONLY by middleware for JWT session checking
export const authConfig: NextAuthConfig = {
  providers: [], // providers only needed in the full auth.ts
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === '/login';
      const isApiAuth = nextUrl.pathname.startsWith('/api/auth');
      const isSetupApi = nextUrl.pathname === '/api/setup';

      // Always allow auth and setup endpoints
      if (isApiAuth || isSetupApi) return true;

      // Redirect unauthenticated users to login
      if (!isLoggedIn && !isLoginPage) return false;

      // Redirect logged-in users away from login
      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      return true;
    },
  },
  session: { strategy: 'jwt' },
};
