'use client'

import { ClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'

// Publishable keys are designed for browser use. Prefer setting this in the deployment environment.
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_dW5jb21tb24tZ2FyLTQ3LmNsZXJrLmFjY291bnRzLmRldiQ'

export function Providers({ children }: { children: ReactNode }) {
  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>
}
