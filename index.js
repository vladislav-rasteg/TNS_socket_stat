require('dotenv').config()
const express = require('express')

const PORT = process.env.PORT || 5000

const app = express()
app.use(cors());
app.use(express.json())
const server = require('http').createServer(app);

app.get('/', (req, res) => res.send('Hello world!'));


const start = async () => { 
    try{
        server.listen(PORT, () => console.log(`Server started on ${PORT}`))
    } catch(e) { 
        console.log(e)
    }
}

start()