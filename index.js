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
  const utf8Data = data.toString('utf8');

  const regex = /\d{7,11}/g; // Tìm số có 7 đến 11 chữ số
  let catchedData = (utf8Data.match(regex) && utf8Data.match(regex)[0]) || '';

  if (catchedData && trackingId) {
    catchedData = catchedData.replace(/0{1,}$/g, ''); // Xóa hết số 0 ở cuối
    const numberOfZerosToRemove = parseInt(catchedData.substr(catchedData.length - 1)); // Lấy ra số số 0 phải bỏ đi bằng số cuối cùng
    catchedData = catchedData.substr(0, catchedData.length - 1); // Xóa số cuối

    catchedData = catchedData.substr(0, catchedData.length - numberOfZerosToRemove); // Bỏ số số 0 phải bỏ đi
    catchedData = parseInt(catchedData);

    io.sockets.emit(trackingId, catchedData);
    console.log(`Sent ${catchedData} to ${trackingId}`);
    io.sockets.emit('close');
  }
});

splitValue = (value, index) => {
  return value.substring(0, index) + ',' + value.substring(index);
};

port.on('close', () => {
  console.log('Serial port disconnected.');
  io.sockets.emit('close');
});
