const express = require('express');
const path = require('path');
const app = express();


app.use('/static', express.static(path.join(__dirname, 'static')))


app.set('views', path.join(__dirname, 'views'))


app.get("/index", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"))
});

// Route for the login page
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"))
});

// Wildcard route for undefined routes (404)
app.get("*", (req, res) => {
    res.status(404).sendFile(path.join(__dirname, "views", "404.html"))
});

// Start the server
app.listen(8000, () => {
    console.log(`App running on port 8000`)
});
