const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")
const {sendEmail, otpEmailContent} = require("../../lib/email")

const employerAuthController = {}


employerAuthController.signup = ("/employer-signup", async (req, res)=>{
    try {
        const payload = JSON.parse(req.body)

        //Validate payload
        const paylodStatus = await utilities.userSignupValidator(payload, ["firstName", "lastName", "email", "companyName", "companySize", "country", "password"], "employer")
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

        //convert email and username to all lowercase
        payload.email = payload.email.toLowerCase()
        payload.country = payload.country.toLowerCase()
        payload.deleted = false
        //check if email
        const uniqueChecker = await database.checkForExistingUser(payload)


        if(uniqueChecker.doesUserDetailExist){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: `this ${uniqueChecker.userDetail} already exists`}, true)
            return
        }
        //hash password
        payload.password = utilities.dataHasher(payload.password)

        //add other properties
        payload.role = "employer"
        payload.createdAt = new Date()
        payload.isEmailVerified = false

        //save to database
        const savedEmployer = await database.insertOne(payload, database.collections.users)

        //generate otp
        const otp = utilities.otpGenerator()

        //add data to updates collection
        const updateData = {
            userID: savedEmployer.insertedId,
            type: "isEmailVerified",
            value: true,
            otp: otp,
            createdAt: new Date()
        }

        await database.insertOne(updateData, database.collections.updates)

        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {userID: savedEmployer.insertedId}, true)

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



module.exports = employerAuthController