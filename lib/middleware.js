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

middleware.isJwtValid = (req, res, next)=>{
    const cookies = req.headers.cookie;
    if(!cookies){
        utilities.setResponseData(res, 401, {'content-type': 'application/json'}, {msg: 'Unauthorized'}, true ) 
        return 
    }
    const parsedCookies = cookie.parse(cookies);
    if(!parsedCookies.token){
        utilities.setResponseData(res, 401, {'content-type': 'application/json'}, {msg: 'Unauthorized'}, true ) 
        return 
    }
    const tokenObj = utilities.jwt('v', parsedCookies.token)
    if(!tokenObj.isVerified){
        utilities.setResponseData(res, 401, {'content-type': 'application/json'}, {msg: 'Unauthorized'}, true )
        return
    }

    req.decodedToken = tokenObj.decodedToken
    next()
}

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

middleware.isFormDataValid = async (req, res, next)=>{
    const payload = req.body
    //Validate payload
    const paylodStatus = await utilities.userSignupValidator(payload, ["firstName", "lastName", "email", "jobType", "country", "password"], "candidate")
    if(!paylodStatus.isValid){
        utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: paylodStatus.msg}, true)
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
    destination: '../uploads/profile-images',
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    filePrefix: 'profile',
    fieldName: 'file'
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




// Configure storage engine
// middleware.fileUploadMiddleware = ({
//     destination,
//     allowedMimes,
//     fileSizeLimit = 4 * 1024 * 1024 * 1024, // default 4GB
//     filePrefix = 'file',
//     fieldName = 'file'
// }) => {

//     const storage = multer.diskStorage({
//         destination: function (req, file, cb) {
//             const uploadPath = path.join(__dirname, destination);

//             if (!fs.existsSync(uploadPath)) {
//                 fs.mkdirSync(uploadPath, { recursive: true });
//             }

//             cb(null, uploadPath);
//         },
//         filename: function (req, file, cb) {
//             const ext = path.extname(file.originalname);
//             const fileName = `${filePrefix}-${req.generatedUserID.toString()}-${req.generatedFileId.toString()}${ext}`;
//             cb(null, fileName);
//         }
//     });

//     const fileFilter = (req, file, cb) => {
//         if (allowedMimes.includes(file.mimetype)) {
//             cb(null, true);
//         } else {
//             cb(new Error(`Only files of type [${allowedMimes.join(', ')}] are allowed!`), false);
//         }
//     };

//     const upload = multer({
//         storage: storage,
//         limits: { fileSize: fileSizeLimit },
//         fileFilter: fileFilter
//     });

//     return upload.single(fieldName); // The key name used in form-data request
// };