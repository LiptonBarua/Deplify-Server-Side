
const express = require('express');
const http = require("http")
const app = express();
const cors = require("cors")
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = 9000 || process.env.PORT;
app.use(cors())
app.use(express.json());
require('dotenv').config();

const httpServer = http.createServer(app);
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


    socket.on("reactEvent", (data) => {
        console.log(data)
        socket.broadcast.emit("showMessage", data)

    });
});

app.get('/', async (req, res) => {
    res.send('deplefy server is running');
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
            const query = { email: user.email };
            const alreadyExist = await usersCollection.findOne(query);
            if (alreadyExist) {
                return;
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        });
        app.patch('/user/:id', async (req, res) => {
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

        app.put('/profile', async (req, res) => {
            const userEmail = req.query.email;
            const file = req.body;
            const { email, phone, image, name, country, location } = file;

            const filter = { email: userEmail };

            const option = { upsert: true }
            const updatedDoc = {
                $set: {
                    email, phone, image, name, country, location
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, option)
            res.send(result)
        })

        app.get('/profile', async (req, res) => {
            let query = {}
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })

        app.put('/team', async (req, res) => {
            const userEmail = req.query.email;
            const data = req.body;
            const { teamName, email, name, logo, current } = data;
            const filter = { email: userEmail }
            const option = { upsert: true };
            const updatedDoc = {
                $set: {
                    teamName, email, name, logo, current
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, option)
            res.send(result)
        })

        app.get('/team', async(req, res)=>{
            const query={}
            if(req.query.email){
             query={
                email:req.query.email
             }
            }
          const result = await usersCollection.find(query).toArray();
          res.send(result)
        })
  
        

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
        app.get('/updateUser', async (req, res)=>{
            const email= req.query.email;
            const query= {email: email}
            const result= await usersCollection.findOne(query)
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


        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })
   
    }
    finally {

    }
}
run().catch(console.dir);












httpServer.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
