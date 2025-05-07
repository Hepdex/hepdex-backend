const path = require("path");
const utilities = require('../../lib/utilities.js')
const database = require('../../lib/database.js')
const {getSignedS3Url, uploadFileToS3} = require("../../lib/s3Uploader.js")
const {ObjectId} = require("mongodb")
const resumeController = {}

resumeController.uploadResume = async (req, res) => {
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)

        if(!req.file){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "no file uploaded"}, true)
            return
        }
        //get the file name
        const fileName = `doc-${userID.toString()}-${req.generatedFileId.toString()}${path.extname(req.file.originalname)}`;

        const s3UploadResult = await uploadFileToS3({
            buffer: req.file.buffer,
            fileName: `resumes/${fileName}`, // saves inside 'resumes' folder in bucket
            mimeType: req.file.mimetype
        });

        //check if the file is uploaded successfully
        if(!s3UploadResult){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "could not upload file"}, true)
            return
        }
        //update the user object with the resume path
        await database.updateOne({_id: userID}, database.collections.users, {resumePath: s3UploadResult.Location})
        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "file uploaded successfully"}, true)


    }
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
}

resumeController.getResume = async (req, res) => {
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID);
        const resumePath = req.query.resumePath
        let fileName;
        //get user
        if(resumePath){
            //extract the file name from the resume path
            fileName = utilities.extractUrlFilename(resumePath)

        }
        else{
            const user = await database.findOne({_id: userID}, database.collections.users)
            if(!user){
                utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "user not found"}, true)
                return
            }
            //check if the user is a candidate
            if(user.role !== "candidate"){
                utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "user is not a candidate"}, true)
                return
            }
            //check if the user has a resume
            if(!user.resumePath){
                utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "user has no resume"}, true)
                return
            }
            //extract the file name from the resume path
            fileName = utilities.extractUrlFilename(user.resumePath)

        }
        
        //check if the file name is valid
        if(!fileName){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "invalid file name"}, true)
            return
        }
        const signedUrl = await getSignedS3Url(fileName, 1800)
        if(!signedUrl){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "could not get signed url"}, true)
            return
        }
        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {signedUrl}, true)
    }
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
}

module.exports = resumeController