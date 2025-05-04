const express = require('express')
const router = express.Router()
const path = require("path")



const employerAuthController = require("../controllers/employerController/employerAuthController")
const userAuthController = require("../controllers/userController/userAuthController")
const candidateAuthController = require("../controllers/candidateController/candidateAuthController")
const jobController = require("../controllers/jobController/jobController")
const resumeController = require("../controllers/resumeController/resumeController")

const {bodyParser, docParser, generateFileID, generateUserID, isJwtValid, isFormDataValid,
    isEmployer, isCandidate
} = require("../lib/middleware")

router.use((req, res, next)=>{
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-type, Authorization')
    next()
})

//USER
router.post("/login", bodyParser, userAuthController.login)

//Employer
router.post("/employer/signup", bodyParser, employerAuthController.signup)

//Candidate
router.post("/candidate/signup", isFormDataValid, generateUserID, generateFileID, docParser, candidateAuthController.signup)

//Job
router.post("/add-job", isJwtValid, bodyParser, isEmployer, jobController.addJobs)
router.get("/get-jobs", isJwtValid, isEmployer, jobController.getJobs)
router.put("/update-job-active-status", isJwtValid, isEmployer, bodyParser, jobController.updateActiveStatus)
router.post("/job-application", isJwtValid, bodyParser, isCandidate, jobController.apply)

//Resume
router.get("/get-resume", isJwtValid, resumeController.getResume)


module.exports = router