# Nginx Proxy Manager 설정 가이드

## 📋 개요

Whisper WebUI를 Nginx Proxy Manager를 통해 외부에서 접속 가능하도록 설정하는 방법입니다.

---

## 🔧 1. Whisper WebUI 서버 준비

### 현재 서버 정보
- **로컬 IP**: `172.20.159.239`
- **Backend Port**: `8000`
- **Frontend Port**: `5173`

### 서비스 재시작

변경된 설정을 적용하기 위해 서비스를 재시작합니다:

```bash
cd /home/ycubuntu/Projects/web/whisper/whisper_webui
docker-compose restart
```

### 접근 테스트

다른 LAN 서버에서 접근이 가능한지 확인:

```bash
# Nginx Proxy Manager 서버에서 실행
curl http://172.20.159.239:8000/
curl http://172.20.159.239:5173/
```

---

## 🌐 2. Nginx Proxy Manager 설정

### Option A: 단일 도메인 (권장)

**하나의 도메인으로 Frontend와 Backend 모두 처리**

#### Nginx Proxy Manager 설정

1. **Proxy Host 추가**
   - Domain Names: `whisper.yourdomain.com`
   - Scheme: `http`
   - Forward Hostname/IP: `172.20.159.239`
   - Forward Port: `5173`
   - Cache Assets: ✅ (선택)
   - Block Common Exploits: ✅ (권장)
   - Websockets Support: ✅ (중요!)

2. **Custom Locations 추가** (API 프록시)

   **Location**: `/api`
   ```nginx
   proxy_pass http://172.20.159.239:8000;
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection 'upgrade';
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   proxy_cache_bypass $http_upgrade;

   # Timeouts for long transcription jobs
   proxy_connect_timeout 300;
   proxy_send_timeout 300;
   proxy_read_timeout 300;
   send_timeout 300;
   ```

3. **SSL 인증서**
   - SSL Certificate: Let's Encrypt 또는 기존 인증서
   - Force SSL: ✅
   - HTTP/2 Support: ✅

---

### Option B: 별도 서브도메인 (복잡함)

**Frontend와 Backend를 별도 도메인으로 분리**

#### Frontend Proxy Host
- Domain: `whisper.yourdomain.com`
- Forward to: `172.20.159.239:5173`

#### Backend Proxy Host
- Domain: `api-whisper.yourdomain.com`
- Forward to: `172.20.159.239:8000`

#### Frontend 환경 변수 수정 필요
```env
VITE_API_URL=https://api-whisper.yourdomain.com
```

⚠️ **이 방식은 CORS 설정이 복잡하므로 권장하지 않습니다.**

---

## 🔐 3. CORS 설정 (Option A 선택 시)

Option A를 사용하면 동일 도메인이므로 CORS 문제가 발생하지 않습니다.

만약 Option B를 사용한다면 Backend의 CORS 설정을 수정해야 합니다:

```python
# backend/config.py
allowed_origins: str = "https://whisper.yourdomain.com,https://api-whisper.yourdomain.com"
```

---

## 📝 4. 완전한 Nginx 설정 예시 (Advanced Custom Config)

Nginx Proxy Manager의 "Custom Nginx Configuration" 탭에 추가:

```nginx
# API 경로 처리
location /api {
    proxy_pass http://172.20.159.239:8000;
    proxy_http_version 1.1;

    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';

    # Headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Disable caching for API
    proxy_cache_bypass $http_upgrade;

    # Timeouts (긴 transcription 작업 대응)
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    # Buffer settings
    proxy_buffering off;
    proxy_request_buffering off;
}

# File upload size limit (큰 오디오 파일 업로드)
client_max_body_size 500M;
client_body_timeout 300s;

# Gzip compression
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

---

## 🧪 5. 테스트

### 5.1 Backend API 테스트
```bash
curl https://whisper.yourdomain.com/api/jobs
```

**Expected Output:**
```json
{
  "jobs": [],
  "total": 0
}
```

### 5.2 Frontend 테스트
브라우저에서 접속:
```
https://whisper.yourdomain.com
```

### 5.3 파일 업로드 테스트
1. Frontend에서 오디오 파일 업로드
2. Transcribe 작업 생성
3. 작업 목록에서 진행 상황 확인

---

## 🐛 문제 해결

### 문제 1: API 요청이 404 에러

**증상:**
```
GET https://whisper.yourdomain.com/api/jobs 404
```

**해결:**
- Nginx Custom Locations에 `/api` 경로가 추가되었는지 확인
- Backend 서버가 실행 중인지 확인: `curl http://172.20.159.239:8000/api/jobs`

---

### 문제 2: 파일 업로드 실패 (413 Payload Too Large)

**증상:**
```
413 Request Entity Too Large
```

**해결:**
Nginx Custom Config에 추가:
```nginx
client_max_body_size 500M;
```

---

### 문제 3: Transcription 타임아웃

**증상:**
긴 오디오 파일 처리 중 504 Gateway Timeout

**해결:**
Nginx Custom Config의 timeout 값 확인:
```nginx
proxy_read_timeout 600s;  # 10분으로 증가
```

---

### 문제 4: WebSocket 연결 실패

**증상:**
실시간 업데이트가 작동하지 않음

**해결:**
Proxy Host 설정에서:
- ✅ Websockets Support 활성화
- Custom Config에 WebSocket 헤더 추가

---

## 📊 권장 설정 요약

| 설정 항목 | 값 | 이유 |
|----------|-----|------|
| **Domain** | `whisper.yourdomain.com` | 단일 도메인 사용 |
| **Forward Host** | `172.20.159.239:5173` | Frontend 포트 |
| **Custom Location** | `/api` → `172.20.159.239:8000` | Backend API 프록시 |
| **WebSocket** | ✅ Enabled | 실시간 업데이트 |
| **SSL** | Let's Encrypt | 무료 인증서 |
| **Force SSL** | ✅ | 보안 강화 |
| **Timeouts** | 300초 | 긴 작업 대응 |
| **Upload Limit** | 500MB | 큰 오디오 파일 |

---

## 🚀 최종 확인 체크리스트

- [ ] Docker Compose 포트가 `0.0.0.0`에 바인딩됨
- [ ] 서비스 재시작 완료
- [ ] LAN 내부에서 직접 접근 테스트 성공
- [ ] Nginx Proxy Manager에 Proxy Host 추가
- [ ] Custom Location으로 `/api` 경로 추가
- [ ] SSL 인증서 발급 및 적용
- [ ] WebSocket 지원 활성화
- [ ] 외부에서 Frontend 접속 테스트
- [ ] 외부에서 API 호출 테스트
- [ ] 파일 업로드 및 Transcription 테스트

---

## 📞 추가 도움말

### Nginx Proxy Manager 공식 문서
- https://nginxproxymanager.com/guide/

### 보안 강화 팁
1. **IP 화이트리스트**: Access List 기능으로 특정 IP만 허용
2. **Basic Auth**: 추가 인증 레이어
3. **Rate Limiting**: DDoS 방지
4. **Custom 404 페이지**: 정보 노출 방지

### 성능 최적화
1. **Caching**: Static assets 캐싱 활성화
2. **HTTP/2**: 더 빠른 로딩
3. **Gzip**: 전송 데이터 압축
4. **CDN**: Cloudflare 등 CDN 연동 (선택)

---

## 🎯 완료!

이제 `https://whisper.yourdomain.com`으로 접속하면 Whisper WebUI를 사용할 수 있습니다! 🎉
