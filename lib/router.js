const express = require('express')
const router = express.Router()


const employerAuthController = require("../controllers/employerController/employerAuthController")
const userAuthController = require("../controllers/userController/userAuthController")
const candidateAuthController = require("../controllers/candidateController/candidateAuthController")
const candidateController = require("../controllers/candidateController/candidateController")
const jobController = require("../controllers/jobController/jobController")
const resumeController = require("../controllers/resumeController/resumeController")

const {bodyParser, docParser, generateFileID, generateUserID, isJwtValid,
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
router.put("/verify-otp", bodyParser, userAuthController.verifyOTP)

//Employer
router.post("/employer/signup", bodyParser, employerAuthController.signup)

//Candidate
router.post("/candidate/signup", generateUserID, generateFileID, docParser, candidateAuthController.signup)
router.get("/get-candidates", isJwtValid, candidateController.getCandidates)

//Job
router.post("/add-job", isJwtValid, bodyParser, isEmployer, jobController.addJobs)
router.get("/get-jobs", isJwtValid, isEmployer, jobController.getJobs)
router.get("/search-jobs", isJwtValid, jobController.searchJobs)
router.put("/update-job-active-status", isJwtValid, isEmployer, bodyParser, jobController.updateActiveStatus)
router.post("/job-application", isJwtValid, bodyParser, isCandidate, jobController.apply)
router.put("/update-job", isJwtValid, bodyParser, isEmployer, jobController.updateJob)
router.delete("/delete-job", isJwtValid, isEmployer, jobController.deleteJob)

//Resume
router.get("/get-resume", isJwtValid, resumeController.getResume)
router.put("/upload-resume", isJwtValid, isCandidate, generateFileID, docParser, resumeController.uploadResume)


module.exports = router