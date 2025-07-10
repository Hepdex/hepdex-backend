const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")

const candidateController = {}

candidateController.getCandidates = ("/get-candidates", async (req, res) => {
    try {
        const query = req.query;

        // Extract known filters
        const {
            jobType,
            jobTitle,
            country,
            skills, // comma-separated string: "HR,Recruitment"
            matchType = "some" // 💡 NEW: allow user to specify how to match skills
        } = query;

        // Build base match object
        const matchQuery = {
            role: "candidate",
            deleted: false,
            available: true
        };

        if (jobType) matchQuery.jobType = jobType.toLowerCase();
        if (jobTitle) matchQuery.jobTitle = jobTitle.toLowerCase();
        if (country) matchQuery.country = country.toLowerCase();

        // Prepare skill filters if present
        const skillArray = skills ? skills.split(",").map(s => s.trim().toLowerCase()) : [];

        // 💡 Determine skill match logic
        const skillMatchExpr =
            matchType === "some"
                ? { $gt: [ { $size: { $setIntersection: ["$lowerSkills", skillArray] } }, 0 ] }
                : { $eq: [ { $size: { $setIntersection: ["$lowerSkills", skillArray] } }, skillArray.length ] };

        const pipeline = [
            {
                $match: matchQuery
            },
            {
                $addFields: {
                    lowerSkills: {
                        $map: {
                            input: { $ifNull: ["$bio.skills", []] },
                            as: "skill",
                            in: { $toLower: "$$skill" }
                        }
                    }
                }
            },
            {
                $match: skillArray.length > 0 ? { $expr: skillMatchExpr } : {}
            },
            {
                $project: {
                    password: 0,
                    deleted: 0,
                    otp: 0,
                    lowerSkills: 0
                }
            }
        ];

        const candidates = await database.db.collection(database.collections.users).aggregate(pipeline).toArray();

        utilities.setResponseData(res, 200, { 'content-type': 'application/json' }, { candidates }, true);
        return;

    } catch (err) {
        console.log(err);
        utilities.setResponseData(res, 500, { 'content-type': 'application/json' }, { msg: "server error" }, true);
        return;
    }
});


candidateController.getCandidate = ("/get-candidate", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.query.userID)
        
        //get candidate 
        const candidate = await database.findOne({_id: userID, deleted: false}, database.collections.users, ["password", "otp", "deleted"], 0)

        if(!candidate){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "candidate not found"}, true)
        }
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {candidate}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})


candidateController.updateProfile = ("/update-candidate-profile", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const payload = JSON.parse(req.body)
        
        //get user
        const user = await database.findOne({_id: userID, deleted: false}, database.collections.users)

        if(!user){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "user not found"}, true)
            return
        }

        const bio = payload.bio
        if(bio){
            delete payload.bio
        }
        
        //validate payload
        const payloadStatus = utilities.profileUpdateValidator(payload, ["firstName", "lastName", "jobType", "jobTitle", "country", "available"])
        if(!payloadStatus.isValid){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: payloadStatus.msg}, true)
            return
        }

        if(payloadStatus.updates.country){
            payloadStatus.updates.country = payloadStatus.updates.country.toLowerCase()
        }

        if(bio){
            payloadStatus.updates.bio = bio
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

candidateController.updateBio = ("/update-candidate-Bio", async (req, res)=>{
    try{
        
        const payload = JSON.parse(req.body)
        const userID = ObjectId.createFromHexString(req.query.userID)
        
        //get user
        const user = await database.findOne({_id: userID, deleted: false}, database.collections.users)

        if(!user){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "user not found"}, true)
            return
        }
        
        
        //update user
        await database.updateOne({_id: userID}, database.collections.users, {bio: payload})

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


candidateController.updateApprovalStatus = ("/update-applicant-approval-status", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const payload = JSON.parse(req.body)
        const candidateID = ObjectId.createFromHexString(payload.candidateID)
        const jobID = ObjectId.createFromHexString(payload.jobID)

        //get job
        const job = await database.findOne({_id: jobID, deleted: false}, database.collections.jobs)
        if(!job){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "job not found"}, true)
            return
        }
        //check if user owns the job
        if(job.employer.toString() !== userID.toString()){
            utilities.setResponseData(res, 403, {'content-type': 'application/json'}, {msg: "you are not allowed to perform this action"}, true)
            return
        }
        //check if candidate esists in the job applicants
        const candidate = job.applicants.find(applicant => applicant.userID.toString() === candidateID.toString())
        if(!candidate){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "candidate not found in job applicants"}, true)
            return
        }

        // make sure payload has the approved field
        if(typeof payload.approved !== "boolean"){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "approved field is required"}, true)
            return
        }
        //update candidate approval
        await database.db.collection(database.collections.jobs).updateOne(
            { _id: jobID, "applicants.userID": candidateID },
            {
                $set: {
                    "applicants.$[elem].approved": payload.approved
                }
            },
            {
                arrayFilters: [{ "elem.userID": candidateID }]
            }
        );
        
        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "Success"}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})


candidateController.getApprovedApplicants = ("/get-approved-applicants", async (req, res) => {
    try {
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const jobID = ObjectId.createFromHexString(req.query.jobID)
        
        //get job
        const job = await database.findOne({_id: jobID, deleted: false}, database.collections.jobs)
        if(!job){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "job not found"}, true)
            return
        }
        //check if user owns the job
        if(job.employer.toString() !== userID.toString()){
            utilities.setResponseData(res, 403, {'content-type': 'application/json'}, {msg: "you are not allowed to perform this action"}, true)
            return
        }

        //get approved applicants
        const candidates = job.applicants.filter(applicant => applicant.approved === true) 

        utilities.setResponseData(res, 200, { 'content-type': 'application/json' }, { candidates }, true);
        return;

    } catch (err) {
        console.log(err);
        utilities.setResponseData(res, 500, { 'content-type': 'application/json' }, { msg: "server error" }, true);
        return;
    }
});

module.exports = candidateController