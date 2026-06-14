import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      isAdmin: boolean;
      twoFactorEnabled: boolean;
      twoFactorVerified: boolean;
    };
  }

  interface User {
    isAdmin?: boolean;
    twoFactorEnabled?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isAdmin?: boolean;
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
  }
}
