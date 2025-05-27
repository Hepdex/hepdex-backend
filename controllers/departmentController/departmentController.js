const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
  
const departmentController = {}


departmentController.getDepartments = ("/delete-job", async (req, res)=>{
    try{
        
        //get departments
        const departments = await database.findMany({}, database.collections.departments).toArray()

        //send response
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {departments}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

module.exports = departmentController
