const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store active streamers and viewers
const streamers = {}; // { streamerId: { socketId, viewers: [] } }
const viewers = {}; // { viewerId: { socketId, watchingStreamerId } }

// Simple health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (role) => {
    console.log(`${socket.id} joined as ${role}`);

    if (role === "streamer") {
      streamers[socket.id] = {
        socketId: socket.id,
        viewers: []
      };
      socket.emit("joined", { role: "streamer", streamerId: socket.id });
      io.emit("streamer-online", { streamerId: socket.id });
      console.log("Active streamers:", Object.keys(streamers).length);
    } else if (role === "viewer") {
      // Get list of active streamers
      const activeStreamers = Object.keys(streamers).map(id => ({ id }));
      socket.emit("streamer-list", activeStreamers);
      socket.emit("joined", { role: "viewer", viewerId: socket.id });
    }
  });

  // Viewer selects a streamer to watch
  socket.on("watch-streamer", (streamerId) => {
    if (streamers[streamerId]) {
      viewers[socket.id] = {
        socketId: socket.id,
        watchingStreamerId: streamerId
      };
      streamers[streamerId].viewers.push(socket.id);
      
      // Notify streamer of new viewer
      io.to(streamerId).emit("viewer-connected", {
        viewerId: socket.id,
        totalViewers: streamers[streamerId].viewers.length
      });
      
      socket.emit("watching-streamer", { streamerId });
      console.log(`Viewer ${socket.id} watching streamer ${streamerId}`);
    }
  });

  // WebRTC Signaling: Offer (from streamer to viewer or vice versa)
  socket.on("offer", ({ to, offer }) => {
    console.log("Relaying offer from", socket.id, "to", to);
    io.to(to).emit("offer", {
      from: socket.id,
      offer: offer
    });
  });

  // WebRTC Signaling: Answer
  socket.on("answer", ({ to, answer }) => {
    console.log("Relaying answer from", socket.id, "to", to);
    io.to(to).emit("answer", {
      from: socket.id,
      answer: answer
    });
  });

  // WebRTC Signaling: ICE Candidate
  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate: candidate
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // If disconnected user was a streamer
    if (streamers[socket.id]) {
      const viewerCount = streamers[socket.id].viewers.length;
      streamers[socket.id].viewers.forEach(viewerId => {
        io.to(viewerId).emit("streamer-offline", { streamerId: socket.id });
        delete viewers[viewerId];
      });
      delete streamers[socket.id];
      io.emit("streamer-offline", { streamerId: socket.id });
      console.log(`Streamer disconnected. Notified ${viewerCount} viewers.`);
    }

    // If disconnected user was a viewer
    if (viewers[socket.id]) {
      const streamerId = viewers[socket.id].watchingStreamerId;
      if (streamers[streamerId]) {
        streamers[streamerId].viewers = streamers[streamerId].viewers.filter(
          id => id !== socket.id
        );
        io.to(streamerId).emit("viewer-disconnected", {
          viewerId: socket.id,
          totalViewers: streamers[streamerId].viewers.length
        });
      }
      delete viewers[socket.id];
    }

    console.log("Active streamers:", Object.keys(streamers).length);
    console.log("Active viewers:", Object.keys(viewers).length);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎬 WebRTC Signaling Server running on http://localhost:${PORT}`);
});
