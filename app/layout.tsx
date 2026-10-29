import type { Metadata } from 'next';
export const metadata: Metadata = {title:'DIP — Project memory | VXU Labs',description:'Local-first project memory for coding agents. Explore your DIP repositories and task history.',icons:{icon:'/assets/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body style={{margin:0}}>{children}</body></html>}
