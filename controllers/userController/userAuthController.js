const database = require("../../lib/database")
const utilities = require("../../lib/utilities")

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
            const otp = utilities.otpGenerator()
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

        // Set the token in an HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,           
            secure: process.env.NODE_ENV === "production", 
            sameSite: "Strict",       // Helps protect against CSRF
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

module.exports = userAuthController