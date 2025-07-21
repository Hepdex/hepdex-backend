const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {uploadFileToS3} = require("../../lib/s3Uploader.js")
const sharp = require("sharp");
const path = require("path"); // Ensure this is imported at the top
const {ObjectId} = require("mongodb")
const {sendEmail, otpEmailContent} = require("../../lib/email")

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
        //trim payload
        for(let key of Object.keys(payload)){
            if(typeof payload[key] === "string"){
                payload[key] = payload[key].trim()
            }
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
        const otp = utilities.otpGenerator()

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
        //trim payload
        for(let key of Object.keys(payload)){
            if(typeof payload[key] === "string"){
                payload[key] = payload[key].trim()
            }
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
        const otp = utilities.otpGenerator()

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
        const emailContent = otpEmailContent(otp)
        const emailData = {
            to: user.email,
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


userController.forgotPassword = ("/forgot-password", async (req, res)=>{
    try{
        const payload = JSON.parse(req.body)

        //validate payload
        const payloadStatus = utilities.profileUpdateValidator(payload, ["email", "password"])
        if(!payloadStatus.isValid){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: payloadStatus.msg}, true)
            return
        }

        //check if user exists
        const user = await database.findOne({email: payload.email}, database.collections.users)
        if(!user){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "email does not exists"}, true)
            return
        }
        
        //generate otp
        const otp = utilities.otpGenerator()

        //delete any existing update request
        await database.deleteMany({userID: user._id}, database.collections.updates)

        //hash new password
        payload.password = utilities.dataHasher(payload.password)

        //add data to updates collection
        const updateData = {
            userID: user._id,
            type: "password",
            value: payload.password,
            otp: otp,
            createdAt: new Date()
        }

        await database.insertOne(updateData, database.collections.updates)

        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {userID: user._id}, true)
        
        //send OTP to email

        const emailContent = otpEmailContent(otp)
        const emailData = {
            to: user.email,
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

userController.resendUpdateOTP = ("/resend-update-otp", async (req, res)=>{
    try {

        const userID = ObjectId.createFromHexString(req.decodedToken.userID)

        //get user update
        const userUpdate = await database.findOne({userID: userID}, database.collections.updates)
        
        if(!userUpdate){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "update request not found"}, true)
            return
        }
        const user = await database.findOne({_id: userID}, database.collections.users)

        //generate new OTP
        const newOTP = utilities.otpGenerator() 
        //update updates object
        await database.updateOne({userID: userID}, database.collections.updates, {otp: newOTP})

        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "OTP set successfully"}, true)

        //SEND EMAIL HERE
        const emailContent = otpEmailContent(newOTP)
            const emailData = {
                to: user.email,
                subject: "Hepdex OTP Verification",
                text: `Your OTP is: ${newOTP}`,
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


userController.verifyforgotPasswordOTP = ("/verify-forgot-password-otp", async (req, res)=>{
    try {
        const payload = JSON.parse(req.body)
        const userID = ObjectId.createFromHexString(payload.userID)

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


userController.checkUniqueEmail = ("/check-unique-email", async (req, res)=>{
    try {
        const payload = JSON.parse(req.body)

        //check if email exists
        const emailExists = await database.findOne({email: payload.email}, database.collections.users)
        
        
        if(emailExists){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "This email already exists"}, true)
            return
        }

        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "Email does not exist"}, true)

        return
            
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})


userController.uploadProfileImage = async (req, res) => {
    try {
        const userID = ObjectId.createFromHexString(req.decodedToken.userID);

        if (!req.file) {
            utilities.setResponseData(res, 400, { 'content-type': 'application/json' }, { msg: "no file uploaded" }, true);
            return;
        }

        // Convert image to JPEG format for consistency
        const convertedBuffer = await sharp(req.file.buffer)
            .resize(500, 500, { fit: 'cover' }) // optional: resize square
            .jpeg({ quality: 80 }) // convert to JPEG
            .toBuffer();

        const s3Key = `profile-images/img-${userID}.jpg`;

        const s3UploadResult = await uploadFileToS3({
            buffer: convertedBuffer,
            fileName: s3Key,
            mimeType: 'image/jpeg'
        });

        if (!s3UploadResult) {
            utilities.setResponseData(res, 400, { 'content-type': 'application/json' }, { msg: "could not upload file" }, true);
            return;
        }

        await database.updateOne(
            { _id: userID },
            database.collections.users,
            { profileImage: s3UploadResult.Location }
        );

        utilities.setResponseData(res, 200, { 'content-type': 'application/json' }, {
            msg: "profile image uploaded successfully",
            url: s3UploadResult.Location
        }, true);

    } catch (err) {
        console.error(err);
        utilities.setResponseData(res, 500, { 'content-type': 'application/json' }, { msg: "server error" }, true);
    }
};



module.exports = userController