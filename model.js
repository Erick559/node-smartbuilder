import mongoose from "mongoose";

const TestSchema  = new mongoose.Schema({
    num1: {
        type:Number,
        required: true,
    },
    num2: {
        type:Number,
        required: true,
    },
    result: {
        type:Number,
        required: true,
    }
})

const StudentDetailsSchema = new mongoose.Schema({
    first_name: {
        type:mongoose.Schema.Types.Mixed,
        required: true,
    },
    last_name: {
        type:mongoose.Schema.Types.Mixed,
        required: true,
    },
    time: {
        type:Date,
        default:Date.now,
    },
    score: {
        type: Number,
        required: true,
    }
})

export const StudentDetails = mongoose.model('studentDetails',StudentDetailsSchema)
export const Test = mongoose.model('Test',TestSchema)
