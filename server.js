

const axios = require("axios/dist/node/axios.cjs");

require('dotenv').config()

const dns = require('node:dns');
dns.setServers(['1.1.1.1', '1.0.0.1']); 

const express = require("express")

const mongoose = require('mongoose')

const cors = require('cors')

const Asset = require('./models/Asset')

const Maintenance = require('./models/Maintenance')



const User = require(`./models/user`)
const bcrypt = require(`./node_modules/bcryptjs/umd`)
const jwt = require ('jsonwebtoken');
const { isErrored } = require('node:stream'); // not being used anymore
const app = express()

app.use(express.json())
app.use(cors())
app.use(express.static('public'))

//connecting to mongodb

function verifyToken(req, res, next){
    const authHeader = req.headers.authorization

    if (!authHeader){
        return res.status(401).json({
            message: "Access Denied"
        })
    }

    try{
        const token = authHeader.split(' ')[1]
        
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        )

        req.userId = decoded.userId
        next()
    } catch (err){
        res.status(401).json({
            message: "Invalid Token"
        })
    }
}

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("Connected to MongoDB")
})

.catch((err)=>{
    console.log("MongoDB connection error:", err); 

})

// Testing route
app.get('/', (req, res) =>{
    res.send('Maintry has a successful backend running')
})

// adding my api route 


app.post('/signup', async (req, res) => {
    try {
        const { firstname, email, password } = req.body

        // does user exist already
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" })
        }

        // hashing the password
        const hashedPassword = await bcrypt.hash(password, 10)

        // creating the user
        const user = new User({
            firstname,
            email,
            password: hashedPassword
        })

        await user.save()

        res.json({ message: "User created successfully" })

    } catch (err) {
        res.status(500).json({ message: "Server error" })
    }
})

app.get('/protected', verifyToken, async (req,res) =>{
    const user = await User.findById(req.userId)

    res.json({
        firstname: user.firstname,
        email:user.email
    })
})


app.get('/professionals/search', verifyToken, async (req, res) => {
    try {
        const { task, location } = req.query;

        const query = `${task} ${location}`;

        // the text search for finding proffesionals using api
        const searchRes = await axios.get(
            'https://maps.googleapis.com/maps/api/place/textsearch/json',
            {
                params: {
                    query,
                    key: process.env.GOOGLE_PLACES_API_KEY
                }
            }
        );

        const places = searchRes.data.results.slice(0, 10);

        // retrive add details for each place
        const detailedResults = await Promise.all(
            places.map(async (place) => {

                const detailsRes = await axios.get(
                    'https://maps.googleapis.com/maps/api/place/details/json',
                    {
                        params: {

                            // format and setup for boxes

                            place_id: place.place_id,
                            key: process.env.GOOGLE_PLACES_API_KEY,
                            fields: [
                                'name',
                                'formatted_address',
                                'formatted_phone_number',
                                'rating',
                                'user_ratings_total',
                                'website',
                                'photos'
                            ].join(',')
                        }
                    }
                );

                const d = detailsRes.data.result;

                // Sattach photo url for each data company
                let photoUrl = null;

                if (d.photos && d.photos.length > 0) {
                    const photoRef = d.photos[0].photo_reference;

                    photoUrl =
                        `https://maps.googleapis.com/maps/api/place/photo` +
                        `?maxwidth=800` +
                        `&photo_reference=${photoRef}` +
                        `&key=${process.env.GOOGLE_PLACES_API_KEY}`;
                }

                return {
                    name: d.name,
                    address: d.formatted_address,
                    phone: d.formatted_phone_number,
                    rating: d.rating,
                    reviews: d.user_ratings_total,
                    website: d.website,
                    photo: photoUrl
                };
            })
        );

        res.json(detailedResults);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Search failed' });
    }
});


app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        // check if user exists
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({ message: "User not found" })
        }

        // compare password
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password" })
        }

        // create token (session)
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        )

        res.json({
            message: "Login successful",
            token
        })

    } catch (err) {
        res.status(500).json({ message: "Server error" })
    }
})

// route to add an asset
app.post('/assets', verifyToken, async(req, res) => {
    try{
        const asset = new Asset({
            userId: req.userId,

            name: req.body.name, 

            type: req.body.type, 

            color: req.body.color
        })

        await asset.save()

        res.json(asset)
    } catch(err){
        res.status(500).json({
            message: 'Error Creating Asset'
        })
    }
})

//route to get user assets

app.get('/assets', verifyToken, async (req, res) =>{
    try{
        const assets = await Asset.find({
            userId : req.userId //main privacy between different users
        })
        .sort({
            updatedAt: -1
        })

        res.json(assets)
    } catch(err){
        res.status(500).json({
            message: 'Error loading assets'
        })
    }
})




app.get('/assettest', verifyToken, async (req,res)=>{
    const asset = new Asset({
        userId: req.userId,
        name: "Honda CRV", 
        type: "Car",
        color: "ff0000"
    })

    await asset.save()

    res.json(asset)
})


app.post(
    '/maintenance', 
    verifyToken,
    async(req,res) =>{
        try{
            const maintenance =
            new Maintenance({

                userId: req.userId,

                assetId: req.body.assetId,

                title: req.body.title,

                notes: req.body.notes,

                reminderDate: req.body.reminderDate,

                completed: false
})

            await maintenance.save()

            console.log('AFTER SAVE'); 
            console.log(maintenance);

            res.json(maintenance)
        }

        catch(err){
            res.status(500).json({
                message:
                'Error In Creating Maintenance'
            })
        }
    }
)


app.get(
    '/maintenance/:assetId', 
    verifyToken, 
    async (req, res) => {
        try{
            const maintenance = 
            await Maintenance.find({
                assetId: req.params.assetId, 

                userId: req.userId
            })

            .sort({
                updatedAt:-1
            })

            res.json(maintenance)
        }

        catch(err){
            res.status(500).json({
                message: 'Error Loading Maintenance'
            })
        }
    })


app.put(
    '/maintenance/:id/toggle',
    verifyToken,
    async (req, res) => {

        try {

            console.log('TOGGLE CLICKED');
            console.log(req.params.id);

            const maintenance =
            await Maintenance.findById(
                req.params.id
            );

            console.log(maintenance);

            if (!maintenance) {
                return res.status(404).json({
                    message: 'Task not found'
                });
            }

            maintenance.completed =
                !maintenance.completed;

            if (maintenance.completed) {
                maintenance.completedDate = new Date();
            } else {
                maintenance.completedDate = null;
            }

            await maintenance.save();

            console.log('Completed:', maintenance.completed);
            console.log('Completed Date:', maintenance.completedDate);
            res.json(maintenance);

        } catch (err) {

            console.log(err);

            res.status(500).json({
                message: 'Error updating task'
            });

        }
    }
);


app.delete(
    '/assets/bulk-delete',
    verifyToken,
    async (req,res) => {

        try{

            const assetIds =
                req.body.assetIds;

            await Maintenance.deleteMany({
                assetId:{
                    $in: assetIds
                },

                userId:req.userId
            });

            await Asset.deleteMany({
                _id:{
                    $in: assetIds
                },

                userId:req.userId
            });

            res.json({
                message:
                'Assets deleted'
            });

        }

        catch(err){

            res.status(500).json({
                message:
                'Delete failed'
            });

        }

    }
);



const PORT = 3000; 

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})


app.get('/maintenance/upcoming/all', verifyToken, async (req, res) => {
    try {
        const items = await Maintenance.find({
            userId: req.userId,
            completed: false
        }).populate('assetId');

        res.json(items);
    } catch (err) {
        res.status(500).json({ message: 'Error loading upcoming' });
    }
});

app.get('/maintenance/history/all', verifyToken, async (req, res) => {
    try {
        const items = await Maintenance.find({
            userId: req.userId,
            completed: true
        }).populate('assetId', 'name type color');

        res.json(items);
    } catch (err) {
        res.status(500).json({ message: 'Error loading history' });
    }
});

app.put(
    '/maintenance/:id/cost',
    verifyToken,
    async (req, res) => {

        try {

            const maintenance =
                await Maintenance.findById(req.params.id);

            if (!maintenance) {
                return res.status(404).json({
                    message: 'Task not found'
                });
            }

            maintenance.cost = req.body.cost;

            await maintenance.save();

            res.json(maintenance);

        } catch (err) {

            res.status(500).json({
                message: 'Error updating cost'
            });

        }
    }
);

