const mongoose = require('mongoose')

const AssetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String, 
        required: true
    },

    type:{
        type:String,
        required: true
    },

    color:{
        type:String, 
        default: '#d04513'
    },

},
{
    timestamps: true  // for created and updated at 
}

)

module.exports = mongoose.model('Asset', AssetSchema)