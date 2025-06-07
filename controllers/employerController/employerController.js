const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")

const employerController = {}

employerController.updateProfile = ("/update-candidate-profile", async (req, res)=>{
    try{
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const payload = JSON.parse(req.body)
        
        //get user
        const user = await database.findOne({_id: userID, deleted: false}, database.collections.users)

        if(!user){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "user not found"}, true)
            return
        }
        
        //validate payload
        const payloadStatus = utilities.profileUpdateValidator(payload, ["firstName", "lastName", "companyName", "companySize", "country"])
        if(!payloadStatus.isValid){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: payloadStatus.msg}, true)
            return
        }

        if(payloadStatus.updates.country){
            payloadStatus.updates.country = payloadStatus.updates.country.toLowerCase()
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



employerController.requirements = ("/update-candidate-profile", async (req, res)=>{
    try{
        //const userID = ObjectId.createFromHexString(req.decodedToken.userID)
        const payload = JSON.parse(req.body)
        
        payload.solved = false

        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "Success"}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

module.exports = employerController