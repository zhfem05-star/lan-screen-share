const pinEl = document.getElementById('pin');
const statusEl = document.getElementById('status');
const shareBtn = document.getElementById('shareBtn');
const previewEl = document.getElementById('preview');

function setStatus(text) {
  statusEl.textContent = text;
}

const ws = new WebSocket(`ws://${location.host}`);

let pc = null;
let viewerJoined = false;
let iceRestartAttempted = false;

ws.addEventListener('open', () => {
  setStatus('서버 연결됨. PIN 발급 대기 중...');
  ws.send(JSON.stringify({ type: 'join', role: 'sender' }));
});

ws.addEventListener('close', () => setStatus('시그널링 서버 연결 끊김'));

ws.addEventListener('message', async (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'joined':
      pinEl.textContent = message.pin;
      setStatus('iPad 연결 대기 중');
      break;

    case 'viewer-joined':
      viewerJoined = true;
      setStatus('iPad 연결됨. 스트림 협상 중...');
      if (pc) {
        await createAndSendOffer();
      }
      break;

    case 'answer':
      await pc.setRemoteDescription(message.sdp);
      setStatus('스트리밍 중');
      break;

    case 'ice-candidate':
      if (message.candidate) {
        await pc.addIceCandidate(message.candidate);
      }
      break;
  }
});

shareBtn.addEventListener('click', async () => {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  previewEl.srcObject = stream;

  // LAN 내부 직접 연결만 사용하므로 STUN/TURN 서버를 두지 않는다.
  pc = new RTCPeerConnection({ iceServers: [] });

  for (const track of stream.getTracks()) {
    pc.addTrack(track, stream);
  }

  const videoTransceiver = pc.getTransceivers().find(
    (t) => t.sender && t.sender.track && t.sender.track.kind === 'video'
  );
  if (videoTransceiver && typeof videoTransceiver.setCodecPreferences === 'function') {
    const capabilities = RTCRtpSender.getCapabilities('video');
    const h264 = capabilities.codecs.filter((c) => c.mimeType === 'video/H264');
    const others = capabilities.codecs.filter((c) => c.mimeType !== 'video/H264');
    videoTransceiver.setCodecPreferences([...h264, ...others]);
  }

  pc.addEventListener('icecandidate', (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
    }
  });

  pc.addEventListener('connectionstatechange', () => handleConnectionStateChange());

  setStatus(viewerJoined ? '스트림 협상 중...' : '화면 캡처 완료. iPad 연결 대기 중');
  shareBtn.disabled = true;

  if (viewerJoined) {
    await createAndSendOffer();
  }
});

async function createAndSendOffer() {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription }));
}

function handleConnectionStateChange() {
  const state = pc.connectionState;

  if (state === 'disconnected') {
    setStatus('일시적 연결 끊김. 자동 복구 대기 중...');
    return;
  }

  if (state === 'failed') {
    if (!iceRestartAttempted) {
      iceRestartAttempted = true;
      setStatus('연결 실패. ICE 재협상 시도 중...');
      restartIce();
    } else {
      setStatus('연결 복구 실패');
    }
    return;
  }

  if (state === 'connected') {
    setStatus('스트리밍 중');
  }
}

async function restartIce() {
  const offer = await pc.createOffer({ iceRestart: true });
  await pc.setLocalDescription(offer);
  ws.send(JSON.stringify({ type: 'ice-restart', sdp: pc.localDescription }));
}
