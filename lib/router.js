const express = require('express')
const router = express.Router()


const employerAuthController = require("../controllers/employerController/employerAuthController")
const employerController = require("../controllers/employerController/employerController")
const userAuthController = require("../controllers/userController/userAuthController")
const userController = require("../controllers/userController/userController")
const candidateAuthController = require("../controllers/candidateController/candidateAuthController")
const candidateController = require("../controllers/candidateController/candidateController")
const jobController = require("../controllers/jobController/jobController")
const savedJobController = require("../controllers/savedJobController/savedJobController")
const flaggedJobController = require("../controllers/flaggedJobController/flaggedJobController")
const resumeController = require("../controllers/resumeController/resumeController")
const departmentController = require("../controllers/departmentController/departmentController")
const contactController = require("../controllers/contactController/contactController")

const {bodyParser, docParser, generateFileID, generateUserID, isJwtValid,
    isEmployer, isCandidate, imageParser, linientIsJwtValid
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
router.put("/resend-otp", bodyParser, userAuthController.resendOTP)
router.get("/resend-update-otp", bodyParser, isJwtValid, userController.resendUpdateOTP)
router.get("/auth-status", isJwtValid, userAuthController.authStatus)
router.get("/get-user", isJwtValid, userController.getUser)
router.put("/update-email", isJwtValid, bodyParser, userController.updateEmail)
router.put("/check-unique-email", bodyParser, userController.checkUniqueEmail)
router.put("/update-password", isJwtValid, bodyParser, userController.updatePassword)
router.put("/verify-update-otp", isJwtValid, bodyParser, userController.verifyUpdateOTP)
router.put("/forgot-password", bodyParser, userController.forgotPassword)
router.put("/verify-forgot-password-otp", bodyParser, userController.verifyforgotPasswordOTP)
router.put("/upload-profile-image", isJwtValid, generateFileID, imageParser, userController.uploadProfileImage)

//Employer
router.post("/employer/signup", bodyParser, employerAuthController.signup)
router.put("/update-employer-profile", isJwtValid, bodyParser, isEmployer, employerController.updateProfile)
router.post("/send-requirements", bodyParser, employerController.requirements)
router.put("/upload-logo-image", isJwtValid, isEmployer, imageParser, employerController.uploadLogoImage)

//Candidate
router.post("/candidate/signup", generateUserID, generateFileID, docParser, candidateAuthController.signup)
router.get("/get-candidates", isJwtValid, candidateController.getCandidates)
router.get("/get-candidate", isJwtValid, candidateController.getCandidate)
router.put("/update-candidate-profile", isJwtValid, bodyParser, isCandidate, candidateController.updateProfile)
router.put("/update-candidate-bio", bodyParser, candidateController.updateBio)
//router.put("/update-applicant-approval-status", isJwtValid, isEmployer, bodyParser, candidateController.updateApprovalStatus)
router.put("/update-applicant-hired-status", isJwtValid, isEmployer, bodyParser, candidateController.updateHiredStatus)
router.get("/get-approved-applicants", isJwtValid, isEmployer, candidateController.getApprovedApplicants)

//Job
router.post("/add-job", isJwtValid, bodyParser, isEmployer, jobController.addJobs)
router.get("/get-jobs", isJwtValid, isEmployer, jobController.getJobs)
router.get("/get-job", isJwtValid, isEmployer, jobController.getJob)
router.get("/get-job/:slug", linientIsJwtValid, jobController.getJobBySlug);
router.get("/get-job-candidate", linientIsJwtValid, jobController.getJobCandidate)
router.get("/search-jobs", linientIsJwtValid, jobController.searchJobs)
router.put("/update-job-active-status", isJwtValid, isEmployer, bodyParser, jobController.updateActiveStatus)
router.post("/job-application", isJwtValid, bodyParser, isCandidate, jobController.apply)
router.put("/update-job", isJwtValid, bodyParser, isEmployer, jobController.updateJob)
router.delete("/delete-job", isJwtValid, isEmployer, jobController.deleteJob)

//Saved Jobs
router.post("/save-job", isJwtValid, bodyParser, isCandidate, savedJobController.saveJob)
router.get("/get-saved-jobs", isJwtValid, isCandidate, savedJobController.getSavedJobs)
router.get("/get-saved-job", isJwtValid, isCandidate, savedJobController.getSavedJob)
router.delete("/delete-saved-job", isJwtValid, isCandidate, savedJobController.deleteSavedJob)

//Flagged Jobs
router.post("/flag-job", isJwtValid, bodyParser, isCandidate, flaggedJobController.flagJob)

//Department
router.get("/get-departments", departmentController.getDepartments)

//Resume
router.get("/get-resume", isJwtValid, resumeController.getResume)
router.put("/upload-resume", isJwtValid, isCandidate, generateFileID, docParser, resumeController.uploadResume)

//Contact message
router.post("/post-contact-message", bodyParser, contactController.postContactMessage)


module.exports = router