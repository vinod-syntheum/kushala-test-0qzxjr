# Digital Presence MVP Backend Service

Enterprise-grade backend service for the Digital Presence MVP platform, providing API endpoints for website management, event ticketing, and multi-location restaurant operations.

## Project Overview

### Architecture
- Microservices-based architecture with Node.js 18 LTS
- API Gateway pattern for request routing and authentication
- Multi-database strategy with PostgreSQL, MongoDB, and Redis
- Event-driven communication using message queues
- Container-based deployment with Docker and AWS ECS

### Key Features
- Restaurant website content management
- Event and ticket management system
- Multi-location profile handling
- Real-time data synchronization
- Enterprise-grade security implementation
- Scalable and fault-tolerant design

## Prerequisites

- Node.js 18 LTS
- npm 9.x
- Docker 24.x
- Git 2.40+
- VS Code with extensions:
  - ESLint
  - Prettier
  - Docker
  - TypeScript
  - REST Client

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository>

# Navigate to backend directory
cd src/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Pull Docker images
docker-compose pull
```

### Environment Configuration

Required environment variables:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/db?ssl=true
MONGODB_URI=mongodb://user:password@localhost:27017/content
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### Development

```bash
# Start development server
npm run dev

# Launch database services
docker-compose up

# Run tests in watch mode
npm run test:watch

# Fix linting issues
npm run lint:fix
```

## Development Guidelines

### Code Organization
```
src/
├── api/          # API routes and controllers
├── config/       # Configuration files
├── db/           # Database models and migrations
├── middleware/   # Custom middleware
├── services/     # Business logic
├── types/        # TypeScript definitions
└── utils/        # Helper functions
```

### Coding Standards
- TypeScript strict mode enabled
- ESLint + Prettier configuration
- Conventional Commits for version control
- JSDoc documentation required
- 100% test coverage for new code

## Database Management

### PostgreSQL
- Primary data store for structured data
- Managed through TypeORM migrations
- Automated backup and recovery
- Connection pooling configured

```bash
# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Rollback last migration
npm run db:rollback
```

### MongoDB
- Content storage for website data
- Replica set configuration
- Automated backups
- Indexing strategy implemented

### Redis
- Session management
- API response caching
- Rate limiting implementation
- Pub/Sub for real-time updates

```bash
# Clear cache
npm run cache:clear
```

## Security Implementation

### Authentication
- JWT-based authentication
- Token refresh mechanism
- MFA support
- Session management

### Authorization
- Role-based access control
- Resource-level permissions
- Row-level security in PostgreSQL

### Rate Limiting
- Token bucket algorithm
- Configurable windows and limits
- Redis-based implementation

### Data Protection
- Data encryption at rest
- TLS for data in transit
- Secure credential storage
- Regular security audits

## Deployment

### Build Process
```bash
# Create production build
npm run build

# Start production server
npm run start:prod

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d
```

### Production Configuration
- Multi-stage Docker builds
- Environment-specific settings
- Health check endpoints
- Graceful shutdown handling

### Monitoring
- Prometheus metrics exposed
- Grafana dashboards
- Error tracking with Sentry
- Structured logging with Winston

## API Documentation

- OpenAPI 3.0.0 specification
- Available at `/api/docs`
- Swagger UI enabled
- Authentication required
- Rate limiting applied

## Contributing

### Branch Strategy
- Feature branches: `feature/description`
- Fix branches: `fix/description`
- Documentation: `docs/description`

### Pull Requests
- Required code review
- CI checks must pass
- Conventional commit messages
- Updated documentation

## Troubleshooting

### Common Issues

1. Database Connection Failures
   - Verify environment variables
   - Check network connectivity
   - Validate container health

2. TypeScript Compilation Errors
   - Review tsconfig.json settings
   - Update type definitions
   - Check dependency versions

3. Authentication Issues
   - Verify JWT configuration
   - Check token expiration
   - Validate secret keys

4. Performance Problems
   - Review database indexes
   - Optimize queries
   - Check caching configuration

## Support

For technical support:
- Review documentation
- Check issue tracker
- Contact development team

## License

Copyright © 2024 Digital Presence MVP