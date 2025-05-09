const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")

const userController = {}

userController.getUser = ("/get-user", async (req, res)=>{
    try {
        const userID = ObjectId.createFromHexString(req.decodedToken.userID)

        // check if user exists
        const user = await database.findOne({_id: userID}, database.collections.users)

        if(!user){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "invalid email or password"}, true)
            return
        }

        delete user.password
        delete user.otp
        delete user.deleted
            
        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {user}, true)
        return
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

module.exports = userController