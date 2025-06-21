const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")
  
const flaggedJobController = {}

flaggedJobController.flagJob = ("/flag-job", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const payload = JSON.parse(req.body)
        if(!payload.jobID){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "jobID is required"}, true)
            return
        }
        const jobID = ObjectId.createFromHexString(payload.jobID);

        // validate reason
        if (!payload.reason || typeof payload.reason !== 'string' || payload.reason.trim().length < 3) {
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "A valid reason is required"}, true)
            return
        }
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

        //check if the job is already reported by the user
        const reportedJob = await database.findOne({jobID: jobID, resolved: false}, database.collections.flaggedJobs)

        if(!reportedJob){
            //create a new reported job
            const newReportedJob = {
                jobID: jobID,
                reporters: [{userID: userID, reason: payload.reason, flaggedAt: new Date()}],
                createdAt: new Date(),
                resolved: false
            }
            await database.insertOne(newReportedJob, database.collections.flaggedJobs)
        }
        else{
            //check if the user has already reported the job
            const hasReported = reportedJob.reporters.some(reporter => reporter.userID.toString() === userID.toString());
            if(hasReported){
                utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "you have already reported this job"}, true)
                return
            }
            //update the reported job
            await database.db.collection(database.collections.flaggedJobs).updateOne(
                {_id: reportedJob._id},
                {
                    $push: {
                        reporters: {userID: userID, reason: payload.reason, flaggedAt: new Date()}
                    }
                }
            )
        }

        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "Flagged successfully"}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})



flaggedJobController.updateResolvedStatus = ("/resolve-flagged-job", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const flaggedJobID = ObjectId.createFromHexString(req.body.flaggedJobID)
        
        //check if the flagged job exists
        const flaggedJob = await database.findOne({_id: flaggedJobID, resolved: false}, database.collections.flaggedJobs)
        if(!flaggedJob){
            utilities.setResponseData(res, 404, {'content-type': 'application/json'}, {msg: "flagged job not found"}, true)
            return  
        }

        //update the flagged job to resolved
        await database.updateOne({_id: flaggedJobID}, database.collections.flaggedJobs, {resolved: true, resolvedBy: userID, resolvedAt: new Date()})
        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "Flagged job resolved successfully"}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})


module.exports = flaggedJobController