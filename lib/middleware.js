const utilities = require("./utilities")
const { ObjectId } = require('mongodb');
const multer = require('multer');
const cookie = require("cookie");


const middleware = {}


middleware.bodyParser = (req, res, next)=>{
    let buffer = ''
    let exceededDataLimit = false
    req.on('data', (dataStream)=>{

        if(Buffer.byteLength(dataStream, 'utf8') > Math.pow(2, 24)){
            exceededDataLimit = true
        }
        buffer += dataStream
    })

    req.on('end', ()=>{
        if(!exceededDataLimit){
            req.body = buffer
            next()  
        }
        else{
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: 'Data sent is too large'}, true ) 
        } 
    })
}


middleware.isJwtValid = (req, res, next) => {
    let token;

    // Try to get token from cookies
    const cookies = req.headers.cookie;
    if (cookies) {
        const parsedCookies = cookie.parse(cookies);
        if (parsedCookies.token) {
            token = parsedCookies.token;
        }
    }

    // If no cookie token, try to get token from Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // If still no token found, respond with 401
    if (!token) {
        utilities.setResponseData(res, 401, { 'content-type': 'application/json' },{ msg: 'Unauthorized' },true);
        return;
    }

    const tokenObj = utilities.jwt('v', token);
    if (!tokenObj.isVerified) {
        utilities.setResponseData(res, 401, { 'content-type': 'application/json' }, { msg: 'Unauthorized' },true);
        return;
    }

    req.decodedToken = tokenObj.decodedToken;
    next();
};

middleware.isEmployer = (req, res, next)=>{
    const decodedToken = req.decodedToken

    if(decodedToken.role !== "employer"){
        utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: 'role not authorized'}, true ) 
        return
    }
    next()
}

middleware.isCandidate = (req, res, next)=>{
    const decodedToken = req.decodedToken

    if(decodedToken.role !== "candidate"){
        utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: 'role not authorized'}, true ) 
        return
    }
    next()
}



middleware.fileUploadMiddleware = ({
    destination,
    allowedMimes,
    fileSizeLimit = 4 * 1024 * 1024 * 1024, // default 4GB
    filePrefix = 'file',
    fieldName = 'file'
}) => {

    const storage = multer.memoryStorage(); // <-- change here

    const fileFilter = (req, file, cb) => {
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Only files of type [${allowedMimes.join(', ')}] are allowed!`), false);
        }
    };

    const upload = multer({
        storage: storage,
        limits: { fileSize: fileSizeLimit },
        fileFilter: fileFilter
    });

    return upload.single(fieldName); // The key name used in form-data request
};


middleware.docParser = middleware.fileUploadMiddleware({
    destination: '../uploads/resumes',
    allowedMimes: ['application/pdf'],
    fileSizeLimit: 20 * 1024 * 1024, // 20MB
    filePrefix: 'doc',
    fieldName: 'resume'
});


middleware.imageParser = middleware.fileUploadMiddleware({
    destination: '../uploads/profile-images', // not used, since you use memoryStorage
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    filePrefix: 'profile-image', // optional naming hint
    fieldName: 'file' // <-- form key used in frontend
});

middleware.generateFileID = (req, res, next)=>{
    req.generatedFileId = new ObjectId();
    next();
}

middleware.generateUserID = (req, res, next) => {
    req.generatedUserID = new ObjectId();
    next();
};

module.exports = middleware