// Assuming this file is RootLayout.js or similar
'use client'
import Navbar from './components/navbar'
import { FileUrlProvider } from './context/fileUrlContext';
import { TokenProvider } from './context/tokenContext';
import { ConversationProvider } from './context/conversationContext';
import { AuthProvider } from './context/authContext';
import './globals.css';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'YOUR_STRIPE_KEY');

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Elements stripe={stripePromise}>
        <AuthProvider>
          <TokenProvider>
            <ConversationProvider>
              <FileUrlProvider>
                <body className="font-sans">
                  <Navbar />
                  {children}
                </body>
              </FileUrlProvider>
            </ConversationProvider>
          </TokenProvider>
        </AuthProvider>
      </Elements>
    </html>
  );
}
