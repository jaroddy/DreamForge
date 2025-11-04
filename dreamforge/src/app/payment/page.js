'use client'
// Import PaymentComponent
import PaymentComponent from '../components/paymentComponent';
import TokenDisplay from '../components/TokenDisplay';

// Inside your page component
const Payment = () => {
  return (
    <div className="h-screen bg-gradient-to-bl from-blue-500 to-gray-100 transition-opacity duration-500">
      <TokenDisplay />
      
      <div className="flex items-center justify-center min-h-90">
        <div className="animate-fadeIn">
          {/* Other content */}
          <PaymentComponent />
        </div>
      </div>
    </div>
  );
};

export default Payment;
