const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")

const userController = {}

userController.getUser = ("/get-user", async (req, res)=>{
    try {
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)

        // check if user exists
        const user = await database.findOne({_id: userID}, database.collections.users)

        if(!user){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "invalid email or password"}, true)
            return
        }

        delete user.password
        delete user.otp
        delete user.deleted
            
        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {user}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})


userController.updateEmail = ("/update-email", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const payload = JSON.parse(req.body)
        
        //get user
        const user = await database.findOne({_id: userID, deleted: false}, database.collections.users)

        if(!user){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "user not found"}, true)
            return
        }
        
        //validate payload
        const payloadStatus = utilities.profileUpdateValidator(payload, ["email", "password"])
        if(!payloadStatus.isValid){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: payloadStatus.msg}, true)
            return
        }

        //check if email already exists
        const emailExists = await database.findOne({email: payload.email}, database.collections.users)
        if(emailExists){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "email already exists"}, true)
            return
        }

        //check if password is correct
        const password = utilities.dataHasher(payload.password)
        if(user.password !== password){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "invalid email or password"}, true)
            return
        }
        //generate otp
        const otp = "000000"//utilities.generateOTP()

        //delete any existing update request
        await database.deleteMany({userID: userID}, database.collections.updates)

        //add data to updates collection
        const updateData = {
            userID: userID,
            type: "email",
            value: payload.email,
            otp: otp,
            createdAt: new Date()
        }

        await database.insertOne(updateData, database.collections.updates)

        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "success"}, true)
        
        //send OTP to email

        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})



userController.updatePassword = ("/update-password", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const payload = JSON.parse(req.body)
        
        //get user
        const user = await database.findOne({_id: userID, deleted: false}, database.collections.users)

        if(!user){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "user not found"}, true)
            return
        }
        
        //validate payload
        const payloadStatus = utilities.profileUpdateValidator(payload, ["oldPassword", "newPassword"])
        if(!payloadStatus.isValid){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: payloadStatus.msg}, true)
            return
        }


        //check if old password is correct
        const password = utilities. dataHasher(payload.oldPassword)
        if(user.password !== password){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "invalid email or password"}, true)
            return
        }

        //hash new password
        payload.newPassword = utilities.dataHasher(payload.newPassword)
        //generate otp
        const otp = "000000"//utilities.generateOTP()

        //delete any existing update request
        await database.deleteMany({userID: userID}, database.collections.updates)

        //add data to updates collection
        const updateData = {
            userID: userID,
            type: "password",
            value: payload.newPassword,
            otp: otp,
            createdAt: new Date()
        }

        await database.insertOne(updateData, database.collections.updates)

        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "success"}, true)
        
        //send OTP to email

        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})


userController.verifyUpdateOTP = ("/verify-update-otp", async (req, res)=>{
    try {
        const payload = JSON.parse(req.body)
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)

        //get user update
        const userUpdate = await database.findOne({userID: userID}, database.collections.updates)
        
        if(!userUpdate){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "update request not found"}, true)
            return
        }

        //check if OTP match
        if(payload.otp !== userUpdate.otp){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "invalid OTP"}, true)
            return
        }
        //update user data
        const key = userUpdate.type
        await database.updateOne({_id: userID}, database.collections.users, {[key]: userUpdate.value})

        //delete user update
        await database.deleteOne({userID: userID}, database.collections.updates)

        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "Sucess"}, true)

        return
            
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

module.exports = userController