'use client'

import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'

export default function SignInPage(){return <main className="ra-auth"><section className="ra-auth-brand"><Link href="/" className="ra-auth-logo"><span className="ra-brand-mark">R</span>Resolve<span style={{color:'#43cbd7'}}>AI</span></Link><div className="ra-auth-copy"><h1>Customer resolution, <span style={{color:'#48d1d8'}}>without the busywork.</span></h1><p>One workspace to investigate customer issues, apply your business policies, execute the right action and verify the result.</p></div><div className="ra-auth-proof"><span>✦ Policy-aware agents</span><span>◈ Auditable decisions</span><span>✓ Verified outcomes</span></div></section><section className="ra-auth-panel"><div className="ra-auth-panel-inner"><h2>Welcome back</h2><p>Sign in to your ResolveAI workspace to continue.</p><SignIn routing="hash" signUpUrl="/sign-up" fallbackRedirectUrl="/" /></div></section></main>}
