require('dotenv').config()
const cors = require('cors')
const express = require('express')
const { Server } = require("socket.io");
const WebSocket = require('ws');

const PORT = process.env.PORT || 5000

const app = express()
app.use(cors());
app.use(express.json())

const server = require('http').createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
})

let latestMessage = null;

function handleMessageFromOtherServer(message) {
    latestMessage = message;
}

setInterval(() => {
    if (latestMessage !== null) {
        io.emit("recieve_message", latestMessage);
        latestMessage = null;
    }
}, 1000);

io.on('connection', (socket) => {
    console.log('A new client connected')

    socket.on("message", (message) => {
        handleMessageFromOtherServer(message)
    })
})

app.get('/', (req, res) => res.send('Hello world!'));

const start = async () => { 
    try{
        server.listen(PORT, () => console.log(`Server started on ${PORT}`))
    } catch(e) { 
        console.log(e)
    }
}

start()