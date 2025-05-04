const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")

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

        //convert email and username to all lowercase
        payload.email = payload.email.toLowerCase()
        payload.country = payload.country.toLowerCase()
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

        //generate otp
        payload.otp = "000000"//utilities.otpGenerator() 

        //save to database
        const savedEmployer = await database.insertOne(payload, database.collections.users)

        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {userID: savedEmployer.insertedId}, true)

        //SEND EMAIL HERE

        return
            
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})



module.exports = employerAuthController