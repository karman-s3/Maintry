const mongoose = require('mongoose')

const MaintenanceSchema = new mongoose.Schema({


    userId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true
    }, 

    assetId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref:'Asset', 
        //required: true
    }, 

    title: {
        type: String, 
        required: true
    }, 

    reminderDate: {
        type: Date
    },

    recommendedInterval: {
        type: Number, 
        default: null
    }, 

    notes:{
        type: String,
        default:''
    }, 

    completed:{
        type: Boolean, 
        default: false
    }, 

    completedDate:{
        type: Date, 
        default: null
    }, 

    cost:{
        type: Number, 
        default:0
    }
}, 

{
    timestamps: true
})

module.exports = mongoose.model(
    'Maintenance',
    MaintenanceSchema
)