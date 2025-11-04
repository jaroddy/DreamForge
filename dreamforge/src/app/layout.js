// Assuming this file is RootLayout.js or similar
'use client'
import Navbar from './components/navbar'
import { FileUrlProvider } from './context/fileUrlContext';
import './globals.css';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'YOUR_STRIPE_KEY');

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js" async />
      </head>
      <Elements stripe={stripePromise}>
        <FileUrlProvider>
          <body className="font-sans">
            <Navbar />
            {children}
          </body>
        </FileUrlProvider>
      </Elements>
    </html>
  );
}
