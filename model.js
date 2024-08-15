import mongoose from "mongoose";

const TestSchema  = new mongoose.Schema({
    num1: {
        type:Number,
        required: true,
    },
    num2: {
        type:Number,
        required: true,
    }
})

const Test = mongoose.model('Test',TestSchema)

export default Test