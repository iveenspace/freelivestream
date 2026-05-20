const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// This creates the webpage directly from this file
app.get('/', (req, res) => {
    res.send(`
    <html>
        <body>
            <h1>Live Stream</h1>
            <button id="btn">I am the Streamer</button>
            <video id="v" autoplay playsinline style="width:500px; background:#000;"></video>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                document.getElementById('btn').onclick = async () => {
                    const stream = await navigator.mediaDevices.getDisplayMedia({video:true, audio:true});
                    document.getElementById('v').srcObject = stream;
                    alert("Streaming Started!");
                };
            </script>
        </body>
    </html>`);
});

io.on('connection', (socket) => {
    console.log('User connected');
});

server.listen(3000, () => console.log('Go to http://localhost:3000'));