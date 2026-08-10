# 실행 단계 (Roadmap)

최종 업데이트: 2026-08-07

요구사항/아키텍처 결정 배경은 [REQUIREMENTS.md](REQUIREMENTS.md) 참고.

## 진행 현황 (최종 업데이트: 2026-08-09)

- **완료**: Phase 0, Phase 1, Phase 2, Phase 3 (1단계 프로토타입 코드는 전부 작성됨)
- **다음 할 일**: Phase 4 (같은 LAN에서 PC+iPad 실기기 통합 테스트) — 여기서부터는 코드로 더 할 게 없고 **실제로 iPad를 붙여서 확인**해야 함
- `server/index.js` + `server/signaling.js` + `server/static.js`로 시그널링 서버 구현 완료. 수동 WebSocket 테스트 클라이언트로 sender/viewer 등록, PIN 오검증 거부, offer/answer/ice-restart 중계까지 직접 확인함 (테스트 스크립트는 커밋 안 하고 검증 후 삭제 — 자동화된 테스트 코드는 아직 없음)
- 서버 포트 기본값 `3000` (환경변수 `PORT`로 변경 가능). README에 있는 `netsh advfirewall` 방화벽 인바운드 규칙 — **이제 사용자가 직접 실행 완료함** (PC Chrome에서 LAN IP로 접속 확인됨, 처음엔 방화벽 때문에 막혔었음)
- `public/sender.html` + `public/js/sender.js`(PC), `public/viewer.html` + `public/js/viewer.js`(iPad) 둘 다 구현 완료. 화면 캡처, RTCPeerConnection, H.264 강제, offer/answer 생성, PIN 입력 폼, `<video>` 스트림 바인딩, connectionState 기반 재연결(disconnected 대기 / failed 시 ICE restart 1회 / 그래도 실패하면 iPad에서 alert) 전부 포함
- **미검증 — 중요**: `getDisplayMedia` 실제 화면 캡처와 WebRTC P2P 연결(offer↔answer↔ICE 교환 후 실제 스트림 송수신)은 브라우저 사용자 동작(화면 선택 다이얼로그)과 실제 iPad 기기가 필요해서 아직 자동으로 검증 못 함. Phase 4에서 처음으로 실제 확인 가능
- 개발 환경은 WSL 미사용, **네이티브 Windows**로 진행 결정 (이유: WSL2는 NAT 기반이라 iPad에서 LAN IP로 직접 접속 안 됨 + Phase 2 갈 경우 DXGI API가 애초에 Windows 전용이라 일관성 유지)
- 이 PC의 LAN IP: `x.x.x.x` (이더넷 어댑터 기준, 확인은 `ipconfig`. VMware 가상 어댑터의 IP는 무시)

## 알려진 이슈 (2026-08-10, 정식 Phase 4 이전 자체 MVP 테스트)

Phase 4 정식 통합 테스트 전에 가볍게 직접 돌려보다가 발견한 문제. 아직 원인 확정/수정 안 함.

- ~~오디오 송출이 안 되는 것으로 보임~~ → **해결됨**: Chrome 화면 공유 다이얼로그에서 "시스템 오디오 공유" 체크박스를 켜지 않아서였음. 체크하고 나니 정상 송출 확인됨. 코드 문제 아니었음.
- **화면 버벅임**: 요구사항엔 없는 항목이지만 체감상 꽤 버벅임. `getDisplayMedia`에 해상도/프레임레이트 제약이 없고, 캡처 트랙의 `contentHint`나 인코더 `degradationPreference`도 설정 안 해서 브라우저 기본값에 의존 중 — 브라우저 화면공유 트랙은 기본적으로 프레임레이트보다 해상도(디테일)를 우선하는 경향이 있어 움직임이 많으면 버벅이는 경우가 흔함. H.264 코덱 자체의 한계로 보이지는 않고, 캡처/인코더 설정 미조정 쪽에 무게가 실림.
- **오디오까지 켜면 버벅임이 더 심해짐**: LAN 환경이라 오디오 트래픽(수십~백여 kbps 수준)이 영상 대비 대역폭을 잡아먹어서일 가능성은 낮음. 소프트웨어 H.264 인코딩 + 시스템 오디오 루프백 캡처가 같은 CPU를 나눠 쓰면서 영상 인코딩이 밀리는(CPU 경합) 쪽이 유력한 가설. `chrome://webrtc-internals`로 실제 bitrate/인코딩 프레임레이트 비교해서 검증 예정 (아직 안 함).
- **체감 지연 수준**: 지금 상태로는 디스코드 다계정 화면공유(이 프로젝트를 시작하게 된 원래 인풋렉 문제 사례)와 비교해 큰 차이가 없는 정도의 지연이 있음. REQUIREMENTS.md에 이미 명시된 리스크("1단계 실측 결과가 30ms를 넘으면 바로 2단계 착수를 기본 시나리오로 설정")가 실제로 나타나는 신호일 수 있어서, 위 튜닝(캡처 제약/contentHint/하드웨어 인코더 확인)을 먼저 시도해보고 그래도 개선이 없으면 Phase 5 지연 측정을 기다리지 않고 Phase 6(네이티브 캡처) 조기 검토가 필요할 수 있음.

## Phase 0 — 프로젝트 기본 구조 세팅 (완료)
1. [x] `package.json` 초기화, Node.js 프로젝트 구조 생성
2. [x] 디렉터리 구조 설계: `/server` (시그널링 서버 + 정적 페이지 호스팅), `/public` (PC 송출 페이지, iPad 수신 페이지, 공용 JS)
3. [x] 로컬 LAN IP 확인 방법 정리 (PC의 `ipconfig`로 LAN IP 확인, 방화벽에서 사용할 포트 인바운드 허용) → [README.md](README.md)에 문서화

## Phase 1 — 시그널링 서버 구현 (완료)
1. [x] Node.js + `ws` 라이브러리로 WebSocket 시그널링 서버 구현 (상시 연결 유지 구조로 설계) → `server/signaling.js`
2. [x] PIN 인증 로직 추가: 서버 시작 시 랜덤 4자리 코드 생성 → iPad 접속 시 코드 검증 후에만 시그널링 메시지 중계 허용 → `server/index.js`(생성), `server/signaling.js`(검증). PC 송출 페이지에 PIN을 표시하는 UI는 Phase 2 몫
3. [x] SDP offer/answer, ICE candidate 교환 메시지 라우팅 구현 (1:1 세션 기준) → `server/signaling.js`
4. [x] ICE restart 재협상 요청도 같은 채널로 처리 가능하도록 메시지 타입 설계 → 같은 relay 로직으로 처리

## Phase 2 — PC 송출 페이지 (Chrome) (완료)
1. [x] `getDisplayMedia({ video: true, audio: true })`로 화면+오디오 캡처 → `public/js/sender.js`
2. [x] `RTCPeerConnection` 생성, 캡처한 MediaStreamTrack 추가 (STUN/TURN 없이 `iceServers: []`로 LAN 직접 연결만 사용)
3. [x] `setCodecPreferences()`로 H.264 코덱 최우선 순위 강제
4. [x] WebSocket으로 시그널링 서버에 연결, offer 생성 및 전송 (viewer-joined 수신 시점에 맞춰 offer 생성)
5. [x] `connectionState` 변화 감지 → disconnected는 상태 표시만, failed는 ICE restart 1회 시도 후 실패 시 상태 표시

## Phase 3 — iPad 수신 페이지 (Safari) (완료)
1. [x] PIN 코드 입력 화면 구현 → `public/viewer.html`
2. [x] `RTCPeerConnection` 생성, WebSocket으로 시그널링 서버 연결 후 answer 처리 → `public/js/viewer.js` (offer/ice-restart 메시지 둘 다 answer 생성 트리거)
3. [x] 수신한 스트림을 `<video>` 태그(autoplay, playsinline)에 바인딩
4. [x] `connectionState` 변화 감지 → ICE restart 1회까지는 대기, 그 이후에도 failed면 alert 표시

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

Phase 0~3 완료 (1단계 프로토타입 코드 작성 끝). 지금 시작할 작업: **Phase 4(같은 LAN에서 PC+iPad 실기기 통합 테스트)** — PIN 입력 → 연결 → 화면/오디오 수신까지 실제로 되는지 확인.
