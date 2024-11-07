const express = require('express');
const business = require('./business');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer') //to handle images in form
const handlebars = require('express-handlebars');
const app = express();

// Set up Handlebars as the template engine
app.set('views', __dirname + "/templates");
app.set('view engine', 'handlebars');
app.engine('handlebars', handlebars.engine());

// Set up static file serving
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(bodyParser.urlencoded({ extended: true }));

// Configure multer for handling file uploads
const storage = multer.diskStorage({
    destination: './uploads/profiles', // Directory to save profile photos
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Redirect to login page as default route
app.get("/", (req, res) => {
    res.redirect("/login");
});

// Route for the login page
app.get("/login", (req, res) => {
    res.render('login', { layout: undefined });
});

app.post("/login",async (req,res)=>{
    let username=req.body.username
    let password=req.body.password

    let userData=await business.getUserData(username)
    if (userData && userData.password==password){
        res.send(`Welcome user ${username}`)
    }else{
        res.send("Invalid user")
    }
})

// Route for the register page
app.get("/register", (req, res) => {
    res.render("register", { layout: undefined });
});


// Handle the registration form submission with file upload
app.post("/register", upload.single('profilePhoto'), async (req, res) => {
    try {
        // Extract fields from req.body
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        const profilePhoto = req.file ? req.file.path : null; // Get the file path of the uploaded profile photo
        const languagesFluent = req.body.languagesFluent ? req.body.languagesFluent.split(",") : [];
        const languagesLearning = req.body.languagesLearning ? req.body.languagesLearning.split(",") : [];
        const verified=false;
        const badges=null;
        const createdAt = new Date(Date.now());
        const updatedAt=new Date(Date.now());

        
    

        // Create user data object
        const userData = {
            username: username,
            email: email,
            password: password, // will do hashing later
            profilePhoto: profilePhoto, //  file path for the profile photo
            languagesFluent: languagesFluent,
            languagesLearning: languagesLearning,
            verified:verified,
            badges:badges,
            createdAt: createdAt,
            updatedAt:updatedAt

        };

        
        await business.addUser(userData);

        // Respond to client
        res.send("User registered successfully");
    } catch (error) {
        res.status(500).send("Error registering user");
    }
});


app.get("/index",async (req,res)=>{
    let user=await business.getUserData("Jhoan")
    res.render("index",{layout:"public_layout",user})
})

// Wildcard route for undefined routes (404)
app.get("*", (req, res) => {
    res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
});

// Start the server
app.listen(8000, () => {
    console.log(`App running on port 8000`);
});
