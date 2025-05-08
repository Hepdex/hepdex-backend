const database = require("../../lib/database")
const utilities = require("../../lib/utilities")
const {ObjectId} = require("mongodb")

const userAuthController = {}

userAuthController.login = ("/user/login", async (req, res)=>{
    try {
        const payload = JSON.parse(req.body)

        // check if user exists
        const user = await database.findOne({email: payload.email}, database.collections.users)

        if(!user){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "invalid email or password"}, true)
            return
        }

        //check if email is verified
        if(!user.isEmailVerified){
            //generate new OTP
            const otp = "000000" //utilities.otpGenerator()
            //update user object
            await database.updateOne({_id: user._id}, database.collections.users, {otp})
            //send response
            utilities.setResponseData(res, 401, {'content-type': 'application/json'}, {msg: "Unverified email", userId: user._id}, true)
            //SEND OTP TO EMAIL
            
            return
        }
        //hash password
        payload.password = utilities.dataHasher(payload.password)
        //check if password match
        if(payload.password !== user.password){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "invalid email or password"}, true)
            return
        }

        //create token
        const token = utilities.jwt("s", {userID: user._id, role: user.role})
        delete user.password
        delete user.otp
        delete user.deleted

        // Set the token in an HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,           
            secure: process.env.NODE_ENV === "production", 
            sameSite: "Lax",       // Helps protect against CSRF
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
            path: "/"
        });
            
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


userAuthController.logout = ("/logout", async (req, res)=>{
    try {
        // Clear the token cookie by setting it with an expired date
        res.clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Strict",
          path: "/"
        });
    
        // Send a success response
        utilities.setResponseData(
          res,
          200,
          { 'content-type': 'application/json' },
          { msg: "Logout successful" },
          true
        );
    } catch (err) {
        console.error(err);
        utilities.setResponseData(
          res,
          500,
          { 'content-type': 'application/json' },
          { msg: "Server error" },
          true
        );
    }
})


userAuthController.verifyOTP = ("/verify-otp", async (req, res)=>{
    try {
        const payload = JSON.parse(req.body)
        const userID = ObjectId.createFromHexString(payload.userID)

        //get user
        const user = await database.findOne({_id: userID}, database.collections.users)
        if(!user){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "user not found"}, true)
            return
        }

        //check if OTP match
        if(payload.otp !== user.otp){
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "invalid OTP"}, true)
            return
        }
        //update user object
        await database.updateOne({_id: user._id}, database.collections.users, {isEmailVerified: true, otp: null})

        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "Email verified successfully"}, true)

        return
            
        
    } 
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

userAuthController.authStatus = ("/auth-status", async (req, res)=>{
    try {
        //send response
        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "User authentication is valid"}, true)

        return
    } catch (err) {
        console.error(err);
        utilities.setResponseData(
          res,
          500,
          { 'content-type': 'application/json' },
          { msg: "Server error" },
          true
        );
    }
})

module.exports = userAuthController