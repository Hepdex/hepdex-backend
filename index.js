const express = require('express');
require('dotenv').config()
const database = require("./lib/database.js")
const router = require("./lib/router.js") 
const path = require('path'); 

const app = express();
const port = process.env.PORT || 5000;
// Serve static files from the 'images' directory
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(router)

database.connect(()=>{
    app.listen(port, ()=>{
        console.log(`Server is listening on port: ${port}`)
    })
})