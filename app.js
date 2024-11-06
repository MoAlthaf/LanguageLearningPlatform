const express = require('express');
const business=require("./business")
const path = require('path');
const app = express();
const handlebars = require('express-handlebars');
app.set('views', __dirname + "/templates");
app.set('view engine', 'handlebars');
app.engine('handlebars', handlebars.engine());


app.use('/static', express.static(path.join(__dirname, 'static')))
app.use(bodyParser.urlencoded({ extended: true }));

//app.set('views', path.join(__dirname, 'views'))


app.get("/", (req, res) => {
    res.redirect("/login")
});


app.get("/register" , (req,res)=>{
    res.render("register" , {layout:undefined})
})

// Route for the login page
app.get("/login", (req, res) => {
    res.render('login' , {layout:undefined})
});

// Wildcard route for undefined routes (404)
app.get("*", (req, res) => {
    res.status(404).sendFile(path.join(__dirname, "views", "404.html"))
});

app.post("/regiter",async (req,res)=>{
    let username= req.body.username
    let email=req.body.email
    let password=req.body.password
    //let profilePhoto=req.body.profile.photo
    let languagesFluent=req.body.languagesFluent.split(",")
    let languagesLearning=req.body.languagesLearning.split(",")
    let createdAt= new Date(Date.now())
    //let profilePhoto=req.body.profile.photo
    let userData={
         username: req.body.username,
        email:req.body.email,
         password:req.body.password,
         languagesFluent:req.body.languagesFluent.split(","),
         languagesLearning:req.body.languagesLearning.split(","),
         createdAt: new Date(Date.now())
    }
    await business.addUser(userData)
})

// Start the server
app.listen(8000, () => {
    console.log(`App running on port 8000`)
});

