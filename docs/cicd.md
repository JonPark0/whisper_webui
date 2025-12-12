# CI/CD Guide

Continuous Integration and Deployment guide for Whisper WebUI.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions Workflows](#github-actions-workflows)
- [CI Pipeline](#ci-pipeline)
- [CD Pipeline](#cd-pipeline)
- [Local CI Testing](#local-ci-testing)
- [Secrets Management](#secrets-management)
- [Best Practices](#best-practices)

## Overview

Whisper WebUI uses GitHub Actions for automated testing, building, and deployment.

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR | Run tests, lint, build |
| `docker-publish.yml` | Release | Build and publish Docker images |

## GitHub Actions Workflows

### CI Workflow

**File:** `.github/workflows/ci.yml`

**Triggers:**
- Push to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`

**Jobs:**

#### 1. Backend Linting

```yaml
backend-lint:
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Set up Python 3.11
    - Install dependencies
    - Run Black (formatter check)
    - Run isort (import sorting)
    - Run Flake8 (linting)
```

**What it checks:**
- Code formatting consistency
- Import organization
- PEP 8 compliance
- Common code issues

**Local equivalent:**
```bash
cd backend
black --check *.py
isort --check-only *.py
flake8 --max-line-length=120 *.py
```

#### 2. Frontend Lint & Build

```yaml
frontend-lint-build:
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Set up Node.js 20
    - Install dependencies (npm ci)
    - Run ESLint
    - Build frontend
```

**What it checks:**
- JavaScript/JSX code quality
- Build success
- No build errors or warnings

**Local equivalent:**
```bash
cd frontend
npm ci
npm run lint
npm run build
```

#### 3. Docker Build Test

```yaml
docker-build:
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Set up Docker Buildx
    - Create .env file
    - Build backend image
    - Build frontend image
    - Test docker-compose config
```

**What it checks:**
- Docker images build successfully
- Docker Compose configuration is valid
- No build errors

**Local equivalent:**
```bash
docker build -t whisper-backend:test ./backend
docker build -t whisper-frontend:test ./frontend
docker-compose config
```

#### 4. Security Scanning

```yaml
security-scan:
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Run Trivy vulnerability scanner
    - Upload results to GitHub Security
```

**What it checks:**
- Known vulnerabilities in dependencies
- Security issues in Docker images
- Configuration problems

**Severity levels:**
- CRITICAL: Must fix immediately
- HIGH: Should fix soon
- MEDIUM: Fix when possible
- LOW: Optional improvements

### Docker Publish Workflow

**File:** `.github/workflows/docker-publish.yml`

**Triggers:**
- New release published
- Manual workflow dispatch

**Jobs:**

#### Build and Push Images

```yaml
build-and-push:
  runs-on: ubuntu-latest
  permissions:
    contents: read
    packages: write

  strategy:
    matrix:
      service: [backend, frontend]

  steps:
    - Checkout code
    - Set up Docker Buildx
    - Log in to Container Registry (ghcr.io)
    - Extract metadata (tags, labels)
    - Build and push images
```

**Image tags created:**
- `latest` - Latest stable release
- `v1.2.3` - Specific version
- `1.2` - Major.minor version
- `main` - Main branch builds

**Registry:** GitHub Container Registry (`ghcr.io`)

## CI Pipeline

### Pipeline Stages

```
┌─────────────┐
│   Trigger   │ Push/PR to main/develop
└──────┬──────┘
       │
       ├─────────────────────┬─────────────────────┬──────────────────┐
       ▼                     ▼                     ▼                  ▼
┌─────────────┐       ┌──────────┐        ┌──────────┐      ┌──────────┐
│  Backend    │       │ Frontend │        │  Docker  │      │ Security │
│  Linting    │       │ Lint+Build│       │  Build   │      │   Scan   │
└─────────────┘       └──────────┘        └──────────┘      └──────────┘
       │                     │                     │                  │
       └─────────────────────┴─────────────────────┴──────────────────┘
                                   │
                                   ▼
                            ┌─────────────┐
                            │  All Passed │
                            └─────────────┘
                                   │
                                   ▼
                            ┌─────────────┐
                            │   Merge OK  │
                            └─────────────┘
```

### Running CI Locally

#### Prerequisites

```bash
# Install act (GitHub Actions local runner)
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows (with scoop)
scoop install act
```

#### Run All Jobs

```bash
# Run all CI jobs locally
act -j backend-lint
act -j frontend-lint-build
act -j docker-build
act -j security-scan

# Run all jobs in CI workflow
act push
```

#### Run Specific Job

```bash
# Backend linting only
act -j backend-lint

# Frontend build only
act -j frontend-lint-build
```

### Fixing CI Failures

#### Backend Linting Failures

**Black formatting issues:**
```bash
cd backend
black *.py  # Auto-fix
```

**isort issues:**
```bash
cd backend
isort *.py  # Auto-fix
```

**Flake8 issues:**
```bash
cd backend
flake8 --max-line-length=120 *.py  # Check
# Manually fix reported issues
```

#### Frontend Linting Failures

**ESLint issues:**
```bash
cd frontend
npm run lint -- --fix  # Auto-fix what's possible
# Manually fix remaining issues
```

**Build failures:**
```bash
cd frontend
npm run build  # Check build locally
# Fix reported errors
```

#### Docker Build Failures

**Common causes:**
- Missing dependencies in requirements.txt
- Invalid Dockerfile syntax
- Missing files referenced in COPY

**Debug:**
```bash
docker build -t test ./backend --progress=plain
docker build -t test ./frontend --progress=plain
```

#### Security Scan Failures

**Review findings:**
1. Check GitHub Security tab
2. Review Trivy output in Actions log
3. Update vulnerable dependencies

**Fix vulnerabilities:**
```bash
# Backend
cd backend
pip list --outdated
pip install --upgrade <package>

# Frontend
cd frontend
npm audit
npm audit fix
npm update
```

## CD Pipeline

### Release Process

#### 1. Create Release

```bash
# Tag version
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

#### 2. Publish Release

On GitHub:
1. Go to Releases
2. Click "Draft a new release"
3. Select tag: `v1.0.0`
4. Fill in release notes
5. Click "Publish release"

#### 3. Automated Build

GitHub Actions will automatically:
1. Build Docker images
2. Tag with version numbers
3. Push to GitHub Container Registry

#### 4. Deploy

```bash
# Pull latest images
docker pull ghcr.io/yourusername/whisper_webui-backend:v1.0.0
docker pull ghcr.io/yourusername/whisper_webui-frontend:v1.0.0

# Update docker-compose.yml to use specific versions
# Restart services
docker-compose down
docker-compose up -d
```

### Manual Deployment

**Deploy to specific version:**

```bash
# Set version in .env
echo "IMAGE_TAG=v1.0.0" >> .env

# Update docker-compose.yml
services:
  backend:
    image: ghcr.io/yourusername/whisper_webui-backend:${IMAGE_TAG}

  frontend:
    image: ghcr.io/yourusername/whisper_webui-frontend:${IMAGE_TAG}

# Deploy
docker-compose pull
docker-compose up -d
```

### Rollback

```bash
# Use previous version
docker-compose down
docker pull ghcr.io/yourusername/whisper_webui-backend:v0.9.0
docker pull ghcr.io/yourusername/whisper_webui-frontend:v0.9.0

# Update docker-compose.yml or .env
IMAGE_TAG=v0.9.0

# Restart
docker-compose up -d
```

## Secrets Management

### GitHub Secrets

Required secrets for workflows:

| Secret | Purpose | Scope |
|--------|---------|-------|
| `GITHUB_TOKEN` | Auto-generated | Push to ghcr.io |
| `GEMINI_API_KEY` | (Optional) Testing | Run integration tests |

### Adding Secrets

1. Go to repository Settings
2. Click "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add name and value
5. Click "Add secret"

### Using Secrets in Workflows

```yaml
steps:
  - name: Run tests
    env:
      GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    run: pytest
```

### Security Best Practices

- ✅ Use secrets for sensitive data
- ✅ Rotate secrets regularly
- ✅ Limit secret scope (repo/organization/environment)
- ✅ Never log secrets
- ❌ Don't use secrets in PR from forks (security risk)

## Best Practices

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

**Examples:**
```
feat(backend): add audio duration detection
fix(frontend): resolve upload progress bar issue
docs(readme): update installation instructions
```

### Branch Strategy

```
main
├── develop
│   ├── feature/audio-enhancement
│   ├── feature/user-auth
│   └── fix/upload-validation
└── hotfix/critical-security-fix
```

**Branches:**
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `hotfix/*`: Urgent production fixes

**Workflow:**
1. Create feature branch from `develop`
2. Develop and commit
3. Push and create PR to `develop`
4. CI runs automatically
5. Review and merge
6. Periodically merge `develop` to `main`

### Pull Request Guidelines

**PR Title:**
```
feat: Add timestamp support to transcription
```

**PR Description Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] CI passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

### Code Review Checklist

**Reviewer checks:**
- [ ] Code quality and readability
- [ ] Tests coverage
- [ ] Documentation updated
- [ ] No security issues
- [ ] Performance considerations
- [ ] Error handling
- [ ] CI passing

### Testing Strategy

#### Unit Tests

```bash
# Backend
cd backend
pytest tests/

# Frontend
cd frontend
npm test
```

#### Integration Tests

```bash
# Start services
docker-compose up -d

# Run integration tests
pytest tests/integration/

# Cleanup
docker-compose down
```

#### E2E Tests

Consider adding Playwright or Cypress:

```javascript
// e2e/upload.spec.js
test('upload and transcribe audio', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.setInputFiles('input[type="file"]', 'test.mp3');
  await page.click('button:has-text("Upload")');
  await expect(page.locator('.success')).toBeVisible();
});
```

### Monitoring CI Performance

**Check workflow run times:**
1. Go to Actions tab
2. View workflow runs
3. Identify slow jobs

**Optimize slow jobs:**
- Use caching for dependencies
- Parallelize independent jobs
- Use matrix strategy for multiple versions

**Example caching:**
```yaml
- name: Cache Python dependencies
  uses: actions/cache@v3
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}

- name: Cache npm dependencies
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('package-lock.json') }}
```

## Continuous Improvement

### Metrics to Track

- CI pass rate
- Average CI duration
- Time to deployment
- Deployment frequency
- Mean time to recovery (MTTR)

### Regular Reviews

**Monthly:**
- Review CI performance
- Update dependencies
- Check for workflow updates

**Quarterly:**
- Audit security practices
- Review and optimize workflows
- Update documentation

**Annually:**
- Major dependency upgrades
- CI/CD tool evaluation
- Architecture review

## Troubleshooting

### Common Issues

**Issue:** Workflow not triggering
- Check branch name matches trigger pattern
- Verify workflow file is in `.github/workflows/`
- Check GitHub Actions is enabled

**Issue:** Permission denied pushing Docker image
- Check `GITHUB_TOKEN` permissions
- Verify package write permission in workflow

**Issue:** Tests failing in CI but passing locally
- Check environment differences
- Verify all dependencies listed
- Check for race conditions

**Issue:** Slow CI runs
- Add caching for dependencies
- Parallelize jobs
- Use smaller Docker base images

## Next Steps

- [Development Guide](development.md) - Local development
- [Deployment Guide](deployment.md) - Production deployment
- [Security Guide](security.md) - Security best practices
