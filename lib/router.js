const express = require('express')
const router = express.Router()
const path = require("path")



const employerAuthController = require("../controllers/employerController/employerAuthController")
const userAuthController = require("../controllers/userController/userAuthController")


const {bodyParser, videoParser, generateID, isJwtValid} = require("../lib/middleware")

router.use((req, res, next)=>{
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-type, Authorization')
    next()
})


//Employer
router.post("/employer/signup", bodyParser, employerAuthController.signup)

//USER
router.post("/login", bodyParser, userAuthController.login)
module.exports = router