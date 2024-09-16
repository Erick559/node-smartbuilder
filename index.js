import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv  from "dotenv"
import {Test,StudentDetails } from './model.js';

dotenv.config();
const app  = express();
const PORT = process.env.PORT || 3000;
const mongoURL = process.env.MONGO_DB_URL;

app.use(express.json());
app.use(cors());

mongoose.connect(mongoURL, {
    serverSelectionTimeoutMS: 50000, // Increase timeout to 50 seconds
}).then(() => {
    console.log('Database connection established');
}).catch(error => {
    console.log(error);
});

// A get http request that gets root url and outputs a html output, in this case a paragraph with the text below.
app.get('/',(req,res)=>res.type('html').send(`<p>Server connection for the custom function</p>`));


app.post('/saveStudentDetails', async (req, res) => {
    const { first_name, last_name, score } = req.body;  // Match keys with the client's payload

    try {
        const studentDetails = new StudentDetails({ first_name:first_name.toLowerCase(), last_name:last_name.toLowerCase(), score });
        await studentDetails.save();

        res.status(200).json({ 
            message: `The Student Details were successfully saved: ${first_name} ${last_name} with a score of ${score}`, 
            status: 'OK' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/getStudentDetails', async (req,res)=>{
    const {studentName} = req.body;

    try {
        const student = await StudentDetails.findOne({first_name:studentName});
        if (student){
            res.status(200).json({student:student, message:`${student.first_name} found`})
        }
        else {
            res.status(404).json({message:'Student not found'});
        } 
    } catch (error) {
        res.status(500).json({Error: error})
    }
})

app.listen(PORT,()=>console.log(`listening on ${PORT}`));