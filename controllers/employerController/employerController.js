const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {uploadFileToS3} = require("../../lib/s3Uploader.js")
const sharp = require("sharp");
const {ObjectId} = require("mongodb")

const employerController = {}

employerController.updateProfile = ("/update-candidate-profile", async (req, res)=>{
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
        const payloadStatus = utilities.profileUpdateValidator(payload, ["firstName", "lastName", "companyName", "companySize", "country"])
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

        if(payloadStatus.updates.country){
            payloadStatus.updates.country = payloadStatus.updates.country.toLowerCase()
        }

        payloadStatus.updates.updatedAt = new Date()
        
        //update user
        await database.updateOne({_id: userID}, database.collections.users, payloadStatus.updates)

        // get updated user
        const updatedUser = await database.findOne({_id: userID}, database.collections.users, ["password", "otp", "deleted"], 0 )

        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {updatedUser}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})


employerController.requirements = ("/update-candidate-profile", async (req, res)=>{
    try{
        //const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const payload = JSON.parse(req.body)
        
        payload.solved = false

        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "Success"}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})


employerController.uploadLogoImage = async (req, res) => {
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

        const s3Key = `logo-images/img-${userID}.jpg`;

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
            { companyLogo: s3UploadResult.Location }
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

module.exports = employerController