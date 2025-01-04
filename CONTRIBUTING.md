# Contributing to Digital Presence MVP

## Table of Contents
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Security Guidelines](#security-guidelines)
- [Performance Guidelines](#performance-guidelines)

## Getting Started

### Prerequisites
- Node.js 18 LTS
- npm 9.x
- Git 2.40+
- Docker 24.x
- VS Code (recommended)

### Repository Structure
```
digital-presence-mvp/
├── src/
│   ├── backend/         # Node.js/Express backend
│   └── web/            # Next.js frontend
├── .github/
│   ├── workflows/      # CI/CD configurations
│   └── ISSUE_TEMPLATE/ # Issue templates
└── docs/              # Documentation
```

## Development Environment Setup

### Backend Setup
```bash
cd src/backend
npm ci
npm run dev
```

Required services:
- PostgreSQL 15
- MongoDB 6
- Redis 7

### Frontend Setup
```bash
cd src/web
npm ci
npm run dev
```

## Development Workflow

### Branch Strategy
- `main`: Production releases
- `develop`: Development integration
- `feature/*`: New features
- `bugfix/*`: Bug fixes
- `release/*`: Release preparation
- `hotfix/*`: Production fixes

### Commit Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

Example:
```
feat(events): implement event creation workflow

- Add event form component
- Integrate with backend API
- Add validation logic

Closes #123
```

## Code Standards

### TypeScript Guidelines
- Use TypeScript 5.0+ strict mode
- Explicit type declarations
- Interface over type where possible
- Proper error handling with custom types

### Frontend Standards
- React 18 functional components
- Custom hooks for reusable logic
- Proper state management with Redux
- Responsive design with Tailwind CSS

### Backend Standards
- RESTful API design
- Proper error handling
- Request validation with Zod
- TypeORM for database operations

### Documentation Requirements
- JSDoc comments for public APIs
- README files for all modules
- OpenAPI/Swagger documentation
- Inline comments for complex logic

## Testing Requirements

### Coverage Requirements
All code must maintain minimum 80% coverage:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

### Test Types
1. Unit Tests (Jest)
```bash
npm run test
```

2. Integration Tests
```bash
npm run test:integration
```

3. E2E Tests (Cypress)
```bash
npm run test:e2e
```

### Performance Testing
- Load testing with k6
- Performance budgets enforcement
- Lighthouse score requirements

## Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Update documentation
4. Submit PR with template completion
5. Pass CI/CD checks
6. Obtain two approvals
7. Squash and merge

### PR Requirements
- Linked issue reference
- Comprehensive description
- Test coverage maintained
- Documentation updated
- No security vulnerabilities
- Performance impact assessed

## Security Guidelines

### Authentication & Authorization
- JWT token implementation
- Role-based access control
- Input validation
- XSS prevention
- CSRF protection

### Data Protection
- Encryption at rest
- Secure communication
- PII handling compliance
- Audit logging
- Rate limiting

## Performance Guidelines

### Frontend Performance
- Bundle size optimization
- Code splitting
- Image optimization
- Caching strategy
- Lazy loading

### Backend Performance
- Query optimization
- Caching implementation
- Connection pooling
- Rate limiting
- Resource monitoring

## Additional Resources

- [Technical Documentation](./docs)
- [API Documentation](./docs/api)
- [Architecture Guide](./docs/architecture)
- [Security Policy](./SECURITY.md)
- [License](./LICENSE)

## Questions and Support

For questions or support:
1. Check existing documentation
2. Search closed issues
3. Open new issue with template
4. Tag relevant maintainers

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.