const express = require('express');
const business = require('./business');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer') //to handle images in form
const handlebars = require('express-handlebars');
const app = express();
const crypto = require('crypto');






// Set up Handlebars as the template engine
app.set('views', __dirname + "/templates");
app.set('view engine', 'handlebars');
app.engine('handlebars', handlebars.engine());

// Set up static file serving
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/uploads', express.static(path.join(__dirname,'uploads')));
app.use(bodyParser.urlencoded({ extended: true }));

// Configure multer for handling file uploads
const storage = multer.diskStorage({
    destination: './uploads/', // Directory to save profile photos
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
        
        // Use path.posix to ensure forward slashes, then call callback
        cb(null, path.posix.join('profiles', filename));
    }
});

const upload = multer({ storage: storage });


// Redirect to login page as default route
app.get("/", (req, res) => {
    res.redirect("/login");
});



app.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        const user = await business.getTokenData(token)  
        if (!user) {
            return res.status(400).send('Invalid or expired token.');
        }

        // Verify the user by updating their status and clearing the token
        user.verified = true;
        user.verificationToken = null; // Clear the token after verification
        await business.updateUser(user.username, user)

        res.send('Email verified successfully!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error verifying email.');
    }
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
        const createdAt = new Date(Date.now());
        const updatedAt = new Date(Date.now());

        // Generate a verification token
        
        const verificationToken = crypto.randomBytes(32).toString('hex');
        // Create user data object
        const userData = {
            username: username,
            email: email,
            password: password, // TODO: Hash the password before saving
            profilePhoto: profilePhoto,
            languagesFluent: languagesFluent,
            languagesLearning: languagesLearning,
            verified: false,
            badges: [],
            verificationToken: verificationToken, // Store the token
            createdAt: createdAt,
            updatedAt: updatedAt
        };

        // Add user to the database
        await business.addUser(userData);
        
        // Log the verification link to the console (simulate sending an email)
        const verificationLink = `http://localhost:8000/verify-email?token=${verificationToken}`;
        console.log(`Verification link: ${verificationLink}`);

        // Respond to client
        res.send("User registered successfully. Please check the console for the verification link.");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error registering user");
    }
});

app.get("/index",async (req,res)=>{
    let user=await business.getUserData("Jhoan")
    const profilePhotoPath=`/${user.profilePhoto}`
    res.render("index",{layout:"public_layout",user,profilePhotoPath})
})


app.get("/profile",async (req,res)=>{
    let user=await business.getUserData("Jhoan")
    const profilePhotoPath=`/${user.profilePhoto}`
    res.render('profileview', {layout:"public_layout",user,profilePhotoPath});
})













// Wildcard route for undefined routes (404)
app.get("*", (req, res) => {
    res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
});

// Start the server
app.listen(8000, () => {
    console.log(`App running on port 8000`);
});
