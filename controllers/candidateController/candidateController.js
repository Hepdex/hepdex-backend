const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")

const candidateController = {}

candidateController.getCandidates = ("/get-candidates", async (req, res)=>{
    try{
        const query = req.query

        //make sure the values of the query are in lower case
        const queryKeys = Object.keys(query)
        const queryValues = Object.values(query)
        //const queryKeysLower = queryKeys.map((key)=>key.toLowerCase())
        const queryValuesLower = queryValues.map((value)=>value.toLowerCase())
        const queryLower = Object.fromEntries(queryKeys.map((key, index) => [key, queryValuesLower[index]]))
        queryLower.role = "candidate"
        queryLower.deleted = false
        queryLower.available = true
        
        //get candidates 
        const candidates = await database.findMany(queryLower, database.collections.users, ["password", "deleted", "otp"], 0).toArray()
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {candidates}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

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

module.exports = candidateController