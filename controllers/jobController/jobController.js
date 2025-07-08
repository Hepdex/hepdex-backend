const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")
const {customAlphabet} = require("nanoid")

const nanoid = customAlphabet('abcdefghij0123456789', 6);
  
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

        //Generate a unique slug
        let slug;
        let exists;
        const safeTitle = payload.jobTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

        do {
            const randomPart = nanoid();
            slug = `${safeTitle}-${randomPart}`;
            exists = await database.db.collection(database.collections.jobs).findOne({ slug });
        } while (exists);

        payload.slug = slug;

        //add to database
        await database.insertOne(payload, database.collections.jobs)
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "sucess"}, true)
        return
        
      
    } 
    catch (err) {
        console.log(err)
        // handle potential race condition on slug uniqueness
        if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
            utilities.setResponseData(res, 409, { 'content-type': 'application/json' }, { msg: "Slug already exists, please try again" }, true);
            return;
        }   
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

jobController.searchJobs = ("/search-jobs", async(req, res)=>{
    try{
        let userID = req.decodedToken ? ObjectId.createFromHexString(req.decodedToken.userID) : null

        //get the job title from query param
        const payload = req.query
        payload.deleted = false
        payload.active = true
        const page = payload.page || 1
        delete payload.page // remove page from payload to avoid it being used in the query
        const limit = 10
        const skip = (parseInt(page) - 1) * limit;

        if(payload.jobTitle){
            payload.jobTitle = { $regex: payload.jobTitle || '', $options: 'i' } 
        }

        if(payload.department){
            payload.department = { $regex: payload.department || '', $options: 'i' } 
        }
        if(payload.country){
            payload.country = { $regex: payload.country || '', $options: 'i' } 
        }


        //get all active jobs by the specified job title
        let jobs;

        // Use same filters for count
        const totalCount = await database.db.collection(database.collections.jobs).countDocuments(payload);
        
        jobs = await database.db.collection(database.collections.jobs).aggregate([
            {
                $match: payload
            },
            {
                $lookup: {
                    from: database.collections.users, // users collection name
                    localField: 'employer',
                    foreignField: '_id',
                    as: 'employerDetails'
                }
            },
            {
                $addFields: {
                    employer: {
                        $cond: [
                            { $gt: [ { $size: '$employerDetails' }, 0 ] },
                            {
                                _id: { $arrayElemAt: ['$employerDetails._id', 0] },
                                companyName: { $arrayElemAt: ['$employerDetails.companyName', 0] },
                                companyLogo: { $arrayElemAt: ['$employerDetails.companyLogo', 0] }
                            },
                            null
                        ]
                    },
                    applicantCount: { $size: { $ifNull: ['$applicants', []] } }
                }
            },
            {
                $lookup: { // NEW: Join with savedJobs
                    from: database.collections.savedJobs,
                    let: { jobId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$jobID', '$$jobId'] },
                                        { $eq: ['$deleted', false] },
                                        ...(userID ? [{ $eq: ['$userID', userID] }] : [{ $eq: [false, true] }]) // always false if no user
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'savedInfo'
                }
            },
            {
                $lookup: { //  NEW: Lookup for hasApplied
                    from: database.collections.jobApplications,
                    let: { jobId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$jobID', '$$jobId'] },
                                        ...(userID ? [{ $eq: ['$userID', userID] }] : [{ $eq: [false, true] }])
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'appliedInfo'
                }
            },
            {
                $addFields: { // NEW: Add isSaved field
                    isSaved: { $gt: [{ $size: '$savedInfo' }, 0] },
                    hasApplied: { $gt: [{ $size: '$appliedInfo' }, 0] }
                }
            },
            { $project: { employerDetails: 0, applicants: 0, deleted: 0, savedInfo: 0, appliedInfo: 0 } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]).toArray()

        // Compute pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const isLastPage = page >= totalPages;
        const pagination = {
            totalCount,
            totalPages,
            currentPage: page,
            isLastPage
        }
        
        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {jobs, pagination}, true)

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

jobController.getJob = ("/get-job", async (req, res)=>{
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

jobController.getJobCandidate = ("/get-job-candidate", async (req, res)=>{
    try{
        let userID = req.decodedToken ? ObjectId.createFromHexString(req.decodedToken.userID) : null
        const jobID = ObjectId.createFromHexString(req.query.jobID)
        //check if the job exists
        let job = await database.db.collection(database.collections.jobs).aggregate([
            {
                $match: {_id: jobID, deleted: false, active: true}
            },
            {
                $lookup: {
                    from: database.collections.users, // users collection name
                    localField: 'employer',
                    foreignField: '_id',
                    as: 'employerDetails'
                }
            },
            {
                $addFields: {
                    employer: {
                        $cond: [
                            { $gt: [ { $size: '$employerDetails' }, 0 ] },
                            {
                                _id: { $arrayElemAt: ['$employerDetails._id', 0] },
                                companyName: { $arrayElemAt: ['$employerDetails.companyName', 0] },
                                companyLogo: { $arrayElemAt: ['$employerDetails.companyLogo', 0] }
                            },
                            null
                        ]
                    },
                    applicantCount: { $size: { $ifNull: ['$applicants', []] } }
                }
            },
            {
                $lookup: { // NEW: check if user has saved this job
                    from: database.collections.savedJobs,
                    let: { jobId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$jobID', '$$jobId'] },
                                        { $eq: ['$deleted', false] },
                                        ...(userID ? [{ $eq: ['$userID', userID] }] : [{ $eq: [false, true] }]) // always false if no user
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'savedInfo'
                }
            },
            {
                $lookup: { // NEW: Lookup for hasApplied
                    from: database.collections.jobApplications,
                    let: { jobId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$jobID', '$$jobId'] },
                                        ...(userID ? [{ $eq: ['$userID', userID] }] : [{ $eq: [false, true] }])
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'appliedInfo'
                }
            },
            {
                $addFields: { // NEW: add isSaved field
                    isSaved: { $gt: [{ $size: '$savedInfo' }, 0] },
                    hasApplied: { $gt: [{ $size: '$appliedInfo' }, 0] }
                }
            },
            { $project: { employerDetails: 0, applicants: 0, deleted: 0, savedInfo: 0, appliedInfo: 0 } }
        ]).toArray()
        
        if(job.length === 0){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "job not found"}, true)
            return  
        }
        
        job = job[0] // since aggregate returns an array
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {job}, true)
        return    
      
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

jobController.getJobBySlug = ("/get-job/:slug", async (req, res) => {
    try {
        const slug = req.params.slug;

        // Validate
        if (!slug) {
            utilities.setResponseData(res, 400, { 'content-type': 'application/json' }, { msg: "Missing job slug" }, true);
            return;
        }

        // Find job by slug
        const job = await database.db.collection(database.collections.jobs).aggregate([
            {
                $match: {
                    slug,
                    deleted: false,
                    active: true
                }
            },
            {
                $lookup: {
                    from: database.collections.users,
                    localField: 'employer',
                    foreignField: '_id',
                    as: 'employerDetails'
                }
            },
            {
                $addFields: {
                    employer: {
                        $cond: [
                            { $gt: [{ $size: "$employerDetails" }, 0] },
                            {
                                _id: { $arrayElemAt: ["$employerDetails._id", 0] },
                                companyName: { $arrayElemAt: ["$employerDetails.companyName", 0] },
                                companyLogo: { $arrayElemAt: ["$employerDetails.companyLogo", 0] }
                            },
                            null
                        ]
                    },
                    applicantCount: { $size: { $ifNull: ["$applicants", []] } }
                }
            },
            {
                $project: {
                    employerDetails: 0,
                    applicants: 0,
                    deleted: 0
                }
            }
        ]).toArray();

        if (job.length === 0) {
            utilities.setResponseData(res, 404, { 'content-type': 'application/json' }, { msg: "Job not found" }, true);
            return;
        }

        utilities.setResponseData(res, 200, { 'content-type': 'application/json' }, { job: job[0] }, true);
    } catch (err) {
        console.log(err);
        utilities.setResponseData(res, 500, { 'content-type': 'application/json' }, { msg: "Server error" }, true);
    }
});


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