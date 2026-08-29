import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const OWNER_EMAIL = process.env.OWNER_EMAIL?.toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    }),
  ],
  callbacks: {
    // First sign-in: upsert the app User and resolve its role. OWNER_EMAIL wins.
    async jwt({ token, user }) {
      if (user?.email) {
        const email = user.email.toLowerCase();
        const isOwner = email === OWNER_EMAIL;
        const dbUser = await prisma.user.upsert({
          where: { email },
          update: isOwner ? { role: "OWNER", name: user.name } : { name: user.name },
          create: { email, name: user.name, role: isOwner ? "OWNER" : "USER" },
        });
        token.uid = dbUser.id;
        token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
