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
  
  
module.exports = jobController