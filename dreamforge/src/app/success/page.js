'use client'
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '../context/authContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { purchaseTokens, refreshTokens } = useAuth();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    const processTokenPurchase = async () => {
      // Check if this is a token purchase completion
      const sessionId = searchParams.get('session_id');
      const tokenPurchase = searchParams.get('token_purchase');
      
      if (tokenPurchase === 'true' && sessionId && !processed) {
        setProcessed(true);
        try {
          // Add 200 tokens to the user's account
          await purchaseTokens(200);
          await refreshTokens();
          toast.success('200 tokens added to your account!');
        } catch (error) {
          console.error('Error adding tokens:', error);
          toast.error('Failed to add tokens. Please contact support.');
        }
      }
    };

    processTokenPurchase();
  }, [searchParams, purchaseTokens, refreshTokens, processed]);

  return (
    <div className="h-screen bg-gradient-to-bl from-blue-500 to-gray-100">
      <ToastContainer position={toast.POSITION.TOP_RIGHT} />
      <div className="flex min-h-90 text-white items-center justify-center align-middle mx-4">
        <div className="bg-blue-500 rounded-2xl shadow-lg animate-bounce">
          <h1 className="p-4">We have received your order. Thank you!</h1>
        </div>
        <button className="text-white bg-green-500 rounded-2xl shadow-lg mx-4" onClick={() => router.push('/')}>
          <h1 className="p-4">Start Another Order</h1>
        </button>
      </div>
    </div>
  );
}

const Success = () => {
  return (
    <Suspense fallback={
      <div className="h-screen bg-gradient-to-bl from-blue-500 to-gray-100 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
};

export default Success;
