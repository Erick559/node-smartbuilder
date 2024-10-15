import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from "dotenv";
import { Test, StudentDetails } from './model.js';
import { PDFDocument } from 'pdf-lib'
import fetch from 'node-fetch';
import fontkit from '@pdf-lib/fontkit';

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

app.post('/ping', (req,res) => {
    const { num1 } = req.body;

    res.status(200).send(`Connection established:${num1}`);
})

app.post('/saveDetails', async (req, res) => {
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
        res.contentType('application/pdf');

        doc.pipe(res);

        // Title page
        doc.fontSize(22).text('Bucket List Adventure', { align: 'center' });
        doc.fontSize(14).text('Here are some of your favorite places added to your bucket list!', { align: 'center' });

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const imageWidth = pageWidth / 2;
        const imageHeight = pageHeight / 2;

        // Create an array of promises for image processing
        const imagePromises = destinations.map(async ({ img }, index) => {
            console.log(img);
            try {
                const response = await fetch(img.src);
                const buffer = await response.arrayBuffer();
                
                // Add a new page for each image
                if (index > 0) doc.addPage();

                // Calculate position to center the image
                const x = (pageWidth - imageWidth) / 2;
                const y = (pageHeight - imageHeight) / 2;

                // Add image to the document
                doc.image(buffer, x, y, { 
                    width: imageWidth, 
                    height: imageHeight, 
                    align: 'center', 
                    valign: 'center' 
                });

                // Add image caption or destination name if available
                if (img.alt) {
                    doc.fontSize(14).text(img.alt, 0, y + imageHeight + 20, { align: 'center' });
                }

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

app.post('/combine-pdfs', async (req, res) => {
    try {
        const { checkboxStates } = req.body;

        console.log(checkboxStates);

        const coverPageUrl = 'https://rebelrooster.io/vg/nurnberg/pdf/Nuremberg_v1__00.pdf';
        const pdfUrls = [
            'https://rebelrooster.io/vg/nurnberg/pdf/Nuremberg_v1__01.pdf',
            'https://rebelrooster.io/vg/nurnberg/pdf/Nuremberg_v1__02.pdf',
            'https://rebelrooster.io/vg/nurnberg/pdf/Nuremberg_v1__03.pdf',
            'https://rebelrooster.io/vg/nurnberg/pdf/Nuremberg_v1__04.pdf',
            'https://rebelrooster.io/vg/nurnberg/pdf/Nuremberg_v1__05.pdf',
            'https://rebelrooster.io/vg/nurnberg/pdf/Nuremberg_v1__06.pdf',
            'https://rebelrooster.io/vg/nurnberg/pdf/Nuremberg_v1__07.pdf',
            'https://rebelrooster.io/vg/nurnberg/pdf/Nuremberg_v1__08.pdf'
        ];

        if (!Array.isArray(checkboxStates) || checkboxStates.length !== pdfUrls.length) {
            return res.status(400).send(`Invalid input: checkboxStates should be an array of length ${pdfUrls.length}`);
        }

        const mergedPdf = await PDFDocument.create();

        // Fetch and add the cover page
        try {
            const coverPageResponse = await fetch(coverPageUrl);
            if (!coverPageResponse.ok) {
                throw new Error(`Failed to fetch cover page from ${coverPageUrl}`);
            }
            const coverPageBuffer = await coverPageResponse.arrayBuffer();
            const coverPageDoc = await PDFDocument.load(coverPageBuffer);
            const [coverPage] = await mergedPdf.copyPages(coverPageDoc, [0]);
            mergedPdf.addPage(coverPage);
        } catch (error) {
            console.error('Error processing cover page:', error);
            return res.status(500).send('Error processing cover page');
        }

        // Fetch and merge only the PDFs corresponding to checked checkboxes
        for (let i = 0; i < pdfUrls.length; i++) {
            if (checkboxStates[i] === 1) {
                try {
                    const pdfResponse = await fetch(pdfUrls[i]);
                    if (!pdfResponse.ok) {
                        throw new Error(`Failed to fetch PDF from ${pdfUrls[i]}`);
                    }
                    const pdfBuffer = await pdfResponse.arrayBuffer();

                    const pdfToMerge = await PDFDocument.load(pdfBuffer);
                    const pages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());

                    // Add the pages to the merged PDF
                    pages.forEach(page => mergedPdf.addPage(page));
                } catch (error) {
                    console.error(`Error processing PDF at ${pdfUrls[i]}:`, error);
                }
            }
        }

        // Finalize and send the merged PDF
        const pdfBytes = await mergedPdf.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=combined.pdf');
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error('Error combining PDFs:', error);
        res.status(500).send('Error combining PDFs');
    }
});


app.post('/combine-pdfs/germany', async (req, res) => {
    try {
        const { checkboxStates } = req.body;

        console.log(checkboxStates);

        const coverPageUrl = 'https://rebelrooster.io/vg/germany/_pdf/Germany_v1_01_compressed.pdf';
        const pdfUrls = [
            'https://rebelrooster.io/vg/germany/_pdf/Germany_v1_02_compressed.pdf',
            'https://rebelrooster.io/vg/germany/_pdf/Germany_v1_03_compressed.pdf',
            'https://rebelrooster.io/vg/germany/_pdf/Germany_v1_04_compressed.pdf',
            'https://rebelrooster.io/vg/germany/_pdf/Germany_v1_05_compressed.pdf',
            'https://rebelrooster.io/vg/germany/_pdf/Germany_v1_06_compressed.pdf',
            'https://rebelrooster.io/vg/germany/_pdf/Germany_v1_07_compressed.pdf',
            'https://rebelrooster.io/vg/germany/_pdf/Germany_v1_08_compressed.pdf',
        ];

        if (!Array.isArray(checkboxStates) || checkboxStates.length !== pdfUrls.length) {
            return res.status(400).send(`Invalid input: checkboxStates should be an array of length ${pdfUrls.length}`);
        }

        const mergedPdf = await PDFDocument.create();

        // Fetch and add the cover page
        try {
            const coverPageResponse = await fetch(coverPageUrl);
            if (!coverPageResponse.ok) {
                throw new Error(`Failed to fetch cover page from ${coverPageUrl}`);
            }
            const coverPageBuffer = await coverPageResponse.arrayBuffer();
            const coverPageDoc = await PDFDocument.load(coverPageBuffer);
            const [coverPage] = await mergedPdf.copyPages(coverPageDoc, [0]);
            mergedPdf.addPage(coverPage);
        } catch (error) {
            console.error('Error processing cover page:', error);
            return res.status(500).send('Error processing cover page');
        }

        // Fetch and merge only the PDFs corresponding to checked checkboxes
        for (let i = 0; i < pdfUrls.length; i++) {
            if (checkboxStates[i] === 1) {
                try {
                    const pdfResponse = await fetch(pdfUrls[i]);
                    if (!pdfResponse.ok) {
                        throw new Error(`Failed to fetch PDF from ${pdfUrls[i]}`);
                    }
                    const pdfBuffer = await pdfResponse.arrayBuffer();

                    const pdfToMerge = await PDFDocument.load(pdfBuffer);
                    const pages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());

                    // Add the pages to the merged PDF
                    pages.forEach(page => mergedPdf.addPage(page));
                } catch (error) {
                    console.error(`Error processing PDF at ${pdfUrls[i]}:`, error);
                }
            }
        }

        // Finalize and send the merged PDF
        const pdfBytes = await mergedPdf.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=combined.pdf');
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error('Error combining PDFs:', error);
        res.status(500).send('Error combining PDFs');
    }
});

app.post('/combine-pdfsv2', async (req, res) => {
    const {pdfUrls, coverPageUrl} = req.body;

    if (!Array.isArray(pdfUrls) || !coverPageUrl) {
        return res.status(400).json({ error: "Invalid input: pdfUrls should be an array and coverPageUrl should be a string" });
    }

    try {
        const mergedPdf = await PDFDocument.create();

        // Fetch and add the cover page
        try {
            const coverPageResponse = await fetch(coverPageUrl);
            if (!coverPageResponse.ok) {
                throw new Error(`Failed to fetch cover page from ${coverPageUrl}`);
            }
            const coverPageBuffer = await coverPageResponse.arrayBuffer();
            const coverPageDoc = await PDFDocument.load(coverPageBuffer);
            const [coverPage] = await mergedPdf.copyPages(coverPageDoc, [0]);
            mergedPdf.addPage(coverPage);
        } catch (error) {
            console.error('Error processing cover page:', error);
            return res.status(500).send('Error processing cover page');
        }
        
        for (const url of pdfUrls) {
            try {
                const pdfResponse = await fetch(url);
                if (!pdfResponse.ok) {
                    console.error(`Failed to fetch PDF from ${url}: Status ${pdfResponse.status}`);
                    continue;  // Skip this PDF if the fetch failed
                }
        
                const pdfBuffer = await pdfResponse.arrayBuffer();
                if (!pdfBuffer) {
                    console.error(`Empty buffer received from ${url}`);
                    continue;  // Skip if the buffer is empty
                }
        
                const pdfToMerge = await PDFDocument.load(pdfBuffer);
                const pages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            } catch (error) {
                console.error(`Error processing PDF at ${url}:`, error);
                // Skip the PDF on error and continue to the next one
                continue;
            }
        }

        // Finalize and send the merged PDF
        const pdfBytes = await mergedPdf.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=combined.pdf');
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error('Error combining PDFs:', error);
        res.status(500).send('Error combining PDFs');
    }
})


app.listen(PORT, () => console.log(`Server listening on ${PORT}`));