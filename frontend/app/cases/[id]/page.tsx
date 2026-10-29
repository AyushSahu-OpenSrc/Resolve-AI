'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAgentRun } from '@/hooks/useAgentRun'
import { api, AgentEvent } from '@/lib/api'

function label(s?:string|null){return (s||'Unknown').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function EventCard({event,index}:{event:AgentEvent,index:number}) {
 const [expanded,setExpanded]=useState(false)
 const title=event.tool_name?label(event.tool_name):label(event.event_type)
 return <article className={'exec-event '+(event.status==='failed'?'failed':'')}>
  <span className="exec-event-icon">{event.status==='failed'?'!':['success','completed','verified'].includes((event.status||'').toLowerCase())?'✓':String(index+1).padStart(2,'0')}</span>
  <div><strong>{title}</strong><p>{event.reasoning_summary||'Agent event recorded.'}</p><small>{event.timestamp?new Date(event.timestamp).toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'Timestamp unavailable'} · {label(event.status)}</small>
  {(event.input_data||event.output_data)&&<button className="exec-expand" onClick={()=>setExpanded(!expanded)}>{expanded?'Hide operation details':'Inspect operation details'} {expanded?'−':'+'}</button>}
  {expanded&&<div className="exec-json">{event.input_data&&<div><b>Input evidence</b><pre>{JSON.stringify(event.input_data,null,2)}</pre></div>}{event.output_data&&<div><b>Tool result</b><pre>{JSON.stringify(event.output_data,null,2)}</pre></div>}</div>}</div>
 </article>
}
export default function CasePage({params}:{params:Promise<{id:string}>}) {
 const {id}=use(params);const {events,caseDetail,isRunning,startPolling,resetState,refetch,error}=useAgentRun(id)
 const [busy,setBusy]=useState(false);const [actionError,setActionError]=useState('')
 const demo=id==='CASE-DEMO-001'
 useEffect(()=>{if(caseDetail?.status==='running'||caseDetail?.status==='processing')startPolling()},[caseDetail?.status])
 async function run(){setBusy(true);setActionError('');try{if(demo){resetState();await api.runDemo()}else{await api.resolveCase(id)}startPolling()}catch(e){setActionError(e instanceof Error?e.message:'The agent could not be started. Check the backend connection.')}finally{setBusy(false)}}
 async function reset(){setBusy(true);setActionError('');try{await api.resetDemo();resetState();await refetch()}catch(e){setActionError(e instanceof Error?e.message:'Demo reset failed')}finally{setBusy(false)}}
 const inventory=caseDetail?.inventory||[]
 const done=['resolved','verified','completed'].includes((caseDetail?.status||'').toLowerCase())
 return <div className="exec-screen"><div className="ra-exec">
  <Link href="/cases" className="exec-back">← <span>Back to conflicts</span></Link>
  <div className="exec-header"><div><div className="exec-title-kicker">RESOLUTION WORKSPACE / CASE DETAIL</div><h1>Agent resolution <span className="exec-status">{label(caseDetail?.status||'Loading')}</span></h1><p>Investigate the evidence, follow the policy, and verify the operational outcome for this customer case.</p></div><div className="exec-actions"><button className="exec-button" onClick={()=>refetch()} disabled={busy}>Refresh state</button>{demo&&<button className="exec-button" onClick={reset} disabled={busy}>Reset demo</button>}<button className="exec-button primary" onClick={run} disabled={busy||isRunning||done}>{busy?'Starting…':isRunning?'Agent running':done?'Verified resolution':'Run ResolveAI ↗'}</button></div></div>
  {(actionError||error)&&<div className="exec-error">{actionError||error}</div>}
  <div className="exec-grid">
   <section className="exec-panel"><div className="exec-panel-head">CASE EVIDENCE <small>{caseDetail?'Loaded from API':'Loading…'}</small></div><div className="exec-panel-body">
    <p className="exec-fact-label">CUSTOMER GOAL</p><p className="exec-goal">{caseDetail?.customer_message||'Loading customer issue…'}</p>
    <p className="exec-fact-label">CUSTOMER</p><div className="exec-fact"><span>Name</span><strong>{caseDetail?.customer?.name||caseDetail?.customer_id||'—'}</strong></div><div className="exec-fact"><span>Tier</span><strong>{label(caseDetail?.customer?.tier)}</strong></div><div className="exec-fact"><span>Email</span><strong>{caseDetail?.customer?.email||'—'}</strong></div>
    <div className="exec-fact-group"><p className="exec-fact-label">ORDER</p><div className="exec-fact"><span>Reference</span><strong>{caseDetail?.order?.id||caseDetail?.order_id||'—'}</strong></div><div className="exec-fact"><span>Status</span><strong>{label(caseDetail?.order?.status)}</strong></div><div className="exec-fact"><span>Issue</span><strong>{label(caseDetail?.order?.issue_type)}</strong></div><div className="exec-fact"><span>Amount</span><strong>{caseDetail?.order?.total_amount==null?'—':new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(caseDetail.order.total_amount)}</strong></div></div>
    {caseDetail?.product&&<div className="exec-fact-group"><p className="exec-fact-label">PRODUCT</p><div className="exec-fact"><span>Name</span><strong>{caseDetail.product.name}</strong></div><div className="exec-fact"><span>SKU</span><strong>{caseDetail.product.sku}</strong></div></div>}
   </div></section>
   <section className="exec-panel"><div className="exec-panel-head">AGENT EXECUTION TRACE <small>{events.length} recorded events</small></div>
    {events.length? <div className="exec-events">{events.map((event,i)=><EventCard key={event.id} event={event} index={i}/>)}</div>:<div className="exec-empty"><div className="exec-empty-mark">✳</div><h3>{isRunning?'Agent is starting':'Ready to investigate'}</h3><p>{isRunning?'The case is being loaded and the execution trace will appear as real backend events are recorded.':'Run ResolveAI to let the agent inspect case evidence, evaluate policy, choose tools and verify the resulting state.'}</p><button className="exec-button primary" onClick={run} disabled={busy||isRunning||done}>{busy?'Starting…':'Start agent resolution'}</button></div>}
    {isRunning&&<div className="exec-running-note"><i/> Execution active · waiting for the next recorded backend event</div>}
   </section>
   <section className="exec-panel"><div className="exec-panel-head">LIVE OPERATIONAL STATE</div><div className="exec-panel-body">
    <p className="exec-fact-label">CASE OUTCOME</p><div className="exec-fact"><span>Case status</span><strong>{label(caseDetail?.status)}</strong></div><div className="exec-fact"><span>Resolution</span><strong>{caseDetail?.resolution_summary||'Not yet recorded'}</strong></div>
    <div className="exec-fact-group"><p className="exec-fact-label">FULFILMENT INVENTORY</p>{inventory.length?inventory.map((inv,i)=><div className="exec-inventory" key={inv.warehouse+i}><span className="exec-stock-icon">◇</span><div><strong>{inv.warehouse}</strong><small>{inv.quantity} on hand · {inv.reserved_quantity} reserved</small></div><b className={inv.available<=1?'low':''}>{inv.available} available</b></div>):<p style={{color:'#7e8d87',fontSize:14,lineHeight:1.6}}>Inventory state will appear when the case and its product are loaded.</p>}</div>
    {caseDetail?.replacement&&<div className="exec-notice">Replacement recorded: {caseDetail.replacement.id} · {caseDetail.replacement.warehouse} · {caseDetail.replacement.tracking_number}</div>}
    <div className="exec-notice">{done?'The backend reports a completed resolution. Confirm the event trace and state before presenting it as verified.':'Only backend-reported state is displayed here. No simulated events are added to the execution log.'}</div>
   </div></section>
  </div>
 </div></div>
}
