const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    res.send('deplefy server is running');
})


app.get('/team', async (req, res)=>{
    res.send('Team Tech Airme')
})

app.listen(port, () => console.log(`deplefy running on ${port}`));