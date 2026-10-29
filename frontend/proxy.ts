import { clerkMiddleware } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Configure CLERK_SECRET_KEY in deployment to enable server-side route protection.
// Without it, keep the app navigable for local UI development.
const clerkHandler = clerkMiddleware(async (auth, request) => {
  if (!process.env.CLERK_SECRET_KEY) return
  const path = request.nextUrl.pathname
  const isPublicRoute = path === '/' || path.startsWith('/sign-in') || path.startsWith('/sign-up')
  if (!isPublicRoute) await auth.protect()
})

export default function proxy(request: NextRequest) {
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.next()
  return clerkHandler(request)
}

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|pdf|zip)).*)', '/(api|trpc)(.*)'],
}
