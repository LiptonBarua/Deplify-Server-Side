
const express = require('express');
const http= require("http")
const app= express();
const cors = require("cors")
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port =9000 || process.env.PORT;
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
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}


const uri = "mongodb+srv://deplify_user01:w5tSAJ1p7Jpb298d@cluster0.l1pkovt.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const usersCollection = client.db('deplify').collection('users');
        const paymentsCollection = client.db('deplify').collection('payments');
        //Note: make sure verify Admin after verify JWT
        const verifyAdmin = async (req, res, next) => {
            console.log('Inside verifyAdmin', req.decoded.email)
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }

        // //Getting JWT TOken 
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });



        //Loading all users: 
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
        app.patch('/users/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body.status
            const query = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: status
                }
            }
            const result = await usersCollection.updateOne(query, updatedDoc)
            res.send(result)
        })


        //payment Stipes 

        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        // Admin 

        app.delete('/users/:id',async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter)
            res.send(result)
        })


        //Make Admin 
        app.put('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        // getAmin 
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })

    //Updata User 
        app.get('/updateUser', async (req, res)=>{
            const email= req.query.email;
            const query= {email: email}
            const result= await usersCollection.findOne(query)
            res.send(result)
        })
        
   
    }
    finally {

    }
}
run().catch(console.dir);





app.get('/', async (req, res) => {
    res.send('deplefy server is running');
})






httpServer.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
