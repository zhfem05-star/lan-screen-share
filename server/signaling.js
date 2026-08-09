const { WebSocketServer } = require('ws');

// SDP offer/answer, ICE candidate, ICE restart 메시지는 내용을 검사하지 않고
// sender <-> viewer 사이에 그대로 중계한다.
const RELAY_TYPES = new Set(['offer', 'answer', 'ice-candidate', 'ice-restart']);

function attachSignaling(httpServer, pin) {
  const wss = new WebSocketServer({ server: httpServer });

  // 1:1 세션만 지원 (다중 뷰어 미지원)
  let sender = null;
  let viewer = null;

  function send(socket, message) {
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  wss.on('connection', (socket) => {
    socket.role = null;

    socket.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        return;
      }

      if (message.type === 'join') {
        if (message.role === 'sender') {
          sender = socket;
          socket.role = 'sender';
          send(socket, { type: 'joined', role: 'sender' });
        } else if (message.role === 'viewer') {
          if (message.pin !== pin) {
            send(socket, { type: 'join-error', reason: 'invalid-pin' });
            socket.close();
            return;
          }
          viewer = socket;
          socket.role = 'viewer';
          send(socket, { type: 'joined', role: 'viewer' });
          send(sender, { type: 'viewer-joined' });
        }
        return;
      }

      if (RELAY_TYPES.has(message.type) && socket.role) {
        const target = socket.role === 'sender' ? viewer : sender;
        send(target, message);
      }
    });

    socket.on('close', () => {
      if (socket === sender) sender = null;
      if (socket === viewer) viewer = null;
    });
  });

  return wss;
}

module.exports = { attachSignaling };
