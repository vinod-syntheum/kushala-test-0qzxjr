# Digital Presence MVP - Frontend

[![Next.js](https://img.shields.io/badge/Next.js-14.0.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Private-red)](#)

Enterprise-grade Next.js frontend application for the Digital Presence MVP platform, enabling small restaurants to establish their online presence within 30 minutes.

## Quick Start

1. **Clone and Install**
```bash
git clone <repository-url>
cd src/web
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. **Start Development Server**
```bash
npm run dev
```

Visit `http://localhost:3000` to view the application.

## Prerequisites

### Required
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git >= 2.40.0

### Recommended
- VS Code with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Tailwind CSS IntelliSense

## Development Setup

### 1. Environment Configuration

Required environment variables:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_maps_key
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your_stripe_key
```

### 2. IDE Configuration

VS Code settings.json:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### 3. Docker Development Environment

```bash
docker-compose up web
```

## Development Workflow

### Branch Management
- `main` - Production releases
- `develop` - Development integration
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Production fixes

### Code Standards
- Follow TypeScript strict mode guidelines
- Use functional components with hooks
- Implement proper error boundaries
- Write comprehensive unit tests
- Document complex logic with JSDoc

### Commit Guidelines
```bash
feat: add new feature
fix: resolve bug
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add/update tests
chore: maintenance tasks
```

## Testing

### Unit Tests
```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
```

### E2E Tests
```bash
npm run test:e2e      # Run Cypress tests
npm run test:e2e:dev  # Open Cypress UI
```

### Type Checking
```bash
npm run type-check
```

## Project Structure

```
src/
├── components/       # Reusable UI components
├── contexts/        # React contexts
├── hooks/           # Custom React hooks
├── layouts/         # Page layouts
├── lib/            # Utility libraries
├── pages/          # Next.js pages
├── services/       # API services
├── store/          # Redux store
├── styles/         # Global styles
├── types/          # TypeScript definitions
└── utils/          # Helper functions
```

## Deployment

### Production Build
```bash
npm run build
npm run start
```

### Deployment Checklist
- [ ] Run all tests
- [ ] Type check passes
- [ ] Build succeeds locally
- [ ] Environment variables configured
- [ ] CDN assets optimized
- [ ] Security headers enabled
- [ ] Analytics configured

## Security

- All API requests use HTTPS
- Input sanitization with DOMPurify
- XSS prevention with proper escaping
- CSRF protection enabled
- Content Security Policy implemented
- Regular dependency updates
- Secure cookie configuration

## Performance

### Optimization Techniques
- Image optimization with next/image
- Code splitting and lazy loading
- Static page generation where possible
- API response caching
- Bundle size monitoring
- Critical CSS extraction

### Monitoring
- Vercel Analytics integration
- Performance metrics tracking
- Error boundary monitoring
- API latency tracking

## Troubleshooting

### Common Issues

1. **Build Failures**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

2. **Type Errors**
```bash
# Regenerate TypeScript types
npm run type-check
```

3. **Development Server Issues**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Support Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Internal Wiki](./docs/wiki)
- [Team Slack Channel](#)

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Run tests
5. Submit pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## License

Private - All rights reserved

---

For additional support, contact the development team through the internal channels.