'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'

function ProductPreview() {
  return <div className="hero-preview">
    <div className="preview-top"><span className="preview-brand"><b>R</b> ResolveAI</span><span className="preview-live"><i/> Illustrative product preview</span><span className="preview-avatar">AS</span></div>
    <div className="preview-body">
      <aside className="preview-nav"><b className="preview-nav-mark">R</b>{['Overview','Customers','Orders','Inventory','Policies','Conflicts'].map((x,i)=><span key={x} className={i===5?'selected':''}><i>{['◫','♙','▤','◇','≋','◎'][i]}</i>{x}</span>)}</aside>
      <div className="preview-main"><div className="preview-heading"><div><small>RESOLUTION OPERATIONS / CASES</small><h3>Resolve the issue. Not just the ticket.</h3></div><span className="preview-open">● In progress</span></div>
        <div className="preview-metrics"><div><small>Case</small><strong>CASE-1042</strong><em>Damaged on arrival</em></div><div><small>Policy check</small><strong>Eligible</strong><em>Replacement permitted</em></div><div><small>Inventory</small><strong>2 locations</strong><em>Stock verified</em></div></div>
        <div className="preview-work"><div className="preview-work-title">AGENT EXECUTION <span>EXAMPLE TRACE</span></div>{[['✓','Investigated the order','Order and customer evidence retrieved'],['✓','Checked replacement policy','Within 7-day damage window'],['↻','Replanned fulfilment','Mumbai unavailable · Pune selected'],['○','Verify final outcome','Illustrative pending step']].map((r,i)=><div className={'preview-event e'+i} key={r[1]}><b>{r[0]}</b><div><strong>{r[1]}</strong><small>{r[2]}</small></div><span>{i===3?'Pending':'Complete'}</span></div>)}</div>
      </div>
    </div>
    <div className="preview-foot"><span>Evidence-led decisions</span><span>Policy-aware actions</span><span>Verifiable outcomes</span></div>
  </div>
}
export default function LandingPage() {
 const {isLoaded,isSignedIn,user}=useUser()
 const setupComplete=(user?.unsafeMetadata as Record<string,unknown>|undefined)?.resolveaiSetupComplete===true
 const launchHref=isLoaded&&isSignedIn?(setupComplete?'/dashboard':'/onboarding'):'/sign-in'
 return <main className="landing">
   <header className="landing-nav"><Link href="/" className="landing-logo"><span>R</span> ResolveAI</Link><nav><a href="#platform">Platform</a><a href="#workflow">How it works</a><a href="#principles">Principles</a></nav><div className="landing-actions"><Link href="/sign-in" className="landing-login">Sign in</Link><Link href={launchHref} className="landing-nav-cta">{isLoaded&&isSignedIn?'Open workspace':'Get started'} <span>↗</span></Link></div></header>
   <section className="landing-hero"><div className="landing-copy"><div className="landing-kicker"><i/> AUTONOMOUS CUSTOMER OPERATIONS</div><h1>Resolve the issue.<br/><em>Earn the trust.</em></h1><p className="landing-lede">A resolution agent that investigates customer problems, applies your business policies, takes the right action and verifies the result.</p><div className="landing-ctas"><Link href={launchHref} className="landing-primary">{isLoaded&&isSignedIn?'Open your workspace':'Explore ResolveAI'} <span>↗</span></Link><a href="#workflow" className="landing-secondary">See how it works <span>↓</span></a></div><div className="landing-proof"><span><b>01</b> Ground decisions in evidence</span><span><b>02</b> Act within business policy</span><span><b>03</b> Verify before closing</span></div></div><div className="landing-visual"><div className="visual-orbit orbit-a"/><div className="visual-orbit orbit-b"/><div className="visual-core"><span>R</span><small>RESOLVEAI AGENT</small></div><div className="orbit-label ol-one"><b>01</b> Investigate</div><div className="orbit-label ol-two"><b>02</b> Decide</div><div className="orbit-label ol-three"><b>03</b> Execute</div><div className="orbit-label ol-four"><b>04</b> Verify</div><div className="visual-note"><i/> One goal. Adaptive execution.</div></div></section>
   <section className="landing-trust"><span>BUILT FOR COMPLEX CUSTOMER OPERATIONS</span><div><b>Commerce</b><i/><b>Subscriptions</b><i/><b>Services</b><i/><b>Logistics</b><i/><b>Support teams</b></div></section>
   <section className="landing-platform" id="platform"><div className="section-heading"><span>THE RESOLVEAI PLATFORM</span><h2>From a customer complaint<br/>to a verified resolution.</h2><p>One connected workspace for the data, policies, decisions and operations behind every customer outcome.</p></div><ProductPreview/></section>
   <section className="landing-workflow" id="workflow"><div className="section-heading"><span>HOW IT WORKS</span><h2>Not another chatbot.<br/>An agent that follows through.</h2></div><div className="workflow-grid">{[['01','Investigate','Gather customer, order, inventory and policy evidence before deciding.'],['02','Reason against policy','Evaluate the issue against rules configured by your business.'],['03','Choose and adapt','Select tools dynamically and replan when an operation is unavailable.'],['04','Verify the outcome','Check the resulting state and surface exceptions for human review.']].map(x=><article key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div></section>
   <section className="landing-bottom" id="principles"><div><span>DESIGNED FOR ACCOUNTABLE AUTOMATION</span><h2>Every action should have<br/>a reason. Every result, proof.</h2></div><div className="bottom-points"><p><b>Policy-led</b> Decisions are grounded in the business rules you configure.</p><p><b>Auditable</b> Tool calls, evidence and outcomes belong in the case history.</p><p><b>Human-aware</b> Uncertain or blocked cases should be surfaced, not hidden.</p></div></section>
   <footer className="landing-footer"><Link href="/" className="landing-logo"><span>R</span> ResolveAI</Link><span>Autonomous resolution, with accountability.</span><div><Link href="/sign-in">Sign in</Link><Link href={launchHref}>Workspace ↗</Link></div></footer>
 </main>
}
