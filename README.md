# lan-screen-share

같은 LAN 내에서 PC 화면(+오디오)을 캡처해 iPad로 실시간 스트리밍하는 프로젝트.
배경/요구사항은 [REQUIREMENTS.md](REQUIREMENTS.md), 진행 단계는 [ROADMAP.md](ROADMAP.md) 참고.

## 구현 현황

시그널링 서버(PIN 인증, SDP/ICE 중계)까지 구현됨. PC 송출 페이지·iPad 수신 페이지(`/public`)는 아직 없음. 자세한 진행 상황은 [ROADMAP.md](ROADMAP.md#진행-현황-최종-업데이트-2026-08-09) 참고.

## 실행

```
npm install
npm start
```

포트 번호는 환경변수 `PORT`로 변경 가능하다 (예: `PORT=xxxx npm start`). 서버를 시작하면 콘솔에 랜덤 4자리 PIN이 출력되며, iPad 접속 시 이 PIN을 입력해야 시그널링 메시지가 중계된다.

## LAN IP 확인

PC에서 PowerShell/cmd로 확인:

```
ipconfig
```

`이더넷` 또는 `Wi-Fi` 어댑터의 `IPv4 Address` 값을 사용한다. VMware/가상 어댑터(예: `VMware Network Adapter VMnet1`, `VMnet8`)의 IP는 LAN이 아니라 로컬 가상 네트워크이므로 무시할 것.

iPad는 같은 Wi-Fi에서 `http://<PC의 LAN IP>:<포트>` 로 접속한다.

## 방화벽

서버가 사용할 포트(기본 3000)에 대해 Windows 방화벽 인바운드 규칙을 허용해야 iPad에서 접속 가능하다. 아직 실행하지 않았고, 실제 기기로 접속 테스트할 때(Phase 4) 필요 시 실행할 것:

```
netsh advfirewall firewall add rule name="lan-screen-share" dir=in action=allow protocol=TCP localport=<포트>
```
