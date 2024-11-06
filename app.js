const express = require('express');
const path = require('path');
const app = express();
const handlebars = require('express-handlebars');
app.set('views', __dirname + "/templates");
app.set('view engine', 'handlebars');
app.engine('handlebars', handlebars.engine());


app.use('/static', express.static(path.join(__dirname, 'static')))


//app.set('views', path.join(__dirname, 'views'))


app.get("/index", (req, res) => {
    res.render('index', {layout:"public_layout"})
});



// Route for the login page
app.get("/login", (req, res) => {
    res.render('login' , {layout:"public_layout"})
});

// Wildcard route for undefined routes (404)
app.get("*", (req, res) => {
    res.status(404).sendFile(path.join(__dirname, "views", "404.html"))
});

// Start the server
app.listen(8000, () => {
    console.log(`App running on port 8000`)
});
