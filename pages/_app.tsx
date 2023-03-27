import '../styles/globals.css'
import type { AppProps } from 'next/app'
import NextHead from 'next/head'
import * as React from 'react'
import { WagmiConfig } from 'wagmi'

import { client } from '../wagmi'
import Layout from '../components/Layout/Layout'
import { NotificationProvider } from '../contexts/Notification'
import Spinner from '../components/Layout/Spinner'
import { Provider, WebSocketProvider } from '@wagmi/core'

function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  return (
    <WagmiConfig client={client}>
      <NextHead>
        <title>Alcantara - Cross Chain Swap</title>
      </NextHead>
      <NotificationProvider>
        <Layout>
          {
            mounted ? (
              <Component {...pageProps} />
            ) : (
              <div className='flex h-full'>
                  <Spinner className='h-9 w-9 text-slate-300 animate-spin m-auto' />
              </div>
            )
          }
        </Layout>
      </NotificationProvider>
    </WagmiConfig>
  )
}

export default App