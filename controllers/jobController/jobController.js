const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")
  
const jobController = {}
    
jobController.addJobs = ("/add-job", async (req, res)=>{
    try{
        const payload = JSON.parse(req.body)
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
  
        //Validate payload
        const paylodStatus = await utilities.jobValidator(payload, ["jobTitle", "jobType", "department", "country", "aboutRole", "minSalary", "maxSalary", "currency", "paymentInterval", "startTime", "endTime", "timeZone"])
        if(!paylodStatus.isValid){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: paylodStatus.msg}, true)
            return
        }

        payload.minSalary = parseInt(payload.minSalary)
        payload.maxSalary = parseInt(payload.maxSalary)
        payload.country = payload.country.toLowerCase()
        payload.active = true
        payload.createdAt = new Date()
        payload.employer = userID
        payload.applicants = []
        payload.deleted = false

        //add to database
        await database.insertOne(payload, database.collections.jobs)
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "sucess"}, true)
        return
        
      
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

jobController.searchJobs = ("/search-jobs", async(req, res)=>{
    try{
        //get the job title from query param
        const jobTitle = req.query.jobTitle
        const department = req.query.department

        //get all active jobs by the specified job title
        let jobs;
        if(jobTitle){
            jobs = await database.db.collection(database.collections.jobs).aggregate([
                {
                    $match: {
                        jobTitle: { $regex: jobTitle || '', $options: 'i' },
                        deleted: false,
                        active: true
                    }
                },
                {
                    $addFields: {
                        applicantCount: { $size: { $ifNull: ['$applicants', []] } }
                    }
                },
                {
                    $project: {
                        applicants: 0, // exclude applicants field
                        deleted: 0 // exclude deleted field
                    }
                },
                {
                    $sort: {
                        createdAt: -1 // sort from newest to oldest
                    }
                }
            ]).toArray()
        }
        else if(department){
            jobs = await database.db.collection(database.collections.jobs).aggregate([
                {
                    $match: {
                        jobTitle: { $regex: department || '', $options: 'i' },
                        deleted: false,
                        active: true
                    }
                },
                {
                    $addFields: {
                        applicantCount: { $size: { $ifNull: ['$applicants', []] } }
                    }
                },
                {
                    $project: {
                        applicants: 0, // exclude applicants field
                        deleted: 0 // exclude deleted field
                    }
                },
                {
                    $sort: {
                        createdAt: -1 // sort from newest to oldest
                    }
                }
            ]).toArray()

        }
        else{
            jobs = await database.db.collection(database.collections.jobs).aggregate([
                {
                    $match: {
                        deleted: false,
                        active: true
                    }
                },
                {
                    $addFields: {
                        applicantCount: { $size: { $ifNull: ['$applicants', []] } }
                    }
                },
                {
                    $project: {
                        applicants: 0, // exclude applicants field
                        deleted: 0 // exclude deleted field
                    }
                },
                {
                    $sort: {
                        createdAt: -1 // sort from newest to oldest
                    }
                }
            ]).toArray()
        }

        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {jobs}, true)

    }
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})


jobController.getJobs = ("/get-jobs", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)


        //get jobs database
        const jobs = await database.findMany({employer: userID, deleted: false}, database.collections.jobs, ["deleted"], 0).toArray()
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {jobs}, true)
        return
        
      
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

jobController.getJob = ("/get-jobs", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const jobID = ObjectId.createFromHexString(req.query.jobID)
        //check if the job exists
        const job = await database.findOne({_id: jobID}, database.collections.jobs, ["deleted"], 0)
        if(!job){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "job not found"}, true)
            return  
        }
        //check if the job is deleted
        if(job.deleted === true){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "job is deleted"}, true)
            return
        }
        // check if employer is the owner of the job
        if(job.employer.toString() !== userID.toString()){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "User does not own this job"}, true)
            return
        }
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {job}, true)
        return
        
      
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

jobController.updateActiveStatus = ("/update-job-active-status", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const payload = JSON.parse(req.body)
        const jobID = ObjectId.createFromHexString(payload.jobID)

        //update the job status
        if(typeof payload.active !== "boolean"){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "active should be a boolean"}, true)
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
        // check if employer is the owner of the job
        if(job.employer.toString() !== userID.toString()){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "user doesn't own this job"}, true)
            return
        }


        await database.updateOne({_id: jobID, employer: userID}, database.collections.jobs, {active: payload.active})
        //get the job again to send back to the user
        const updatedJob = await database.findOne({_id: jobID}, database.collections.jobs)
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {updatedJob}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

jobController.apply = ("/job-application", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const payload = JSON.parse(req.body)
        const jobID = ObjectId.createFromHexString(payload.jobID)


        //validate payload
        const paylodStatus = await utilities.applicationValidator(payload, ["firstName", "lastName", "jobID", "email", "phoneNo", "country"])

        if(!paylodStatus.isValid){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: paylodStatus.msg}, true)
            return
        }
        //payload.resume = user.resumePath
        payload.createdAt = new Date()
        payload.userID = userID
        //check if the job exists
        const job = await database.findOne({_id: jobID}, database.collections.jobs)
        
        if(!job){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "job not found"}, true)
            return
        }
        if(job.active === false){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "job is not active"}, true)
            return
        }
        if(job.deleted === true){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "job is deleted"}, true)
            return
        }

        //check if user has a resume
        const user = await database.findOne({_id: userID}, database.collections.users)
        if(!user.resumePath){
            utilities.setResponseData(res, 403, {'content-type': 'application/json'}, {msg: "user has no resume"}, true)
            return
        }
        //add the reumePath to the payload
        payload.resumePath = user.resumePath
        //check if the user has already applied for the job
        const alreadyApplied = job.applicants.find(applicant => applicant.userID.toString() === userID.toString())
        if(alreadyApplied){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "already applied"}, true)
            return
        }

        //add the user to the job applicants
        const applicant = {
            userID: userID,
            status: "applied",
            jobID: jobID,
            createdAt: new Date()
        }

        await database.insertOne(applicant, database.collections.jobApplications)

        // add the job application to the job
        await database.db.collection(database.collections.jobs).updateOne({_id: jobID}, {$push: {applicants: payload}})   

        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "success"}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})


jobController.updateJob = ("/update-job", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const payload = JSON.parse(req.body)
        const jobID = ObjectId.createFromHexString(payload.jobID)

        delete payload.jobID
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
        // check if employer is the owner of the job
        if(job.employer.toString() !== userID.toString()){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "user doesn't own this job"}, true)
            return
        }

        //Validate payload
        console.log(payload)
        const paylodStatus = await utilities.jobValidator(payload, ["jobTitle", "jobType", "department", "country", "aboutRole", "minSalary", "maxSalary", "currency", "paymentInterval", "startTime", "endTime", "timeZone"])
        if(!paylodStatus.isValid){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: paylodStatus.msg}, true)
            return
        }
        payload.minSalary = parseInt(payload.minSalary)
        payload.maxSalary = parseInt(payload.maxSalary)
        payload.country = payload.country.toLowerCase()
        payload.updatedAt = new Date()

        //update the job
        await database.updateOne({_id: jobID, employer: userID}, database.collections.jobs, payload)
        //get the job again to send back to the user
        const updatedJob = await database.findOne({_id: jobID}, database.collections.jobs, ["deleted"], 0)
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {updatedJob}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

jobController.deleteJob = ("/delete-job", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const jobID = ObjectId.createFromHexString(req.query.jobID);
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
        // check if employer is the owner of the job
        if(job.employer.toString() !== userID.toString()){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "user doesn't own this job"}, true)
            return
        }

        //delete job
        await database.updateOne({_id: jobID}, database.collections.jobs, {deleted: true})

        //send response
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "deleted successfully"}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})
  
  
module.exports = jobController




/*[
    {name: 'HR & Recruitment'}, {name: 'Finance & Accounts'}, {name: 'Virtual Support & Assistant'}, {name: 'Media & Marketing'}, {name: 'Graphics & Web Design'},
    {name: 'Product & Engineering'}, {name: 'IT & Security'}, {name: 'Legal Processes'}, {name: 'Operations'}, {name: 'General Business'}
]*/