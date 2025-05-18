const express = require('express')
const router = express.Router()


const employerAuthController = require("../controllers/employerController/employerAuthController")
const employerController = require("../controllers/employerController/employerController")
const userAuthController = require("../controllers/userController/userAuthController")
const userController = require("../controllers/userController/userController")
const candidateAuthController = require("../controllers/candidateController/candidateAuthController")
const candidateController = require("../controllers/candidateController/candidateController")
const jobController = require("../controllers/jobController/jobController")
const resumeController = require("../controllers/resumeController/resumeController")

const {bodyParser, docParser, generateFileID, generateUserID, isJwtValid,
    isEmployer, isCandidate
} = require("../lib/middleware")

router.use((req, res, next)=>{
    const allowedOrigins = [
        'http://localhost:5173', 
        'https://hepdex.com',
        'https://www.hepdex.com'
    ];
    const origin = req.headers.origin;
    // If the origin is in the allowed origins list, set it in the header
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-type, Authorization')
    next()
})

//USER
router.post("/login", bodyParser, userAuthController.login)
router.get("/logout", bodyParser, userAuthController.logout)
router.put("/verify-otp", bodyParser, userAuthController.verifyOTP)
router.get("/auth-status", isJwtValid, userAuthController.authStatus)
router.get("/get-user", isJwtValid, userController.getUser)
router.put("/update-email", isJwtValid, bodyParser, userController.updateEmail)
router.put("/update-password", isJwtValid, bodyParser, userController.updatePassword)
router.put("/verify-update-otp", isJwtValid, bodyParser, userController.verifyUpdateOTP)
router.put("/forgot-password", bodyParser, userController.forgotPassword)
router.put("/verify-forgot-password-otp", bodyParser, userController.verifyforgotPasswordOTP)

//Employer
router.post("/employer/signup", bodyParser, employerAuthController.signup)
router.put("/update-employer-profile", isJwtValid, bodyParser, isEmployer, employerController.updateProfile)
router.post("/send-requirements", isJwtValid, bodyParser, isEmployer, employerController.requirements)

//Candidate
router.post("/candidate/signup", generateUserID, generateFileID, docParser, candidateAuthController.signup)
router.get("/get-candidates", isJwtValid, candidateController.getCandidates)
router.put("/update-candidate-profile", isJwtValid, bodyParser, isCandidate, candidateController.updateProfile)

//Job
router.post("/add-job", isJwtValid, bodyParser, isEmployer, jobController.addJobs)
router.get("/get-jobs", isJwtValid, isEmployer, jobController.getJobs)
router.get("/get-job", isJwtValid, isEmployer, jobController.getJob)
router.get("/search-jobs", isJwtValid, jobController.searchJobs)
router.put("/update-job-active-status", isJwtValid, isEmployer, bodyParser, jobController.updateActiveStatus)
router.post("/job-application", isJwtValid, bodyParser, isCandidate, jobController.apply)
router.put("/update-job", isJwtValid, bodyParser, isEmployer, jobController.updateJob)
router.delete("/delete-job", isJwtValid, isEmployer, jobController.deleteJob)

//Resume
router.get("/get-resume", isJwtValid, resumeController.getResume)
router.put("/upload-resume", isJwtValid, isCandidate, generateFileID, docParser, resumeController.uploadResume)


module.exports = router