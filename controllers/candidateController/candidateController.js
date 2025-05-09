const database = require("../../lib/database")
const utilities = require("../../lib/utilities")

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
        
        //get candidates 
        const candidates = await database.findMany(queryLower, database.collections.users, ["password", "deleted", "otp", "resumePath"], 0).toArray()
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {candidates}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})


candidateController.updateProfile = ("/update-profile", async (req, res)=>{
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
        
        
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {candidates}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

module.exports = candidateController