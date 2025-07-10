import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import AppLayout from '@/components/layout/AppLayout'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NovaDocs - Modern Collaborative Wiki',
  description: 'A modern, collaborative wiki platform for teams',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
      },
    },
  }))

  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <AppLayout>
            {children}
          </AppLayout>
        </QueryClientProvider>
      </body>
    </html>
  )
}
