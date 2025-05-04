const utilities = require('../../lib/utilities.js')
const database = require('../../lib/database.js')
const {getSignedS3Url} = require("../../lib/s3Uploader.js")
const {ObjectId} = require("mongodb")
const resumeController = {}

resumeController.getResume = async (req, res) => {
    try{
        const userID = ObjectId.createFromHexString(req.query.userID);
        //get user
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
        const fileName = utilities.extractUrlFilename(user.resumePath)
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