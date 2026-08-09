const http = require('http');
const crypto = require('crypto');
const { serveStatic } = require('./static');
const { attachSignaling } = require('./signaling');

const PORT = process.env.PORT || 3000;
const pin = String(crypto.randomInt(1000, 10000));

const server = http.createServer(serveStatic);
attachSignaling(server, pin);

server.listen(PORT, () => {
  console.log(`시그널링 서버 시작 (포트 ${PORT})`);
  console.log('LAN IP는 ipconfig로 확인 후 iPad에서 http://<LAN IP>:' + PORT + ' 로 접속');
  console.log(`PIN: ${pin}`);
});
