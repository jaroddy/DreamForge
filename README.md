# DreamForge

DreamForge is a comprehensive web application that combines AI-powered 3D model generation with print-on-demand services. Users can generate 3D models using text prompts (via Meshy AI) or upload their own STL files, then have them professionally 3D printed through SLANT3D integration.

## Features

- **AI-Powered 3D Generation**: Create 3D models from text descriptions using Meshy AI
- **STL File Upload**: Upload and preview your own 3D models
- **Model Refinement**: Customize textures and materials on generated models
- **Cost Estimation**: Get instant printing cost estimates
- **Secure Payment**: Stripe integration for secure checkout
- **Model Library**: View and manage all your previously generated models
- **Security**: Built-in rate limiting, session management, and DDOS protection
- **Scalable**: Containerized architecture ready for horizontal scaling

## Architecture

### Frontend
- **Framework**: Next.js 14 with React 18
- **Styling**: Tailwind CSS
- **3D Preview**: Three.js for model visualization
- **State Management**: React Context API

### Backend
- **Framework**: Python FastAPI
- **Database**: SQLite (easily upgradeable to PostgreSQL)
- **Session Management**: IP-based with timeout detection
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Security**: CORS, CSP headers, request validation

### External APIs
- **Meshy AI**: Text-to-3D model generation
- **SLANT3D**: 3D printing and cost estimation
- **Stripe**: Payment processing

## Installation

### Prerequisites
- Node.js 20+ and npm
- Python 3.12+
- Docker and Docker Compose (for containerized deployment)

### Local Development Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/jaroddy/DreamForge.git
cd DreamForge
```

#### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your API keys
```

#### 3. Frontend Setup
```bash
cd dreamforge

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local
# Edit .env.local and add your configuration
```

#### 4. Run Development Servers

**Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd dreamforge
npm run dev
```

Visit `http://localhost:3000` to access the application.

### Docker Deployment

#### 1. Configure Environment
```bash
cp .env.example .env
# Edit .env and add all required API keys
```

#### 2. Build and Run
```bash
docker-compose up --build
```

The application will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

#### 3. Stop Services
```bash
docker-compose down
```

## Environment Variables

### Backend (.env)
```
MESHY_API_KEY=your_meshy_api_key
SLANT3D_API_KEY=your_slant3d_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
FRONTEND_URL=http://localhost:3000
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_WINDOW_MINUTES=15
SESSION_TIMEOUT_MINUTES=30
DATABASE_URL=sqlite+aiosqlite:///./dreamforge.db
```

### Frontend (.env.local)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## API Endpoints

### Meshy Endpoints
- `POST /api/meshy/preview` - Create a preview task
- `POST /api/meshy/refine` - Refine a model with textures
- `GET /api/meshy/task/{task_id}` - Get task status
- `GET /api/meshy/list` - List user's tasks

### SLANT3D Endpoints
- `POST /api/slant3d/estimate` - Get printing cost estimate
- `POST /api/slant3d/order` - Place a print order

### Stripe Endpoints
- `POST /api/stripe/create-payment-intent` - Create payment intent
- `POST /api/stripe/create-checkout-session` - Create checkout session

### System Endpoints
- `GET /` - API status
- `GET /health` - Health check

## User Workflow

1. **Generate Model**
   - User enters a text description
   - AI generates a 3D preview (1-2 minutes)
   - User can regenerate with different prompts

2. **Refine Model**
   - Add texture descriptions
   - Enable PBR materials
   - Get cost estimate from SLANT3D

3. **Order & Pay**
   - Review final model
   - Enter shipping details
   - Complete payment via Stripe
   - Order sent to SLANT3D for printing

4. **Manage Models**
   - View all generated models
   - Reuse previous models
   - Track generation history

## Security Features

### Rate Limiting
- 100 requests per IP per 15 minutes
- Automatic IP blocking for excessive requests
- Configurable limits per endpoint

### Session Management
- 30-minute inactivity timeout
- Automatic session cleanup
- Session abuse detection (max 500 requests)

### Security Headers
- CORS protection
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

### Input Validation
- Prompt length limits (600 characters)
- Request payload validation
- SQL injection protection
- XSS protection

### Known Security Considerations
- **Session Storage**: Currently uses localStorage for session IDs. For production deployment, migrate to httpOnly cookies for better XSS protection.
- **API Keys**: All sensitive keys are stored in backend environment variables, never exposed to frontend.
- **HTTPS**: Ensure SSL/TLS is enabled in production to protect data in transit.

## Scaling Guide

### Horizontal Scaling

#### 1. Database Migration
Replace SQLite with PostgreSQL for multi-instance support:
```python
# backend/app/core/config.py
DATABASE_URL = "postgresql+asyncpg://user:pass@host:5432/dreamforge"
```

#### 2. Load Balancer
Use nginx or cloud load balancer to distribute requests:
```nginx
upstream backend {
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}
```

#### 3. Docker Swarm
```bash
docker swarm init
docker stack deploy -c docker-compose.yml dreamforge
docker service scale dreamforge_backend=3 dreamforge_frontend=3
```

#### 4. Kubernetes
```bash
kubectl apply -f k8s/deployment.yaml
kubectl scale deployment dreamforge-backend --replicas=5
```

### Performance Optimization

- Enable Redis for session storage
- Add CDN for static assets
- Implement caching layer
- Use connection pooling
- Enable gzip compression

### Monitoring
- Add health check endpoints
- Implement logging (ELK stack)
- Use APM tools (New Relic, Datadog)
- Monitor rate limiting metrics

## Load Testing

The system is designed to handle 1000+ concurrent users. Test with:

```bash
# Install Apache Bench
apt-get install apache2-utils

# Test backend
ab -n 1000 -c 100 http://localhost:8000/health

# Test frontend
ab -n 1000 -c 100 http://localhost:3000/
```

For comprehensive testing, use:
- JMeter for complex scenarios
- Locust for Python-based testing
- k6 for modern load testing

## Development

### Project Structure
```
DreamForge/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # API endpoints
│   │   ├── core/            # Configuration
│   │   ├── db/              # Database setup
│   │   ├── middleware/      # Rate limiting, sessions
│   │   ├── models/          # Database models
│   │   └── services/        # External API integrations
│   ├── requirements.txt
│   └── Dockerfile
├── dreamforge/
│   ├── src/app/
│   │   ├── components/      # React components
│   │   ├── context/         # State management
│   │   ├── services/        # API clients
│   │   ├── generate/        # AI generation page
│   │   ├── refine/          # Model refinement page
│   │   ├── my-models/       # Model library page
│   │   ├── preview/         # Preview page
│   │   └── payment/         # Payment page
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

### Adding New Features

1. Backend: Add route in `backend/app/api/routes/`
2. Frontend: Add service method in `src/app/services/`
3. Update context if needed in `src/app/context/`
4. Create/update page components
5. Test locally before Docker build

## Troubleshooting

### Backend Won't Start
- Check Python version (3.12+)
- Verify all API keys in .env
- Check port 8000 is not in use

### Frontend Build Fails
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node version (20+)
- Verify NEXT_PUBLIC_BACKEND_URL is set

### Database Issues
- Delete `dreamforge.db` to reset
- Check file permissions
- Verify SQLite is installed

### Docker Issues
- Clear Docker cache: `docker system prune -a`
- Check logs: `docker-compose logs -f`
- Rebuild: `docker-compose up --build --force-recreate`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/jaroddy/DreamForge/issues
- Documentation: https://github.com/jaroddy/DreamForge/wiki

## Credits

- Meshy AI for 3D generation
- SLANT3D for printing services
- Stripe for payment processing
- Next.js and FastAPI communities
