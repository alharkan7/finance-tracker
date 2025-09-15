import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
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
    async jwt({ token, account, user }) {
      console.log("JWT Callback:", { account: !!account, user: !!user, token: !!token })
      if (account) {
        console.log("Account provider:", account.provider)
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      console.log("Session Callback:", { session: !!session, token: !!token })
      session.accessToken = token.accessToken as string
      return session
    },
    async redirect({ url, baseUrl }) {
      console.log("Redirect Callback:", { url, baseUrl })
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async signIn({ user, account, profile }) {
      console.log("SignIn Callback:", { 
        user: user?.email, 
        account: account?.provider, 
        profile: profile?.email 
      })
      return true
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
