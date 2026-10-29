'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { UserButton, useUser } from '@clerk/nextjs'

const navItems = [
 {href:'/dashboard',label:'Overview',icon:'◫'},
 {href:'/explorer?tab=customers',label:'Customers',icon:'♙',tab:'customers'},
 {href:'/explorer?tab=orders',label:'Orders',icon:'▤',tab:'orders'},
 {href:'/explorer?tab=inventory',label:'Inventory',icon:'◇',tab:'inventory'},
 {href:'/policies',label:'Policies',icon:'≋'},
 {href:'/cases',label:'Conflicts',icon:'◎'},
 {href:'/agent-runs',label:'Agent runs',icon:'✳'},
 {href:'/fulfillment',label:'Fulfillment',icon:'↗'},
 {href:'/communications',label:'Communications',icon:'✉'},
 {href:'/imports',label:'Import center',icon:'⇧'},
 {href:'/onboarding',label:'Workspace settings',icon:'⚙'},
]
export function NavShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();const router=useRouter();const [activeTab,setActiveTab]=useState('customers');const {isLoaded,isSignedIn,user}=useUser()
 const setupComplete=(user?.unsafeMetadata as Record<string,unknown>|undefined)?.resolveaiSetupComplete===true
 useEffect(()=>{if(typeof window!=='undefined')setActiveTab(new URLSearchParams(window.location.search).get('tab')||'customers')},[pathname])
 useEffect(()=>{if(!isLoaded)return;if(!isSignedIn&&!['/sign-in','/sign-up','/'].includes(pathname)){router.replace('/sign-in');return}if(isSignedIn&&pathname!=='/onboarding'&&!setupComplete&&!['/','/sign-in','/sign-up'].includes(pathname)){router.replace('/onboarding');return}if(isSignedIn&&setupComplete&&pathname==='/onboarding')router.replace('/dashboard')},[isLoaded,isSignedIn,setupComplete,pathname,router])
 function isActive(item:typeof navItems[number]){if(item.tab)return pathname==='/explorer'&&activeTab===item.tab;return pathname===item.href||pathname.startsWith(item.href+'/')}
 if(pathname==='/'||pathname.startsWith('/sign-in')||pathname.startsWith('/sign-up'))return <>{children}</>
 if(!isLoaded||!isSignedIn||(!setupComplete&&pathname!=='/onboarding'))return <main className="ra-auth-loading"><span className="landing-logo"><span>R</span> ResolveAI</span><p>Checking workspace access…</p></main>
 return <div className="ra-shell"><aside className="ra-sidebar"><Link href="/dashboard" className="ra-brand"><span className="ra-brand-mark">R</span><span>Resolve<span className="ra-brand-accent">AI</span><small>RESOLUTION OPERATIONS</small></span></Link><div className="ra-workspace-label">YOUR WORKSPACE</div><nav className="ra-nav">{navItems.map(item=><Link key={item.href} href={item.href} onClick={()=>{if(item.tab)setActiveTab(item.tab)}} className={'ra-nav-item '+(isActive(item)?'active':'')}><span className="ra-nav-icon">{item.icon}</span><span>{item.label}</span></Link>)}</nav><div className="ra-sidebar-bottom"><div className="ra-agent-status"><span className="ra-status-dot"/><span><strong>Resolution engine</strong><small>API-backed operations</small></span></div><Link href="/onboarding" className="ra-upgrade"><span className="ra-upgrade-icon">✦</span><strong>Finish setup</strong><small>Connect data and policies</small><span className="ra-upgrade-arrow">↗</span></Link><div className="ra-sidebar-foot">RESOLVEAI 2.0</div></div></aside><main className="ra-main"><header className="ra-topbar"><div className="ra-search"><span>⌕</span><input aria-label="Search workspace" placeholder="Search conflicts, customers, orders…" onKeyDown={e=>{if(e.key==='Enter')router.push('/cases')}}/></div><div className="ra-topbar-right"><span className="ra-plan"><span className="ra-plan-mark">✳</span><span><strong>{user?.organizationMemberships?.[0]?.organization?.name||'My workspace'}</strong><small>Resolution workspace</small></span></span><span className="ra-topbar-divider"/><div className="ra-user"><span><strong>{user?.fullName||user?.primaryEmailAddress?.emailAddress||'Workspace member'}</strong><small>Signed in</small></span><UserButton afterSignOutUrl="/sign-in"/></div></div></header>{children}</main></div>
}
