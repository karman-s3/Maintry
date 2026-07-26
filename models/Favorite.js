const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    name: {
        type: String,
        required: true
    },

    address: {
        type: String
    },

    phone: {
        type: String
    },

    key: {
        type: String,
        required: true
    }

});


module.exports = mongoose.model(
    "Favorite",
    favoriteSchema
);