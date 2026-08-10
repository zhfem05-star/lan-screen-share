const pinForm = document.getElementById('pinForm');
const pinInput = document.getElementById('pinInput');
const errorEl = document.getElementById('error');
const statusEl = document.getElementById('status');
const videoEl = document.getElementById('remoteVideo');

function setStatus(text) {
  statusEl.textContent = text;
}

function setError(text) {
  errorEl.textContent = text;
}

let ws = null;
let pc = null;
let iceRestartAttempted = false;
let alertShown = false;

pinForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const pin = pinInput.value.trim();
  if (!/^\d{4}$/.test(pin)) {
    setError('4자리 숫자를 입력하세요');
    return;
  }
  setError('');
  connect(pin);
});

function connect(pin) {
  ws = new WebSocket(`ws://${location.host}`);

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'join', role: 'viewer', pin }));
  });

  ws.addEventListener('close', () => setStatus('시그널링 서버 연결 끊김'));

  ws.addEventListener('message', (event) => handleMessage(JSON.parse(event.data)));
}

async function handleMessage(message) {
  switch (message.type) {
    case 'joined':
      pinForm.style.display = 'none';
      setStatus('연결됨. PC 화면 대기 중...');
      break;

    case 'join-error':
      setError('PIN이 올바르지 않습니다');
      break;

    case 'offer':
      await handleOffer(message.sdp);
      break;

    case 'ice-restart':
      iceRestartAttempted = true;
      await handleOffer(message.sdp);
      break;

    case 'ice-candidate':
      if (message.candidate && pc) {
        await pc.addIceCandidate(message.candidate);
      }
      break;
  }
}

async function handleOffer(sdp) {
  if (!pc) {
    pc = createPeerConnection();
  }
  await pc.setRemoteDescription(sdp);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  ws.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription }));
  setStatus('스트림 협상 중...');
}

function createPeerConnection() {
  // LAN 내부 직접 연결만 사용하므로 STUN/TURN 서버를 두지 않는다.
  const connection = new RTCPeerConnection({ iceServers: [] });

  connection.addEventListener('track', (event) => {
    videoEl.srcObject = event.streams[0];
    videoEl.style.display = 'block';
    setStatus('스트리밍 중');
  });

  connection.addEventListener('icecandidate', (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
    }
  });

  connection.addEventListener('connectionstatechange', () => {
    const state = connection.connectionState;

    if (state === 'disconnected') {
      setStatus('일시적 연결 끊김. 자동 복구 대기 중...');
      return;
    }

    if (state === 'failed') {
      if (!iceRestartAttempted) {
        setStatus('연결 실패. 재협상 대기 중...');
      } else if (!alertShown) {
        alertShown = true;
        alert('연결이 끊어졌습니다. 새로고침 후 다시 시도해주세요.');
      }
      return;
    }

    if (state === 'connected') {
      setStatus('스트리밍 중');
    }
  });

  return connection;
}
