const express = require('express');
const cors = require('cors');
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.get('/',(req,res)=>res.type('html').send(`<p>Server connection for the custom function</p>`));

app.get('/ping',(req,res)=> {
    res.status(200).json({message: 'Server connected successfully',status: 'OK'});
});

app.post('/calculate',(req,res)=> {
    const {num1, num2} = req.body;

    const result = num1 + num2;

    res.status(200).json({message:`${num1} + ${num2} = ${result}`,status: 'OK'});
})

app.listen(PORT,()=>console.log(`listening on ${PORT}`));