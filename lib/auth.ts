import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions, Account, Profile, User } from "next-auth"
import type { JWT } from "next-auth/jwt"

export const authOptions: NextAuthOptions = {
  debug: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: { token: JWT; account: Account | null; user: User | undefined }) {
      // console.log("JWT Callback:", { account: !!account, user: !!user, token: !!token })
      if (account) {
        // console.log("Account provider:", account.provider)
        // console.log("Account has access_token:", !!account.access_token)
        // console.log("Account has refresh_token:", !!account.refresh_token)
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }: { session: any; token: JWT }) {
      // console.log("Session Callback:", { session: !!session, token: !!token })
      // console.log("Token has accessToken:", !!token.accessToken)
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      return session
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // console.log("Redirect Callback:", { url, baseUrl })
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async signIn({ user, account, profile }: { user: User | undefined; account: Account | null; profile?: Profile }) {
      // console.log("SignIn Callback:", {
      //   user: user?.email,
      //   account: account?.provider,
      //   profile: profile?.email
      // })

      try {
        // Save user to database on successful sign in
        if (user?.email) {
          const { DatabaseService } = await import("@/lib/database")
          const dbUser = await DatabaseService.findOrCreateUser(
            user.email,
            user.image || undefined
          )
          // console.log("User saved/found in database:", dbUser.email)
        }
      } catch (error) {
        console.error("Error saving user to database:", error)
        // Don't block sign in if database operation fails
      }

      return true
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
