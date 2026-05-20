const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

io.on('connection', (socket) => {
    // Relay WebRTC signals between clients
    socket.on('signal', (data) => {
        socket.broadcast.emit('signal', data);
    });
});

http.listen(3000, () => console.log('Server running on http://localhost:3000'));
