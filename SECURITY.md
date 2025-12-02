# Security Policy

## Security Features

This application implements several security measures to protect against common vulnerabilities:

### 1. CORS (Cross-Origin Resource Sharing) Protection

The application uses configurable CORS origins to prevent unauthorized access from untrusted domains.

**Configuration:**
```env
# Development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 2. File Upload Security

Multiple layers of validation are applied to uploaded files:

- **Extension Validation**: Only allowed audio file extensions (.mp3, .wav, .flac, .aac, .ogg, .m4a, .wma)
- **MIME Type Validation**: Validates file content using magic bytes (file signatures)
- **File Size Limits**: Configurable maximum file size (default: 500MB)
- **Path Traversal Prevention**: Filenames are sanitized to remove path separators and dangerous characters
- **Unique Naming**: UUID-based filenames prevent collisions and unauthorized overwrites

### 3. Input Validation

All user inputs are validated:

- Query parameters are validated and sanitized
- Path parameters are checked for valid formats
- Request bodies are validated using Pydantic schemas

### 4. Error Handling

- Detailed error messages are logged server-side
- User-facing error messages are sanitized to prevent information disclosure
- All exceptions are caught and handled gracefully

### 5. Database Security

- Parameterized queries (SQLAlchemy ORM) prevent SQL injection
- Database sessions are properly managed and closed
- Transaction rollback on errors

### 6. Logging

- Structured logging captures security-relevant events
- Sensitive information (API keys, passwords) is never logged
- Log levels can be configured for different environments

## Production Deployment Best Practices

### 1. Environment Variables

Never commit `.env` files to version control. Always use `.env.example` as a template.

Required security configurations:
```env
# Set to production domain(s)
ALLOWED_ORIGINS=https://yourdomain.com

# Disable reload mode
RELOAD_MODE=false

# Set appropriate log level
LOG_LEVEL=WARNING
```

### 2. HTTPS/TLS

Always use HTTPS in production:
- Use a reverse proxy (nginx, Caddy) with TLS certificates
- Enable HSTS (HTTP Strict Transport Security)
- Redirect all HTTP traffic to HTTPS

Example nginx configuration:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. API Key Management

- Store API keys securely (use secrets management tools)
- Rotate API keys regularly
- Never expose API keys in client-side code
- Use environment variables, never hardcode

### 4. Rate Limiting

Consider adding rate limiting to prevent abuse:
```python
# Example using slowapi
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/upload")
@limiter.limit("10/minute")
async def upload_audio(...):
    ...
```

### 5. File Storage

- Use separate volumes for uploaded files
- Implement file retention policies
- Regular backups of important data
- Consider using object storage (S3, MinIO) for production

### 6. Monitoring and Alerting

Set up monitoring for:
- Failed upload attempts
- Unusual traffic patterns
- Error rates
- Resource usage

### 7. Regular Updates

- Keep dependencies up to date
- Monitor security advisories
- Apply security patches promptly
- Review and update security configurations regularly

## Reporting Security Issues

If you discover a security vulnerability, please report it by:

1. **Do not** open a public GitHub issue
2. Contact the maintainers privately
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## Security Checklist for Production

- [ ] Set `ALLOWED_ORIGINS` to production domain(s)
- [ ] Set `RELOAD_MODE=false`
- [ ] Use HTTPS/TLS
- [ ] Secure API keys in secrets management
- [ ] Set appropriate `LOG_LEVEL` (WARNING or ERROR)
- [ ] Configure file size limits
- [ ] Set up monitoring and alerting
- [ ] Implement rate limiting
- [ ] Regular backups configured
- [ ] Keep dependencies updated
- [ ] Review and test all endpoints
- [ ] Conduct security audit

## Additional Security Considerations

### Docker Security

- Use non-root users in containers when possible
- Limit container capabilities
- Keep base images updated
- Scan images for vulnerabilities

### Network Security

- Use Docker networks to isolate services
- Restrict port exposure
- Use firewall rules
- Consider using a VPN for admin access

### Database Security

- Use strong passwords
- Limit database user permissions
- Regular backups
- Encrypt sensitive data at rest

## Compliance

Ensure compliance with relevant regulations:
- GDPR (if handling EU user data)
- CCPA (if handling California resident data)
- HIPAA (if handling healthcare data)
- Industry-specific regulations

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
