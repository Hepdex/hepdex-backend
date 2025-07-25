const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const { uploadFileToS3 } = require("../../lib/s3Uploader")
const path = require("path");
const {ObjectId} = require("mongodb")
const {sendEmail, otpEmailContent} = require("../../lib/email")
 
const candidateAuthController = {}
 
 
candidateAuthController.signup = ("/candidate-signup", async (req, res)=>{
    try{
        const payload = req.body
 
        //Validate payload
        const paylodStatus = await utilities.userSignupValidator(payload, ["firstName", "lastName", "email", "jobType", "jobTitle", "country", "password"], "candidate")
        if(!paylodStatus.isValid){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: paylodStatus.msg}, true)
            return
        }
        //trim payload
        for(let key of Object.keys(payload)){
            if(typeof payload[key] === "string"){
                payload[key] = payload[key].trim()
            }
        }

        payload._id = req.generatedUserID

        
        //convert email and username to all lowercase
        payload.email = payload.email.toLowerCase()
        payload.country = payload.country.toLowerCase()
        payload.jobType = payload.jobType.toLowerCase()
        payload.jobTitle = payload.jobTitle.toLowerCase()
        payload.available = true
        payload.deleted = false

        //check if email
        const uniqueChecker = await database.checkForExistingUser(payload)
 
 
        if(uniqueChecker.doesUserDetailExist){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: `this ${uniqueChecker.userDetail} already exists`}, true)
            return
        }
        //hash password
        payload.password = utilities.dataHasher(payload.password)

        if (req.file) {
            const fileName = `doc-${req.generatedUserID.toString()}-${req.generatedFileId.toString()}${path.extname(req.file.originalname)}`;
        
            const s3UploadResult = await uploadFileToS3({
                buffer: req.file.buffer,
                fileName: `resumes/${fileName}`, // saves inside 'resumes' folder in bucket
                mimeType: req.file.mimetype
            });
        
            payload.resumePath = s3UploadResult.Location; // or s3UploadResult.Key if you prefer
        }
 
        //add other properties
        payload.role = "candidate"
        payload.createdAt = new Date()
        payload.isEmailVerified = false
 
        //save to database
        const savedCandidate = await database.insertOne(payload, database.collections.users)

        //generate otp
        const otp = utilities.otpGenerator()

        //add data to updates collection
        const updateData = {
            userID: savedCandidate.insertedId,
            type: "isEmailVerified",
            value: true,
            otp: otp,
            createdAt: new Date()
        }

        await database.insertOne(updateData, database.collections.updates)
 
        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {userID: savedCandidate.insertedId}, true)
 
        //SEND EMAIL HERE
        const emailContent = otpEmailContent(otp)
            const emailData = {
                to: payload.email,
                subject: "Hepdex OTP Verification",
                text: `Your OTP is: ${otp}`,
                html: emailContent
            }

            sendEmail(emailData)

 
        return
             
         
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})
 
 
module.exports = candidateAuthController