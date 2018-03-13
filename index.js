const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const tcpPort = process.env.PORT || 9600;

const SerialPort = require('serialport');
const portName = process.argv[2] || 'COM5';
let trackingId;

const port = new SerialPort(portName, err => {
  if (err) {
    return console.log('Error: ', err.message);
  }

  return {
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false,
  };
});

/* ===========================================
*
* Setup a simple server.
*
=========================================== */

// app.get('/', (req, res) => {
//   res.sendfile('index.html');
// });

http.listen(tcpPort, () => {
  console.log(`listening on http://localhost:${tcpPort}`);
});

/* ===========================================
*
*  Socket.io stuff
*
=========================================== */

io.on('connection', socket => {
  console.log('An user connected');

  /**
   * Socket listener to determine whether or not to send
   * values to web application.
   */

  socket.on('message', msg => {
    console.log('Tracking: ', msg);
    const regexTrackingId = /(S|E)[0-9]{8,10}/;
    if (regexTrackingId.test(msg)) trackingId = msg;
  });
});

/* ===========================================
*
* Serialport stuff
*
=========================================== */

port.on('open', () => {
  console.log('Port is open!');
});

port.on('data', data => {
  const asciiData = data.toString('ascii');
  const removedSpecialChar = asciiData.replace(/[^(a-zA-Z0-9\+)]/g, '');
  const regex = /((\+03EA)|(\+EA)|(\+A)|(03EA))\d{1,5}/g;
  let catchedData = (removedSpecialChar.match(regex) && removedSpecialChar.match(regex)[0]) || '';
  catchedData = catchedData && catchedData.replace(/((\+03EA)|(\+EA)|(\+A)|(03EA))/g, '');
  catchedData = catchedData && catchedData.replace(/0{1,}$/g, '');
  catchedData = catchedData && parseInt(catchedData);
  if (catchedData && trackingId) {
    io.sockets.emit(trackingId, catchedData);
    console.log(`Sent ${catchedData} to ${trackingId}`);
  }
});

port.on('close', () => {
  console.log('Serial port disconnected.');
  io.sockets.emit('close');
});
