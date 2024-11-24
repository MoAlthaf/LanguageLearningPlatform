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
        const username = req.body.username.toLowerCase();
        const password = req.body.password;

        const userData = await business.getUserData(username);
        if (!userData) {
            return res.status(401).send(`Invalid credentials. <a href="/login">Try again</a>`);
        }
        if(!userData.verified){
            console.log(`Verification link: http://localhost:8000/verify-email?token=${userData.verificationToken}`);
            return res.status(401).send(`Email not verified, Please check your console to verify email and try again`);
        }
        const isVerified = await business.verifyUser(username, password);
        if (isVerified) {
            const sessionData = await business.startSession({ userName: username });
            res.cookie("user", sessionData.sessionNumber, { expires: sessionData.sessionExpiry });
            return res.redirect("/index");
        }

        res.status(401).send(`Invalid credentials. <a href="/login">Try again</a>`);
    });


// Route for the register page
app.get("/register", (req, res) => {
    res.render("register", { layout: undefined });
});


app.post("/register", upload.single('profilePhoto'), async (req, res) => {
    try {
        const username = req.body.username.toLowerCase();
        const email = req.body.email.toLowerCase();
        const password = req.body.password;
        const confirmPassword=req.bpdy.confirmPassword
        // Validate username/email uniqueness
        const existingUser = await business.getUserData(username);
        if (existingUser) {
            return res.status(400).send("Username already exists.");
        }
        if(password!=confirmPassword){
            return res.status(400).send("Password do not match");
        }

        const profilePhoto = req.file ? req.file.path : null;
        const languagesFluent = req.body.languagesFluent ? req.body.languagesFluent.split(",") : [];
        const languagesLearning = req.body.languagesLearning ? req.body.languagesLearning.split(",") : [];
        const createdAt = new Date();
        const updatedAt = new Date();
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const userData = {
            username,
            email,
            password,
            profilePhoto,
            languagesFluent,
            languagesLearning,
            verified: false,
            badges: [],
            verificationToken,
            createdAt,
            updatedAt,
            userType: "user",
        };

        await business.addUser(userData);
        console.log(`Verification link: http://localhost:8000/verify-email?token=${verificationToken}`);
        res.send("User registered successfully. Check your email for the verification link.");
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send("Error registering user.");
    }
});


// Index Route
/* app.get("/index", async (req, res) => {
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
}); */

app.get("/index", async (req, res) => {
    const sessionId = req.cookies.user;
    if (!sessionId) return res.redirect("/login");

    const sessionData = await business.getSessionData(sessionId);
    if (!sessionData) return res.redirect("/login");

    const username = sessionData.data.userName;
    const user = await business.getUserData(username);
    await business.assignBadges(username)

    // Fetch all badges and mark earned ones
    const allBadges = await business.getAllBadges();
    const earnedBadges = user.badges || [];
    const badgeDetails = allBadges.map((badge) => ({
        ...badge,
        earned: earnedBadges.includes(badge._id.toString()), // Convert ObjectId to string
    }));
    res.render("index", {
        layout: "public_layout",
        user,
        badges: badgeDetails,
    });
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
    const allBadges = await business.getAllBadges();
    const earnedBadges = user.badges || [];
    const badges = allBadges.map((badge) => ({
        ...badge,
        earned: earnedBadges.includes(badge._id.toString()),
    }));
    res.render('profileview', {
        layout: "public_layout",
        user,
        profilePhotoPath: `/${user.profilePhoto}` ,badges
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
        const matchingUsers = await business.getUserByLanguage(currentUsername,languagesLearning, blockedList);

        // Render the Add Friends page
        res.render("friends", { layout: "public_layout", matchingUsers,user:currentUser });
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
        //await business.assignBadges(currentUsername)
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

app.get("/contacts",async (req,res)=>{
    const sessionId = req.cookies.user;
    if (!sessionId) return res.redirect("/login");

    const sessionData = await business.getSessionData(sessionId);
    if (!sessionData) return res.redirect("/login");

    const username = sessionData.data.userName;
    const user = await business.getUserData(username);
    let contact=await business.getContacts(username)
    let contactsList=await business.getUsersFromList(contact.contacts)
    let blockedList=await business.getUsersFromList(contact.blocked)
    res.render("contacts",{layout:"public_layout",user,contactsList,blockedList})
})

app.use(bodyParser.json())


app.get("/messages", async (req, res) => {
    try {
        const sessionId = req.cookies.user;
        if (!sessionId) return res.redirect("/login");

        const sessionData = await business.getSessionData(sessionId);
        if (!sessionData) return res.redirect("/login");

        const username = sessionData.data.userName;
        const user = await business.getUserData(username);

        // Get the user's contacts
        const contact = await business.getContacts(username);
        const contactsList = await business.getUsersFromList(contact.contacts);

        res.render("messages", {
            layout: "public_layout",
            user,
            contactsList,
        });
    } catch (error) {
        console.error("Error displaying messages page:", error);
        res.status(500).send("Error displaying messages page.");
    }
});


app.get("/get-messages", async (req, res) => {
    try {
        const sessionId = req.cookies.user;
        if (!sessionId) return res.status(401).send("Unauthorized");

        const sessionData = await business.getSessionData(sessionId);
        const sender = sessionData.data.userName;
        const receiver = req.query.contact;

        const messages = await business.getMessages(sender, receiver);
        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).send("Error fetching messages.");
    }
});

app.post("/send-message", async (req, res) => {
    try {
        const sessionId = req.cookies.user;
        if (!sessionId) return res.status(401).send("Unauthorized");

        const sessionData = await business.getSessionData(sessionId);
        const sender = sessionData.data.userName;
        const { receiver, message } = req.body;
        await business.assignBadges(sender)

        await business.sendMessage(sender, receiver, message);
        res.status(200).send("Message sent successfully.");
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).send("Error sending message.");
    }
});



app.post("/unblock-user",async (req,res)=>{
    try{
        const sessionId = req.cookies.user;
        if (!sessionId) return res.status(401).send("Unauthorized");

        const sessionData = await business.getSessionData(sessionId);
        const username = sessionData.data.userName;

        let idToUnblock=req.body.unblockId

        result=await business.unblockUser(username,idToUnblock)
        res.status(200).redirect("/contacts");
    }
    catch{
        console.error("Error Unblocking the user:", error);
        res.status(500).send("Error Unblocking the user");
    }
})

app.post("/api/update-profile-picture", upload.single("profilePhoto"), async (req, res) => {
    try {
        const sessionId = req.cookies.user;
        if (!sessionId) return res.status(401).redirect("/login");

        const sessionData = await business.getSessionData(sessionId);
        if (!sessionData) return res.status(401).redirect("/login");

        const username = sessionData.data.userName;

        // Handle profile picture
        if (req.file) {
            const profilePhotoPath = req.file.path;
            const success = await business.updateUser(username,  { profilePhoto: profilePhotoPath } );

            if (!success) return res.status(500).send("Failed to update profile picture");
        }

        res.redirect("/profile");
    } catch (error) {
        console.error("Error updating profile picture:", error);
        res.status(500).send("Error updating profile picture");
    }
});



// GET route for rendering the password reset page
app.get("/reset-password", async (req, res) => {
    try {
        const sessionId = req.cookies.user;
        if (!sessionId) return res.status(401).redirect("/login");

        let sessionData=await business.getSessionData(sessionId)

        if(!sessionData) return res.status(401).redirect("/login");

        let user=await business.getUserData(sessionData.data.userName)

        let token=await business.generateToken(sessionId)
      
        res.render("reset_password", {
            layout: "public_layout",
            token,user // Pass the token to the client
        });
    } catch (error) {
        console.error("Error loading reset password page:", error);
        res.status(500).send("Error loading reset password page.");
    }
});

// POST route for handling the password reset form submission
app.post("/reset-password", async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;
        
        // Validate input
        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).send("Missing required fields.");
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).send("Passwords do not match.");
        }
        const sessionId = req.cookies.user;
        const sessionData=await business.getSessionData(sessionId)
        const userData=await business.getUserData(sessionData.data.userName)

        if(token==sessionData.formToken){
            const success = await business.updatePassword(userData.username,newPassword)
            if (!success) {
                return res.status(500).send("Error updating password.");
            }
            res.send(`Password updated successfully. You can now <a href="/logout">log in here</a> with your new password.`);

        }else{
            return res.status(400).send("Token mismatch, Please retry.");
        }
 


       
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).send("Error resetting password.");
    }
});

app.get("/profile/:userId",async (req,res)=>{
    try{
        const contactId=req.params.userId
        const sessionId = req.cookies.user;
        if (!sessionId) return res.status(401).redirect("/login");

        let sessionData=await business.getSessionData(sessionId)

        if(!sessionData) return res.status(401).redirect("/login");

        let user=await business.getUserData(sessionData.data.userName)

        let contactsDetails=await business.getUserData(contactId)

        res.render("contacts-profile",{layout:"public_layout",user,contact:contactsDetails})
    }catch(error){
        res.status(404).send("Page not found")
    }
})

app.post("/remove-contact", async (req, res) => {
    try {
        const sessionId = req.cookies.user;
        if (!sessionId) return res.redirect("/login");

        const sessionData = await business.getSessionData(sessionId);
        if (!sessionData) return res.redirect("/login");

        const username = sessionData.data.userName;
        const contactToRemove = req.body.removeId;

        const success = await business.removeContact(username, contactToRemove);
        if (success) {
            res.redirect("/contacts");
        } else {
            res.status(500).send("Error removing contact.");
        }
    } catch (error) {
        console.error("Error removing contact:", error);
        res.status(500).send("Error removing contact.");
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
