import express from 'express';
import cors from 'cors';
import { getFirestore } from 'firebase/firestore';
import firebase from './db.js';

const app  = express();
const PORT = process.env.PORT || 3000;
const database = getFirestore(firebase);

console.log(database);

app.use(express.json());
app.use(cors());

// A get http request that gets root url and outputs a html output, in this case a paragraph with the text below.
app.get('/',(req,res)=>res.type('html').send(`<p>Server connection for the custom function</p>`));

// A get http request that will be used to test the server connection to the smartbuilder custom functions. 
app.get('/ping',(req,res)=> {
    res.status(200).json({message: 'Server connected successfully',status: 'OK'});
});

// A post http request that returns the sum of two numbers from the smartbuilder input fields.
app.post('/calculate',(req,res)=> {
    const {num1, num2} = req.body;
    if(typeof(num1) !== 'number' || typeof(num2) !== 'number'){
        res.status(400).json({message:"Invalid inputs. Number 1 and Number 2 must be numbers"})
    }

    const result = num1 + num2;

    res.status(200).json({message:`${num1} + ${num2} = ${result}`,status: 'OK'});
})

app.post('/getDetails',(req,res)=> {
    const {name,score} = req.body;
})


app.listen(PORT,()=>console.log(`listening on ${PORT}`));