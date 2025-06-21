const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")
  
const flaggedJobController = {}

savedJobController.saveJob = ("/save-job", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const payload = JSON.parse(req.body)
        if(!payload.jobID){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "jobID is required"}, true)
            return
        }
        const jobID = ObjectId.createFromHexString(payload.jobID);
        //check if the job exists
        const job = await database.findOne({_id: jobID}, database.collections.jobs)
        if(!job){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "job not found"}, true)
            return
        }
        //check if the job is deleted
        if(job.deleted === true){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "job is deleted"}, true)
            return
        }

        //check if the user has already saved the job and not deleted it
        const alreadySaved = await database.findOne({userID: userID, jobID: jobID}, database.collections.savedJobs)
        if(alreadySaved && alreadySaved.deleted === false){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "already saved"}, true)
            return
        }

        //if the job is already saved but deleted, then update it to not deleted
        if(alreadySaved && alreadySaved.deleted === true){
            await database.updateOne({userID: userID, jobID: jobID}, database.collections.savedJobs, {deleted: false})
            utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "Job restored successfully"}, true)
            return
        }
        
        //move the job to saved jobs
        const savedJob = {
            userID: userID,
            jobID: jobID,
            deleted: false,
            createdAt: new Date()
        }

        await database.insertOne(savedJob, database.collections.savedJobs)

        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "Saved successfully"}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

savedJobController.getSavedJobs = ("/get-saved-jobs", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
       
        //get all saved jobs for the user
        const savedJobs = await database.db.collection(database.collections.savedJobs).aggregate([
            {
                $match: {
                    userID: userID,
                    deleted: false
                }
            },
            {
                $lookup: {
                    from: "jobs",
                    localField: "jobID",
                    foreignField: "_id",
                    as: "jobDetails"
                }
            },
            {
                $unwind: "$jobDetails"
            },
            {
                $match: {
                    "jobDetails.deleted": false,
                    "jobDetails.active": true
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "jobDetails.employer",
                    foreignField: "_id",
                    as: "employerDetails"
                }
            },
            {
                $addFields: {
                    "jobDetails.employer": {
                        $cond: [
                            { $gt: [ { $size: "$employerDetails" }, 0 ] },
                            {
                                _id: { $arrayElemAt: ["$employerDetails._id", 0] },
                                companyName: { $arrayElemAt: ["$employerDetails.companyName", 0] },
                                companyLogo: { $arrayElemAt: ["$employerDetails.companyLogo", 0] }
                            },
                            null
                        ]
                    }
                }
            },
            {
                $project: {
                    userID: 1,
                    jobID: 1,
                    createdAt: 1,
                    jobDetails: {
                        $let: {
                            vars: {
                                jobDetails: "$jobDetails"
                            },
                            in: {
                                $mergeObjects: [
                                    "$$jobDetails",
                                    {
                                        applicants: { $size: { $ifNull: ["$$jobDetails.applicants", []] } }
                                    }
                                ]
                            }
                        }
                    }
                }
            }   
        ]).toArray();

        
        if(savedJobs.length === 0){
            utilities.setResponseData(res, 404, {'content-type': 'application/json'}, {msg: "no saved jobs found"}, true)
            return
        }

        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {savedJobs}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})



savedJobController.deleteSavedJob = ("/delete-saved-job", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const savedJobID = ObjectId.createFromHexString(req.query.savedJobID)
        
        //check if the saved job exists
        const savedJob = await database.findOne({_id: savedJobID, userID: userID, deleted: false}, database.collections.savedJobs)
        if(!savedJob){
            utilities.setResponseData(res, 404, {'content-type': 'application/json'}, {msg: "saved job not found"}, true)
            return  
        }
        //mark the saved job as deleted
        await database.updateOne({_id: savedJobID, userID: userID}, database.collections.savedJobs, {deleted: true})

        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "Deleted successfully"}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})


module.exports = flaggedJobController