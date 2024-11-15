const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const handlebars = require('express-handlebars');
const cookieParser = require("cookie-parser");
const business = require('./business');
const crypto=require("crypto")
const app = express();

// Set up Handlebars as the template engine
app.set('views', path.join(__dirname, "templates"));
app.engine('handlebars', handlebars.engine());
app.set('view engine', 'handlebars');

// Middleware setup
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: './uploads/profiles',
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `/${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// Routes

// Redirect root to login
app.get("/", (req, res) => res.redirect("/login"));

// Login Routes
app.route("/login")
    .get((req, res) => {
        if (req.cookies.user) return res.redirect("/index");
        res.render('login', { layout: undefined });
    })
    .post(async (req, res) => {
        const username =req.body.username.toLowerCase() 
        const password  = req.body.password;
        const isVerified = await business.getUserData(username);

        if (isVerified) {
            const sessionData = await business.startSession({ userName: username });
            res.cookie("user", sessionData.sessionNumber, { expires: sessionData.sessionExpiry });
            return res.redirect("/index");
        }
        res.send("Incorrect Username and password");
    })

// Route for the register page
app.get("/register", (req, res) => {
    res.render("register", { layout: undefined });
});


app.post("/register", upload.single('profilePhoto'), async (req, res) => {
    try {
        // Extract fields from req.body
        const username = req.body.username.toLowerCase();
        const email = req.body.email.toLowerCase();
        const password = req.body.password;
        const profilePhoto = req.file ? req.file.path : null; // Get the file path of the uploaded profile photo
        const languagesFluent = req.body.languagesFluent ? req.body.languagesFluent.split(",") : [];
        const languagesLearning = req.body.languagesLearning ? req.body.languagesLearning.split(",") : [];
        const createdAt = new Date(Date.now());
        const updatedAt = new Date(Date.now());


        //  verification token
        
        const verificationToken = crypto.randomBytes(32).toString('hex');
        // Create user data object
        const userData = {
            username: username,
            email: email,
            password: password, 
            profilePhoto: profilePhoto,
            languagesFluent: languagesFluent,
            languagesLearning: languagesLearning,
            verified: false,
            badges: [],
            verificationToken: verificationToken, // Store the token
            createdAt: createdAt,
            updatedAt: updatedAt,
            userType:"user"
        };

        // Add user to the database
        await business.addUser(userData);
        
        // Log the verification link to the console (simulate sending an email)
        const verificationLink = `http://localhost:8000/verify-email?token=${verificationToken}`;
        console.log(`Verification link: ${verificationLink}`);

        // Respond to client
        res.send("User registered successfully. Please check the console for the verification link.");
    } catch (error) {
        res.status(500).send("Error registering user");
    }
});

// Index Route
app.get("/index", async (req, res) => {
    const sessionId = req.cookies.user;
    if (!sessionId) return res.redirect("/login");

    const sessionData = await business.getSessionData(sessionId);
    if (!sessionData) return res.redirect("/login");

    const username = sessionData.data.userName;
    const user = await business.getUserData(username);
    res.render("index", {
        layout: "public_layout",
        user,
        profilePhotoPath: `/${user.profilePhoto}`
    })
});

// Profile Route
app.get("/profile", async (req, res) => {
    const sessionId = req.cookies.user;

    if (!sessionId) {
        return res.redirect("/login");
    }

    const sessionData = await business.getSessionData(sessionId);

    if (!sessionData) {
        return res.redirect("/login");
    }

    const username = sessionData.data.userName;
    const user = await business.getUserData(username);
    
    if (!user) {
        return res.status(404).send('User not found');
    }

    res.render('profileview', {
        layout: "public_layout",
        user,
        profilePhotoPath: `/${user.profilePhoto}` 
    });
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
        user.verificationToken = null
        await business.updateUser(user.username, user)

        res.send(`Email verified successfully!, You can login now`);
    } catch (error) {
        res.status(500).send('Error verifying email.');
    }
});



app.get("/add-friends", async (req, res) => {
    try {
        // Verify user session
        const sessionId = req.cookies.user;
        if (!sessionId) {
            return res.redirect("/login");
        }

        const sessionData = await business.getSessionData(sessionId);
        if (!sessionData || !sessionData.data.userName) {
            return res.redirect("/login");
        }

        const currentUsername = sessionData.data.userName;

        // Fetch current user and their contact data
        const currentUser = await business.getUserData(currentUsername);
        const userContacts = await business.getContacts(currentUsername);

        if (!currentUser || !userContacts) {
            return res.status(400).send("Error fetching user or contact data.");
        }

        const blockedList = userContacts.blocked || [];
        const languagesLearning = currentUser.languagesLearning || [];

        // Find users fluent in languages the current user is learning, excluding blocked ones
        const matchingUsers = await business.getUserByLanguage(languagesLearning, blockedList);

        // Render the Add Friends page
        res.render("friends", { layout: "public_layout", matchingUsers });
    } catch (error) {
        console.error("Error in Add Friends route:", error);
        res.status(500).send("Error fetching friends.");
    }
});


app.post("/add-to-contacts", async (req, res) => {
    try {
        const sessionId = req.cookies.user;
        const { contactId } = req.body;

        if (!sessionId) {
            res.redirect("/login");
            return;
        }
        const sessionData=await business.getSessionData(sessionId)
        const currentUsername=sessionData.data.userName
        // Add contact to user's contacts
        const success = await business.addToContacts(currentUsername, contactId);

        if (success) {
            res.redirect("/add-friends");
        } else {
            res.status(500).send("Error adding contact.");
        }
    } catch (error) {
        console.error("Error adding contact:", error);
        res.status(500).send("Error adding contact.");
    }
});

app.post("/block-user", async (req, res) => {
    try {
        const sessionId = req.cookies.user;
        const { blockId } = req.body;

        if (!sessionId) {
            res.redirect("/login");
            return;
        }

        const sessionData=await business.getSessionData(sessionId)
        const currentUsername=sessionData.data.userName
        // Add user to the blocked list
        const success = await business.blockUser(currentUsername, blockId);

        if (success) {
            res.redirect("/add-friends");
        } else {
            res.status(500).send("Error blocking user.");
        }
    } catch (error) {
        console.error("Error blocking user:", error);
        res.status(500).send("Error blocking user.");
    }
});


app.get("/logout",(req,res)=>{
    res.clearCookie('user');
    res.redirect("/login")
})

// Catch All for Undefined Routes
app.get("*", (req, res) => res.status(404).render("404",{layout:undefined}));

// Start Server
app.listen(8000, () => console.log(`App running on port 8000`));
