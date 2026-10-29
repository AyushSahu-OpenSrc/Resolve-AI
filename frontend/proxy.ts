import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Configure CLERK_SECRET_KEY in deployment to enable server-side route protection.
// Without it, the app remains navigable for local UI development and Clerk sign-in pages still render.
const clerkHandler = clerkMiddleware(async (auth, request) => {
  if (!process.env.CLERK_SECRET_KEY) return
  const isAuthRoute = request.nextUrl.pathname.startsWith('/sign-in') || request.nextUrl.pathname.startsWith('/sign-up')
  const isPublicRoute = request.nextUrl.pathname === '/' || isAuthRoute
  if (!isPublicRoute) await auth.protect()
})

export default function proxy(request: Parameters<typeof clerkHandler>[0]) {
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.next()
  return clerkHandler(request)
}

export const config = { matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|pdf|zip)).*)', '/(api|trpc)(.*)'] }
