import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "./db";

const isProduction = process.env.NODE_ENV === "production";
const useSecureCookies =
  process.env.NEXTAUTH_URL?.startsWith("https://") ?? isProduction;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/signup",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        if (!process.env.DATABASE_URL) {
          console.error("Auth: DATABASE_URL is not set");
          return null;
        }

        if (!process.env.NEXTAUTH_SECRET) {
          console.error("Auth: NEXTAUTH_SECRET is not set");
          return null;
        }

        try {
          const email = credentials.email.toLowerCase().trim();

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            return null;
          }

          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.businessName,
            isAdmin: user.isAdmin,
            twoFactorEnabled: user.twoFactorEnabled,
          };
        } catch (err) {
          console.error("Auth authorize error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
        const twoFactorEnabled = (user as { twoFactorEnabled?: boolean }).twoFactorEnabled ?? false;
        token.twoFactorEnabled = twoFactorEnabled;
        token.twoFactorVerified = !twoFactorEnabled;
      }

      if (trigger === "update" && session?.twoFactorVerified === true) {
        token.twoFactorVerified = true;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.isAdmin = token.isAdmin === true;
        session.user.twoFactorEnabled = token.twoFactorEnabled === true;
        session.user.twoFactorVerified = token.twoFactorVerified !== false;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard/overview`;
    },
  },
  cookies: {
    sessionToken: {
      name: useSecureCookies
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.AUTH_DEBUG === "true",
};

export async function getSession() {
  return getServerSession(authOptions);
}

interface RequireUserOptions {
  requireTwoFactor?: boolean;
}

export async function requireUser(options: RequireUserOptions = {}) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  if (options.requireTwoFactor && session.user.twoFactorEnabled && !session.user.twoFactorVerified) {
    throw new Error("TwoFactorRequired");
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser({ requireTwoFactor: true });
  if (!user.isAdmin) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function requireTwoFactorVerified() {
  const user = await requireUser();
  if (user.twoFactorEnabled && !user.twoFactorVerified) {
    throw new Error("TwoFactorRequired");
  }
  return user;
}
