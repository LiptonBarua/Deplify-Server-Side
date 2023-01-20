
const express = require('express');
const http= require("http")
const app= express();
const cors = require("cors")
const { MongoClient, ServerApiVersion } = require('mongodb');
const port =5000 || process.env.PORT;
app.use(cors())
app.use(express.json());
require('dotenv').config();

const httpServer= http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"],
    }
})

io.on("connection", (socket) => {
  console.log("user is connected");

  socket.on("disconnection", (socket) => {
 console.log("user disconnected")
});

// socket.on("chatEvent", (data) => {
//     console.log(data)
//     io.emit("chatShow", data);
// });
socket.on("reactEvent", (data) => {
    console.log(data)
    socket.broadcast.emit("showMessage", data)
   
});
});

app.get('/teams', async (req, res)=>{
    res.send('Team Tech Airme')

})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m5hswga.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {

    }
    finally {

    }
}
run().catch(console.log);





app.get('/', async (req, res) => {
    res.send('deplefy server is running');
})






httpServer.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
