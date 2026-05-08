import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TravelAI — AI 旅游攻略生成',
  description: '输入目的地，AI 为你生成完整旅游攻略',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className={`${inter.className} bg-slate-50 min-h-screen`}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
