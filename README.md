# S-Bus Link

속초시 중·고등학생 등·하교 편의를 위한 **실시간 버스 정보 웹앱** 초안.

프로젝트 전반 기준은 [`CLAUDE.md`](./CLAUDE.md) 참고.

## 구조 (모노레포 / npm workspaces)

```
apps/
  web/      # Vite + React + TS PWA (Leaflet 지도, 60fps 마커 보간)
  server/   # Fastify + ws + Redis(폴백) 풀링 데몬 + WebSocket 허브
packages/
  shared/   # 프론트/백 공용 타입 (GTFS-RT 호환 모델)
```

## 빠른 시작

```bash
# 1) 의존성 설치 (루트에서)
npm install

# 2) 환경변수 준비 (선택: 실데이터 연동 시)
cp .env.example .env      # TAGO_SERVICE_KEY 비워두면 모의 데이터로 구동

# 3) 백엔드 + 프론트 동시 실행
npm run dev               # server(4000) + web(5173)
# 또는 개별 실행
npm run dev:server
npm run dev:web
```

브라우저에서 http://localhost:5173 접속 → 속초 시내 지도 위로 1·7·9번
모의 버스가 실시간으로 움직입니다. 정류소를 클릭하면 도착 정보가 표시됩니다.

## 데이터 소스

- 기본값은 **모의 데이터**(`USE_MOCK=true`)로 키 없이 동작합니다.
- 실데이터: 공공데이터포털(data.go.kr)에서 국토교통부 **TAGO** API 키를 발급받아
  `.env` 의 `TAGO_SERVICE_KEY` 에 넣고 `USE_MOCK=false` 로 설정합니다.

> 비밀값(API 키)은 절대 커밋하지 않습니다. `.env` 는 `.gitignore` 처리됨.

## 현재 구현 범위 (초안)

- [x] 모노레포 + 공용 타입
- [x] 풀링 데몬 + 캐시(Redis/인메모리 폴백)
- [x] WebSocket 실시간 차량 위치 푸시
- [x] Leaflet 지도 + 60fps 마커 보간
- [x] PWA(매니페스트/서비스워커) 설정
- [x] 모의 데이터로 무키 구동
- [ ] 실 TAGO API 응답 필드 매핑 검증
- [ ] 정류소별 도착정보 실연동
- [ ] 인증/세션(OWASP ASVS), 모니터링
```
