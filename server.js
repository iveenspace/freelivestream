// server.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

/* =========================
   STATIC FILES
========================= */

app.use(express.static(path.join(__dirname, "public")));

/* =========================
   SIMPLE ROOM STATE
========================= */

let streamerSocketId = null;
let viewers = new Set();

/* =========================
   SOCKET CONNECTION
========================= */

io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    /* =========================
       USER ROLE JOIN
    ========================= */

    socket.on("join", (role) => {

        socket.role = role;

        console.log(
            `${socket.id} joined as ${role}`
        );

        if(role === "streamer"){

            streamerSocketId = socket.id;

            socket.broadcast.emit("streamer-online");

        }

        if(role === "viewer"){

            viewers.add(socket.id);

            io.emit("stats-update", {
                viewerCount: viewers.size
            });

            if(streamerSocketId){

                io.to(streamerSocketId)
                    .emit("viewer-joined");
            }
        }
    });

    /* =========================
       WEBRTC SIGNALING
    ========================= */

    socket.on("offer", (offer) => {

        socket.broadcast.emit("offer", offer);

    });

    socket.on("answer", (answer) => {

        socket.broadcast.emit("answer", answer);

    });

    socket.on("ice-candidate", (candidate) => {

        socket.broadcast.emit(
            "ice-candidate",
            candidate
        );

    });

    /* =========================
       STREAM ENDED
    ========================= */

    socket.on("stream-ended", () => {

        console.log("Stream ended");

        io.emit("stream-ended");

    });

    /* =========================
       DISCONNECT
    ========================= */

    socket.on("disconnect", () => {

        console.log(
            "Disconnected:",
            socket.id
        );

        if(socket.role === "streamer"){

            streamerSocketId = null;

            io.emit("stream-ended");
        }

        if(socket.role === "viewer"){

            viewers.delete(socket.id);

            io.emit("stats-update", {
                viewerCount: viewers.size
            });
        }
    });

});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log(`
==================================
Server running on:
http://localhost:${PORT}
==================================
    `);

});
