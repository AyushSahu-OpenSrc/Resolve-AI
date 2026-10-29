'use client'

import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage(){return <main className="ra-auth"><section className="ra-auth-brand"><Link href="/" className="ra-auth-logo"><span className="ra-brand-mark">R</span>Resolve<span style={{color:'#43cbd7'}}>AI</span></Link><div className="ra-auth-copy"><h1>Build a more <span style={{color:'#48d1d8'}}>resilient</span> support operation.</h1><p>Bring your customer, order, inventory and policy data into one evidence-led resolution workflow.</p></div><div className="ra-auth-proof"><span>✦ Flexible policy rules</span><span>◈ Clear audit trail</span><span>✓ Human review when needed</span></div></section><section className="ra-auth-panel"><div className="ra-auth-panel-inner"><h2>Create your workspace</h2><p>Create your account, configure your company, import inventory, customers and orders, then define your first resolution policy.</p><SignUp routing="hash" signInUrl="/sign-in" fallbackRedirectUrl="/onboarding" /></div></section></main>}
