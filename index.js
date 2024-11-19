require('dotenv').config()
const { default: axios } = require('axios');
const cors = require('cors')
const express = require('express')
const { Server } = require("socket.io");
const WebSocket = require('ws');

const PORT = process.env.PORT || 5000

const app = express()
app.use(cors());
app.use(express.json())

const server = require('http').createServer(app);

const io = new Server(server)

setInterval(() => {
    try{
        axios.get(process.env.API_URL+"/stat/latest")
        .then(data => {
            io.emit("recieve_message", data.data);
        })
        .catch(e => {
            console.log(e)
        })
    } catch (e) {
        console.log(e)
    }
    
}, 1000);

io.on('connection', (socket) => {
    console.log('A new client connected')
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