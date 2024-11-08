const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const handlebars = require('express-handlebars');
const cookieParser = require("cookie-parser");
const business = require('./business');
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
        const { username, password } = req.body;
        const userData = await business.getUserData(username);

        if (userData && password === userData.password) {
            const sessionData = await business.startSession({ userName: username });
            res.cookie("user", sessionData.sessionNumber, { expires: sessionData.sessionExpiry });
            return res.redirect("/index");
        }
        res.send("Incorrect Username and password");
    });

// Register Routes
app.route("/register")
    .get((req, res) => res.render("register", { layout: undefined }))
    .post(upload.single('profilePhoto'), async (req, res) => {
        try {
            const { username, email, password, languagesFluent, languagesLearning } = req.body;
            const userData = {
                username,
                email,
                password, // Hash later for security
                profilePhoto: req.file ? req.file.path.replace(/\\/g, "/") : null,
                languagesFluent: languagesFluent ? languagesFluent.split(",") : [],
                languagesLearning: languagesLearning ? languagesLearning.split(",") : [],
                verified: false,
                badges: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await business.addUser(userData);
            res.send("User registered successfully");
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
    });
});

// Profile Route
app.get("/profile", async (req, res) => {
    const user = await business.getUserData("Jhoan");
    res.render('profileview', {
        layout: "public_layout",
        user,
        profilePhotoPath: `/${user.profilePhoto}`
    });
});

// 404 - Catch All for Undefined Routes
app.get("*", (req, res) => res.status(404).sendFile(path.join(__dirname, "views", "404.html")));

// Start Server
app.listen(8000, () => console.log(`App running on port 8000`));
