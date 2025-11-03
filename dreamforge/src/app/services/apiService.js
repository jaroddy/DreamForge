import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

class ApiService {
    constructor() {
        this.client = axios.create({
            baseURL: BACKEND_URL,
            headers: {
                'Content-Type': 'application/json'
            },
            withCredentials: true
        });
        
        // Add request interceptor to include session ID
        this.client.interceptors.request.use(
            (config) => {
                const sessionId = localStorage.getItem('session_id');
                if (sessionId) {
                    config.headers['X-Session-ID'] = sessionId;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
    }
    
    // SLANT3D endpoints
    async estimateCost(fileUrl) {
        try {
            const response = await this.client.post('/api/slant3d/estimate', {
                file_url: fileUrl
            });
            return response.data;
        } catch (error) {
            console.error('Error estimating cost:', error);
            throw error;
        }
    }
    
    async createOrder(orderData) {
        try {
            const response = await this.client.post('/api/slant3d/order', orderData);
            return response.data;
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    }
    
    // Stripe endpoints
    async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
        try {
            const response = await this.client.post('/api/stripe/create-payment-intent', {
                amount,
                currency,
                metadata
            });
            return response.data;
        } catch (error) {
            console.error('Error creating payment intent:', error);
            throw error;
        }
    }
    
    async createCheckoutSession(amount, description, currency = 'usd', metadata = {}) {
        try {
            const response = await this.client.post('/api/stripe/create-checkout-session', {
                amount,
                description,
                currency,
                metadata
            });
            return response.data;
        } catch (error) {
            console.error('Error creating checkout session:', error);
            throw error;
        }
    }
}

export default ApiService;
