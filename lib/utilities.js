const crypto = require('crypto')
const jwt = require('jsonwebtoken') 
const database = require("./database")
const {ObjectId} = require("mongodb")

const utilities = {}

utilities.isJSON = (data)=>{
    
    try{
        JSON.parse(data)
        return true
    }
    catch{
        return false
    }
}

utilities.setResponseData = (res, status, headers, data, isJSON)=>{
    res.status(status)
    const headerKeys = Object.keys(headers)
    for(let key of headerKeys){
        res.set(key, headers[key])
    }

    if(isJSON){
        res.json({statusCode: status, data})
    }
    else{res.send(data)}

    return res.end()
}


utilities.userSignupValidator = async(data, expectedData)=>{
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  const passwordRegex = /^[^\s]{8,15}$/
  const companySizeRegex = /^\d+-\d+$/;


  const dataKeys = Object.keys(data);

  const createErrorResponse = (field, message) => ({
    isValid: false,
    errorField: field,
    msg: message
  });
    
  if(dataKeys.length !== expectedData.length){
    return {
      isValid: false,
      msg: `incomplete data or unrequired data detected`
    }
  }

  for (let key of dataKeys) {
    const value = data[key].trim();
  
    if (key === "firstName" && (typeof value !== "string" || value.length < 1)) {
      return createErrorResponse(key, `${key} should be a string and it should not be empty`);
    }
  
    if (key === "lastName" && (typeof value !== "string" || value.length < 1)) {
      return createErrorResponse(key, `${key} should be a string and it should not be empty`);
    }
  
    if (key === "email" && (typeof value !== "string" || !emailRegex.test(value))) {
      return createErrorResponse(key, `${key} should be in valid email format`);
    }

    if (key === "companySize" && (typeof value !== "string" || !companySizeRegex.test(value))) {
        return createErrorResponse(key, `${key} should be in valid format`);
    }

    if (key === "country" && (typeof value !== "string" || value.length < 1)) {
        return createErrorResponse(key, `${key} should be a string and it should not be empty`);
    }
  
    
    if (key === "password" && (typeof value !== "string" || !passwordRegex.test(value))) {
      return createErrorResponse(key, `wrong password format, make sure your password is 8 to 15 characters long and contains no spaces`);
    }
  }

  return{
    isValid: true,
    errorField: null,
  }  

}


utilities.dataHasher = (data)=>{
    if(typeof data == "string" && data.length > 0){

        return crypto.createHmac("sha256", process.env.HASH_STRING).update(data).digest('hex')
    }
    return false
}

utilities.jwt = (operation, data)=>{
    if(operation == 's'){
        return jwt.sign(data, process.env.JWT_KEY, {expiresIn: '720h'} )
    }
    if(operation == 'v'){
        return jwt.verify(data, process.env.JWT_KEY, (err, payload)=>{
            if(err){
                return {isVerified: false}
            }
        
            return {isVerified: true, decodedToken: payload}
        })
    }  
}

utilities.otpGenerator = ()=>{
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';

  let otpArray = [];

  // Generate 3 random letters
  for (let i = 0; i < 3; i++) {
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    otpArray.push(randomLetter);
  }

  // Generate 3 random numbers
  for (let i = 0; i < 3; i++) {
    const randomNumber = numbers[Math.floor(Math.random() * numbers.length)];
    otpArray.push(randomNumber);
  }

  // Shuffle the array to randomly disperse letters and numbers
  for (let i = otpArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otpArray[i], otpArray[j]] = [otpArray[j], otpArray[i]];
  }

  return otpArray.join('');
}


module.exports = utilities