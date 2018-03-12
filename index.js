const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const tcpPort = process.env.PORT || 9600;

const SerialPort = require('serialport');

const port = new SerialPort('COM5', err => {
  if (err) {
    return console.log('Error: ', err.message);
  }

  return {
    baudrate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false,
  };
});

const byteParser = new SerialPort.parsers.ByteLength({ length: 1 });
port.pipe(byteParser);

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
    if (regexTrackingId.test(msg)) {
      io.sockets.emit(msg, 200);
      console.log(`Sent to ${msg}`);
    }
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

// Switches the port into "flowing mode"
port.on('data', data => {
  console.log('Data:', data);
});

// Read data that is available but keep the stream from entering "flowing mode"
port.on('readable', () => {
  console.log('Data:', port.read());
});

/**
 * listen to the bytes as they are parsed from the parser.
 */
byteParser.on('data', data => {
  console.log('Data:', data);
  io.sockets.emit('New message', 'message');
});

port.on('close', () => {
  console.log('Serial port disconnected.');
  io.sockets.emit('close');
});
