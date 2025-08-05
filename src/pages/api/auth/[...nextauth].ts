import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("NextAuth authorize called with:", credentials?.email);
          
          if (!credentials?.email || !credentials?.password) {
            console.log("Missing credentials");
            return null;
          }
          
          const user = await prisma.user.findUnique({ 
            where: { email: credentials.email } 
          });
          console.log("User found:", user ? "Yes" : "No");
          
          if (!user || !user.password) {
            console.log("User not found or no password");
            return null;
          }
          
          const isValid = await compare(credentials.password, user.password);
          console.log("Password valid:", isValid);
          
          if (!isValid) return null;
          
          console.log("Returning user:", { id: user.id, email: user.email, role: user.role });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("NextAuth authorize error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = (token as any).role;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        (token as any).role = (user as any).role;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions); 