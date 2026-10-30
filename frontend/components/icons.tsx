import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number | string }
const base = ({ size, width, height, ...p }: P) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  width: size ?? width ?? 24,
  height: size ?? height ?? 24,
  'aria-hidden': true,
  ...p,
})

export const IconDashboard = (p: P) => <svg {...base(p)}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="currentColor" stroke="none"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" fill="currentColor" stroke="none"/></svg>
export const IconGrid = (p: P) => <svg {...base(p)}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>
export const IconCases = (p: P) => <svg {...base(p)}><circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M6 8.2v7.6M8 6.8c5 .8 7.6 1.4 7.8 1.9M8.2 17.4c4.4-1 7.5-4 8.3-6.4"/></svg>
export const IconUser = (p: P) => <svg {...base(p)}><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.7-3.7 3.3-5.6 7.2-5.6s6.5 1.9 7.2 5.6"/></svg>
export const IconUsers = (p: P) => <svg {...base(p)}><circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.6-3.3 2.8-5 6-5s5.4 1.7 6 5"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.6 14.7c1.9.6 3.1 2.2 3.4 4.8"/></svg>
export const IconOrder = (p: P) => <svg {...base(p)}><path d="M6 3.5h8.5l4 4v13H6z"/><path d="M14 3.5v4.5h4.5M9 12.5h6M9 16h6"/></svg>
export const IconBox = (p: P) => <svg {...base(p)}><path d="m12 3 8 4.4v9.2L12 21l-8-4.4V7.4z"/><path d="m4.3 7.6 7.7 4.3 7.7-4.3M12 12v8.8"/></svg>
export const IconSpark = (p: P) => <svg {...base(p)}><path d="M12 3.5c.5 4.2 2.3 6 6.5 6.5-4.2.5-6 2.3-6.5 6.5-.5-4.2-2.3-6-6.5-6.5 4.2-.5 6-2.3 6.5-6.5z"/><path d="M18.5 15.5c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5z"/></svg>
export const IconChart = (p: P) => <svg {...base(p)}><path d="M4 4v16h16"/><path d="m7.5 15 3.5-4 3 2.5 5-6"/></svg>
export const IconTruck = (p: P) => <svg {...base(p)}><path d="M3.5 6.5h10.5v10H3.5zM14 10h3.7l2.8 3.2v3.3H14"/><circle cx="7.3" cy="17.6" r="1.6"/><circle cx="17.2" cy="17.6" r="1.6"/></svg>
export const IconShield = (p: P) => <svg {...base(p)}><path d="M12 3.5 19 6v5.6c0 4.3-2.9 7.5-7 8.9-4.1-1.4-7-4.6-7-8.9V6z"/><path d="m9.2 12.2 2 2 3.8-4"/></svg>
export const IconMail = (p: P) => <svg {...base(p)}><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>
export const IconUpload = (p: P) => <svg {...base(p)}><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 14.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/></svg>
export const IconDownload = (p: P) => <svg {...base(p)}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 17.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2"/></svg>
export const IconSettings = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="2.8"/><path d="M19.2 13.4a7.3 7.3 0 0 0 0-2.8l2-1.5-2-3.4-2.4.9a7 7 0 0 0-2.4-1.4L14 2.7h-4l-.4 2.5a7 7 0 0 0-2.4 1.4l-2.4-.9-2 3.4 2 1.5a7.3 7.3 0 0 0 0 2.8l-2 1.5 2 3.4 2.4-.9a7 7 0 0 0 2.4 1.4l.4 2.5h4l.4-2.5a7 7 0 0 0 2.4-1.4l2.4.9 2-3.4z"/></svg>
export const IconSearch = (p: P) => <svg {...base(p)}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
export const IconBell = (p: P) => <svg {...base(p)}><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>
export const IconSidebar = (p: P) => <svg {...base(p)}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/></svg>
export const IconPlus = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14"/></svg>
export const IconCalendar = (p: P) => <svg {...base(p)}><rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>
export const IconClock = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>
export const IconChevronRight = (p: P) => <svg {...base(p)}><path d="m9.5 6 6 6-6 6"/></svg>
export const IconClose = (p: P) => <svg {...base(p)}><path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/></svg>
export const IconSend = (p: P) => <svg {...base(p)}><path d="M12 19V5M6 11l6-6 6 6"/></svg>
export const IconFlame = (p: P) => <svg {...base(p)} stroke="none" fill="currentColor"><path d="M12.6 2.5c.4 3-1.3 4.6-2.8 6.2-1.5 1.6-2.8 3-2.8 5.6A5 5 0 0 0 12 19.5a5 5 0 0 0 5-5.2c0-2.3-1.2-3.4-2-4.6-.3 1.4-1 2.3-2 2.6.9-3.6.2-7.3-.4-9.8z"/></svg>
export const IconInfo = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.1"/></svg>
export const IconTrendUp = (p: P) => <svg {...base(p)}><path d="m4 16 5.5-5.5 3.5 3.5L20 7"/><path d="M15 7h5v5"/></svg>
export const IconAlert = (p: P) => <svg {...base(p)}><path d="M12 3.8 21 19.5H3z"/><path d="M12 9.5v4.5M12 16.8v.1"/></svg>
export const IconMenu = (p: P) => <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16"/></svg>
export const IconArrowUpRight = (p: P) => <svg {...base(p)}><path d="M7 17 17 7M8.5 7H17v8.5"/></svg>
export const IconRefresh = (p: P) => <svg {...base(p)}><path d="M19.5 11A7.5 7.5 0 0 0 6 6.6L4.5 8M4.5 4v4h4M4.5 13A7.5 7.5 0 0 0 18 17.4l1.5-1.4M19.5 20v-4h-4"/></svg>
export const IconMic = (p: P) => <svg {...base(p)}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></svg>
export const IconChevronLeft = (p: P) => <svg {...base(p)}><path d="m14.5 18-6-6 6-6"/></svg>
export const IconCheck = (p: P) => <svg {...base(p)}><path d="M20 6 9 17l-5-5"/></svg>
export const IconDatabase = (p: P) => <svg {...base(p)}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
export const IconFileText = (p: P) => <svg {...base(p)}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
