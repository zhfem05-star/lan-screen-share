# 실행 단계 (Roadmap)

최종 업데이트: 2026-08-07

요구사항/아키텍처 결정 배경은 [REQUIREMENTS.md](REQUIREMENTS.md) 참고.

## 진행 현황 (최종 업데이트: 2026-08-09)

- **완료**: Phase 0, Phase 1 (둘 다 커밋됨)
- **다음 할 일**: Phase 2 (PC 송출 페이지)
- `server/index.js` + `server/signaling.js` + `server/static.js`로 시그널링 서버 구현 완료. 수동 WebSocket 테스트 클라이언트로 sender/viewer 등록, PIN 오검증 거부, offer 중계까지 직접 확인함 (테스트 스크립트는 커밋 안 하고 검증 후 삭제 — 자동화된 테스트 코드는 아직 없음)
- 서버 포트 기본값 `3000` (환경변수 `PORT`로 변경 가능, 코드에서 결정됨). README에 있는 `netsh advfirewall` 방화벽 인바운드 규칙은 아직 **직접 실행 안 함** — 실제 기기로 접속 테스트할 때(Phase 4) 실행 필요
- PC 송출 페이지(Phase 2)와 iPad 수신 페이지(Phase 3)는 아직 없음 — `/public`은 빈 디렉터리(`.gitkeep`만 있음). 화면 캡처/`RTCPeerConnection` 관련 로직은 전혀 작성 안 된 상태
- 개발 환경은 WSL 미사용, **네이티브 Windows**로 진행 결정 (이유: WSL2는 NAT 기반이라 iPad에서 LAN IP로 직접 접속 안 됨 + Phase 2 갈 경우 DXGI API가 애초에 Windows 전용이라 일관성 유지)
- 이 PC의 LAN IP: `x.x.x.x` (이더넷 어댑터 기준, 확인은 `ipconfig`. VMware 가상 어댑터의 IP는 무시)

## Phase 0 — 프로젝트 기본 구조 세팅 (완료)
1. [x] `package.json` 초기화, Node.js 프로젝트 구조 생성
2. [x] 디렉터리 구조 설계: `/server` (시그널링 서버 + 정적 페이지 호스팅), `/public` (PC 송출 페이지, iPad 수신 페이지, 공용 JS)
3. [x] 로컬 LAN IP 확인 방법 정리 (PC의 `ipconfig`로 LAN IP 확인, 방화벽에서 사용할 포트 인바운드 허용) → [README.md](README.md)에 문서화

## Phase 1 — 시그널링 서버 구현 (완료)
1. [x] Node.js + `ws` 라이브러리로 WebSocket 시그널링 서버 구현 (상시 연결 유지 구조로 설계) → `server/signaling.js`
2. [x] PIN 인증 로직 추가: 서버 시작 시 랜덤 4자리 코드 생성 → iPad 접속 시 코드 검증 후에만 시그널링 메시지 중계 허용 → `server/index.js`(생성), `server/signaling.js`(검증). PC 송출 페이지에 PIN을 표시하는 UI는 Phase 2 몫
3. [x] SDP offer/answer, ICE candidate 교환 메시지 라우팅 구현 (1:1 세션 기준) → `server/signaling.js`
4. [x] ICE restart 재협상 요청도 같은 채널로 처리 가능하도록 메시지 타입 설계 → 같은 relay 로직으로 처리

## Phase 2 — PC 송출 페이지 (Chrome)
1. `getDisplayMedia({ video: true, audio: true })`로 화면+오디오 캡처
2. `RTCPeerConnection` 생성, 캡처한 MediaStreamTrack 추가
3. `setCodecPreferences()`로 H.264 코덱 최우선 순위 강제
4. WebSocket으로 시그널링 서버에 연결, offer 생성 및 전송
5. `connectionState` 변화 감지 → disconnected/failed 상태에 따른 재연결 로직 구현

## Phase 3 — iPad 수신 페이지 (Safari)
1. PIN 코드 입력 화면 구현
2. `RTCPeerConnection` 생성, WebSocket으로 시그널링 서버 연결 후 answer 처리
3. 수신한 스트림을 `<video>` 태그(autoplay, playsinline)에 바인딩
4. `connectionState` 변화 감지 → 재연결 시도 실패 시 alert 표시

## Phase 4 — 1차 통합 테스트 (같은 LAN)
1. PC와 iPad를 같은 Wi-Fi에 연결한 상태로 전체 흐름 테스트 (PIN 입력 → 연결 → 화면/오디오 수신)
2. mDNS candidate 문제 발생 여부 확인 (연결 자체가 안 되면 이 문제일 가능성 높음 → 발생 시 별도로 조사)
3. 디스코드 등 다른 앱 오디오와의 간섭 여부 실측 확인 (믹싱 안 되는 것은 예상된 결과이므로, 어떤 식으로 끊기는지만 확인)

## Phase 5 — 지연 측정
1. 측정 방법 정하기 (예: PC 화면에 타임스탬프/스톱워치를 띄워 캡처하고, iPad 화면에 뜨는 같은 타임스탬프와의 차이를 사진/영상으로 비교)
2. 여러 번 반복 측정해 평균 지연 산출
3. **판단 기준**: 30ms 이하 → 1단계로 확정하고 마무리 / 30ms 초과 → 2단계(네이티브 캡처) 착수

## Phase 6 — (조건부) 네이티브 캡처로 전환
- Phase 5에서 지연이 30ms를 초과한 경우에만 진행
1. DXGI Desktop Duplication API로 프레임 캡처 프로토타입 작성 (C++ 또는 Rust)
2. NVENC/QuickSync 하드웨어 인코더 연동, `zerolatency` 프리셋 적용
3. libdatachannel로 WebRTC 미디어 트랙 생성, 기존 시그널링 서버와 연동
4. iPad 수신을 네이티브 앱(Swift) 또는 최소 변경한 WKWebView 페이지로 전환
5. Phase 5의 측정 방법으로 재측정, 목표 달성 여부 확인

## 다음 액션

Phase 0, Phase 1 완료. 지금 시작할 작업: **Phase 2(PC 송출 페이지) → Phase 3(iPad 수신 페이지)** 순서로 1단계 프로토타입 구현.
