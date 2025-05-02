const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")
  
const jobController = {}
    
jobController.addJobs = ("/add-job", async (req, res)=>{
    try{
        const payload = JSON.parse(req.body)
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
  
        //Validate payload
        const paylodStatus = await utilities.jobValidator(payload, ["jobTitle", "jobType", "department", "country", "aboutRole", "minSalary", "maxSalary", "currency", "workHours", "timeZone"])
        if(!paylodStatus.isValid){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: paylodStatus.msg}, true)
            return
        }

        payload.minSalary = parseInt(payload.minSalary)
        payload.maxSalary = parseInt(payload.maxSalary)
        payload.active = true
        payload.createdAt = new Date()
        payload.employer = userID
        payload.applicants = []

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


jobController.getJobs = ("/get-jobs", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)


        //get jobs database
        const jobs = await database.findMany({employer: userID}, database.collections.jobs).toArray()
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {jobs}, true)
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
        await database.updateOne({_id: jobID, employer: userID}, database.collections.jobs, {active: payload.active})
        const job = await database.findOne({_id: jobID, employer: userID}, database.collections.jobs)
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {job}, true)
        return
        
      
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})
  
  
module.exports = jobController