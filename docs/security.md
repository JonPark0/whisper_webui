# Security Guide

Comprehensive security guide for Whisper WebUI.

## Table of Contents

- [Security Overview](#security-overview)
- [Built-in Security Features](#built-in-security-features)
- [API Security](#api-security)
- [File Upload Security](#file-upload-security)
- [Container Security](#container-security)
- [Network Security](#network-security)
- [Data Protection](#data-protection)
- [Monitoring and Auditing](#monitoring-and-auditing)
- [Security Checklist](#security-checklist)

## Security Overview

Whisper WebUI implements multiple layers of security to protect against common web vulnerabilities and attacks.

### Security Principles

1. **Defense in Depth**: Multiple security layers
2. **Least Privilege**: Minimal permissions required
3. **Secure by Default**: Safe default configurations
4. **Fail Securely**: Graceful error handling
5. **Security Through Obscurity** ❌: Not relied upon

## Built-in Security Features

### 1. CORS Protection

**Purpose:** Prevent unauthorized cross-origin requests

**Implementation:** `backend/main.py:36-43`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Configuration:**

```bash
# Development
ALLOWED_ORIGINS=http://localhost:5173

# Production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Security Impact:**
- ✅ Blocks requests from unauthorized domains
- ✅ Prevents CSRF attacks
- ❌ Misconfiguration allows unauthorized access

**Best Practices:**
- Never use `*` wildcard in production
- List only necessary origins
- Include protocol and port
- Update when domain changes

### 2. File Validation

**Three-layer validation:**

#### Layer 1: Extension Validation

**Purpose:** Quick rejection of obviously invalid files

**Implementation:** `backend/main.py:146-155`

```python
allowed_extensions = {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'}
file_ext = Path(file.filename).suffix.lower()

if file_ext not in allowed_extensions:
    raise HTTPException(status_code=400, detail="Unsupported file format")
```

**Security Impact:**
- ✅ Prevents executable uploads (.exe, .sh)
- ✅ Fast rejection (no file read needed)
- ❌ Can be bypassed by renaming

#### Layer 2: MIME Type Validation

**Purpose:** Verify actual file content using magic bytes

**Implementation:** `backend/main.py:69-97`

```python
def validate_mime_type(file_content: bytes, filename: str) -> bool:
    """Validate file MIME type based on content (magic bytes)"""
    audio_signatures = {
        b'ID3': 'audio/mpeg',  # MP3
        b'RIFF': 'audio/wav',  # WAV
        b'fLaC': 'audio/flac',  # FLAC
        # ... more signatures
    }

    for signature in audio_signatures:
        if file_content.startswith(signature):
            return True

    return False
```

**Security Impact:**
- ✅ Prevents file type spoofing
- ✅ Validates actual content
- ✅ Cannot be bypassed by renaming

**Magic Bytes Reference:**

| Format | Magic Bytes | Hex |
|--------|-------------|-----|
| MP3 | `ID3` or `\xff\xfb` | `49 44 33` |
| WAV | `RIFF` | `52 49 46 46` |
| FLAC | `fLaC` | `66 4C 61 43` |
| OGG | `OggS` | `4F 67 67 53` |

#### Layer 3: File Size Validation

**Implementation:** `backend/main.py:178-185`

```python
file_size = len(file_content)
if file_size > settings.max_file_size_bytes:
    raise HTTPException(
        status_code=400,
        detail=f"File too large. Maximum allowed size is {settings.max_file_size}."
    )
```

**Security Impact:**
- ✅ Prevents DoS via large uploads
- ✅ Protects disk space
- ✅ Limits memory usage

### 3. Path Traversal Prevention

**Purpose:** Prevent directory traversal attacks

**Vulnerability Example:**
```
filename: "../../../etc/passwd"
→ Could access: /etc/passwd
```

**Implementation:** `backend/main.py:49-66`

```python
def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal attacks"""
    # Get just the filename without any path components
    filename = Path(filename).name

    # Remove or replace dangerous characters
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)

    # Ensure filename is not empty and doesn't start with a dot
    if not safe_filename or safe_filename.startswith('.'):
        safe_filename = 'file_' + safe_filename

    return safe_filename
```

**Protections:**

| Input | Output | Reason |
|-------|--------|--------|
| `../../etc/passwd` | `etc_passwd` | Path removed |
| `.htaccess` | `file_.htaccess` | Hidden file protected |
| `file<script>.mp3` | `file_script_.mp3` | Special chars removed |
| `file name.mp3` | `file_name.mp3` | Spaces replaced |

### 4. Unique Filename Generation

**Purpose:** Prevent file collisions and overwrites

**Implementation:** `backend/main.py:160-163`

```python
unique_id = str(uuid.uuid4())[:8]
name_without_ext = Path(safe_filename).stem
unique_filename = f"{name_without_ext}_{unique_id}{file_ext}"
```

**Example:**
```
Input:  audio.mp3
Output: audio_a1b2c3d4.mp3
```

**Security Impact:**
- ✅ Prevents intentional overwrites
- ✅ Avoids file name collisions
- ✅ Makes files harder to guess
- ✅ Enables concurrent uploads

### 5. Input Validation

**Pydantic Schemas:** `backend/schemas.py`

```python
class TranscribeRequest(BaseModel):
    start_time: float = Field(default=0.0, ge=0)
    end_time: Optional[float] = Field(default=None, ge=0)
    enable_timestamp: bool = True
    chunk_length: int = Field(default=30, ge=1, le=300)

    @validator('end_time')
    def validate_end_time(cls, v, values):
        if v is not None and 'start_time' in values:
            if v <= values['start_time']:
                raise ValueError('end_time must be greater than start_time')
        return v
```

**Security Impact:**
- ✅ Type validation
- ✅ Range validation
- ✅ Logical validation
- ✅ Prevents injection attacks

### 6. Error Handling

**Secure error messages:**

```python
# ✅ Good: Generic message
raise HTTPException(status_code=404, detail="Resource not found")

# ❌ Bad: Information disclosure
raise HTTPException(status_code=404, detail=f"File not found at /app/uploads/secret_file.mp3")
```

**Implementation:**
- Generic error messages to users
- Detailed logs for administrators
- No stack traces in production

## API Security

### Authentication (Recommended for Production)

**Current:** No authentication (suitable for private networks)

**Production Recommendations:**

#### Option 1: API Key Authentication

```python
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key

@app.post("/api/upload")
async def upload_audio(
    file: UploadFile,
    api_key: str = Depends(verify_api_key)
):
    ...
```

#### Option 2: JWT Authentication

```python
from fastapi import Depends
from fastapi.security import HTTPBearer
from jose import JWTError, jwt

security = HTTPBearer()

def verify_token(credentials = Depends(security)):
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=["HS256"]
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid token")
```

#### Option 3: OAuth 2.0

For multi-user systems, implement OAuth 2.0 with providers like:
- Google OAuth
- GitHub OAuth
- Auth0
- Keycloak

### Rate Limiting

**Nginx configuration:**

```nginx
# Define rate limit zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=2r/s;

# Apply to locations
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
}

location /api/upload {
    limit_req zone=upload_limit burst=5 nodelay;
}
```

**Purpose:**
- Prevent brute force attacks
- Mitigate DoS attacks
- Fair resource usage

**Application-level rate limiting:**

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/upload")
@limiter.limit("10/minute")
async def upload_audio(request: Request, file: UploadFile):
    ...
```

## Container Security

### Non-Root User

**Implementation:** `docker-compose.yml:19,46`

```yaml
backend:
  user: "1000:1000"  # Run as non-root user

celery_worker:
  user: "1000:1000"  # Run as non-root user
```

**Security Impact:**
- ✅ Limits container breakout impact
- ✅ Prevents privilege escalation
- ✅ Follows principle of least privilege

### Resource Limits

```yaml
celery_worker:
  deploy:
    resources:
      limits:
        cpus: '4.0'
        memory: 16G
```

**Security Impact:**
- ✅ Prevents resource exhaustion DoS
- ✅ Limits impact of compromised container
- ✅ Ensures system stability

### Read-Only Volumes

```yaml
volumes:
  - ../whisper_transcribe:/whisper_transcribe:ro  # Read-only
```

**Security Impact:**
- ✅ Prevents tampering with source code
- ✅ Limits compromise impact

### Image Security

**Best Practices:**

```dockerfile
# Use specific versions, not 'latest'
FROM python:3.11-slim-bookworm

# Run as non-root
RUN useradd -m -u 1000 appuser
USER appuser

# Minimize attack surface
RUN pip install --no-cache-dir -r requirements.txt

# Don't include secrets
# Use .dockerignore
```

**.dockerignore:**
```
.env
.env.local
*.key
*.pem
secrets/
.git/
```

## Network Security

### HTTPS/TLS

**Always use HTTPS in production:**

```nginx
server {
    listen 443 ssl http2;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Modern TLS only
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### Security Headers

```nginx
# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Prevent MIME type sniffing
add_header X-Content-Type-Options "nosniff" always;

# XSS protection
add_header X-XSS-Protection "1; mode=block" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Firewall

**UFW (Ubuntu):**

```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct access to services
sudo ufw deny 8000/tcp  # Backend
sudo ufw deny 6379/tcp  # Redis

# Check status
sudo ufw status
```

### Network Isolation

```yaml
networks:
  whisper_network:
    driver: bridge
    internal: true  # No external access

  web_network:
    driver: bridge  # External access for nginx only
```

## Data Protection

### Secrets Management

**Never commit secrets:**

```bash
# .gitignore
.env
.env.local
.env.production
*.key
*.pem
secrets/
```

**Use environment variables:**

```bash
# In .env (not committed)
GEMINI_API_KEY=actual-key-here

# In docker-compose.yml
environment:
  - GEMINI_API_KEY=${GEMINI_API_KEY}
```

**For production, use secrets management:**
- Docker Secrets
- HashiCorp Vault
- AWS Secrets Manager
- Kubernetes Secrets

### Data Encryption

**At Rest:**
- Encrypt volumes: LUKS, dm-crypt
- Encrypted database: SQLCipher
- Encrypted backups

**In Transit:**
- HTTPS/TLS for all connections
- Encrypted Redis: `redis://:<password>@host:6379/0 --tls`

### Data Retention

**Implement data cleanup:**

```python
# Cleanup old jobs
@app.delete("/api/cleanup")
async def cleanup_old_jobs(days: int = 30, db: Session = Depends(get_db)):
    cutoff = datetime.now() - timedelta(days=days)
    old_jobs = db.query(Job).filter(Job.created_at < cutoff).all()

    for job in old_jobs:
        # Delete files
        if job.output_file:
            Path(job.output_file).unlink(missing_ok=True)

        # Delete record
        db.delete(job)

    db.commit()
```

**Schedule with cron:**
```bash
0 0 * * * curl -X DELETE http://localhost:8000/api/cleanup?days=30
```

## Monitoring and Auditing

### Structured Logging

**Implementation:** `backend/main.py:27-32`

```python
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

**Log important events:**

```python
logger.info(f"File uploaded: {filename} by {request.client.host}")
logger.warning(f"Invalid file upload attempt: {file.filename}")
logger.error(f"Job failed: {job.id} - {error_message}")
```

### Audit Logging

**Track sensitive operations:**

```python
def audit_log(action: str, user: str, resource: str, details: dict):
    logger.info(
        "AUDIT",
        extra={
            "action": action,
            "user": user,
            "resource": resource,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "ip": request.client.host
        }
    )

# Usage
audit_log("DELETE", "admin", f"job_{job_id}", {"reason": "expired"})
```

### Security Monitoring

**Monitor for:**
- Failed login attempts (if auth implemented)
- Unusual upload patterns
- Large file uploads
- API rate limit hits
- Error rate spikes
- Unusual access times

**Alert on:**
- Multiple failed validations from same IP
- Rapid job creation
- Disk space critically low
- Service downtime

## Security Checklist

### Development

- [ ] `.env` file in `.gitignore`
- [ ] No secrets in code
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak information
- [ ] CORS configured for localhost

### Staging

- [ ] HTTPS enabled
- [ ] CORS configured for staging domain
- [ ] Resource limits set
- [ ] Logging enabled
- [ ] Security headers configured

### Production

- [ ] HTTPS with valid certificate
- [ ] CORS restricted to production domain
- [ ] Authentication implemented
- [ ] Rate limiting enabled
- [ ] Firewall configured
- [ ] Non-root containers
- [ ] Secrets in vault/secrets manager
- [ ] Regular backups configured
- [ ] Monitoring and alerting set up
- [ ] Security headers enabled
- [ ] Regular security updates
- [ ] Audit logging enabled
- [ ] Data retention policy implemented

### Regular Maintenance

- [ ] Update dependencies monthly
- [ ] Review access logs weekly
- [ ] Rotate secrets quarterly
- [ ] Security audit annually
- [ ] Penetration testing annually
- [ ] Review and update CORS origins
- [ ] Check for CVEs in dependencies
- [ ] Verify backup restoration

## Vulnerability Reporting

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email security details to: security@yourdomain.com
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Docker Security](https://docs.docker.com/engine/security/)

## Next Steps

- [Deployment Guide](deployment.md) - Secure deployment
- [Configuration Guide](configuration.md) - Secure configuration
- [Monitoring Guide](monitoring.md) - Security monitoring
