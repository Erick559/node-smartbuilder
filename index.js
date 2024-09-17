import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from "dotenv";
import { Test, StudentDetails } from './model.js';
import PDFDocument from 'pdfkit';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const mongoURL = process.env.MONGO_DB_URL;

app.use(express.json({ limit: '50mb' }));
app.use(cors());

mongoose.connect(mongoURL, {
    serverSelectionTimeoutMS: 50000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Database connection established');
}).catch(error => {
    console.error('Database connection error:', error);
});

app.get('/', (req, res) => res.type('html').send(`<p>Server connection for the custom function</p>`));

app.post('/saveStudentDetails', async (req, res) => {
    const { first_name, last_name, score } = req.body;

    if (!first_name || !last_name || score == null) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const studentDetails = new StudentDetails({
            first_name: first_name.toLowerCase(),
            last_name: last_name.toLowerCase(),
            score: Number(score)
        });
        await studentDetails.save();

        res.status(200).json({ 
            message: `Student Details saved: ${first_name} ${last_name} with a score of ${score}`, 
            status: 'OK' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/getStudentDetails', async (req, res) => {
    const { studentName } = req.body;

    if (!studentName) {
        return res.status(400).json({ error: "Student name is required" });
    }

    try {
        const student = await StudentDetails.findOne({ first_name: studentName.toLowerCase() });
        if (student) {
            res.status(200).json({ student: student, message: `${student.first_name} found` });
        } else {
            res.status(404).json({ message: 'Student not found' });
        } 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/generatePDF', async (req, res) => {
    const { destinations } = req.body;

    if (!destinations || !Array.isArray(destinations)) {
        return res.status(400).json({ error: "Invalid destinations data" });
    }

    try {
        const doc = new PDFDocument();
        doc.info['Title'] = 'Bucket List';
        res.contentType('application/pdf');

        doc.pipe(res);

        doc.fontSize(22).text('Bucket List Adventure', { align: 'center' });
        doc.fontSize(14).text('Here are some of your favorite places added to your bucket list!', { align: 'center' });
        doc.moveDown().lineWidth(1).moveTo(50, 100).lineTo(550, 100).stroke();

        const imageWidth = 200;
        const imageHeight = 200;
        let x = 50, y = 150;

        // Create an array of promises for image processing
        const imagePromises = destinations.map(async ({ img }, index) => {
            try {
                const response = await fetch(img.src);
                const buffer = await response.arrayBuffer();
                
                // Calculate position
                const col = index % 2;
                const row = Math.floor(index / 2);
                x = 50 + col * (imageWidth + 20);
                y = 150 + row * (imageHeight + 20);

                // Add image to the document
                doc.image(buffer, x, y, { width: imageWidth, height: imageHeight });
            } catch (imgError) {
                console.error('Error processing image:', imgError);
                // You might want to add a placeholder image or text here
            }
        });

        // Wait for all images to be processed
        await Promise.all(imagePromises);

        // End the document after all images have been processed
        doc.end();
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));