import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv  from "dotenv"
import Test from './model.js';

dotenv.config();
const app  = express();
const PORT = process.env.PORT || 3000;
const mongoURL = process.env.MONGO_DB_URL;

app.use(express.json());
app.use(cors());

await mongoose.connect(mongoURL).then(()=>{
    console.log('Database connection established')
}).catch(error => {
    console.log(error)
})

// A get http request that gets root url and outputs a html output, in this case a paragraph with the text below.
app.get('/',(req,res)=>res.type('html').send(`<p>Server connection for the custom function</p>`));

// A get http request that will be used to test the server connection to the smartbuilder custom functions. 
app.get('/ping',(req,res)=> {
    res.status(200).json({message: 'Server connected successfully',status: 'OK'});
});

// A post http request that returns the sum of two numbers from the smartbuilder input fields.
app.post('/calculate',async(req,res)=> {
    const {num1, num2} = req.body;
    if(typeof(num1) !== 'number' || typeof(num2) !== 'number'){
        res.status(400).json({message:"Invalid inputs. Number 1 and Number 2 must be numbers"})
    }

    const result = num1 + num2;

    try {
        const test = new Test({num1:num1,num2:num2,result})
        await test.save();

        res.status(200).json({message:`Test Calculation successfully saved: ${num1}+${num2} = ${result}`,result,status:'OK'});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})


app.listen(PORT,()=>console.log(`listening on ${PORT}`));