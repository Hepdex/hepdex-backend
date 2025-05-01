const { S3Client, PutObjectCommand }  = require('@aws-sdk/client-s3');
require('dotenv').config(); // In case you want to load AWS credentials from .env

// Configure AWS SDK
const s3 = new S3Client({ 
    region: process.env.S3_Region, // e.g. "us-east-1"
    credentials: {
        accessKeyId: process.env.AWS_AccessKey,
        secretAccessKey: process.env.AWS_SecretAccessKey
    }
});

/**
 * Uploads a file buffer to AWS S3
 * @param {Object} params - { buffer, fileName, mimeType }
 * @returns {Promise<Object>} - Upload result
*/
const uploadFileToS3 = async ({ buffer, fileName, mimeType }) => {
    const uploadParams = {
        Bucket: process.env.S3_BucketName, // Your bucket name from .env
        Key: fileName, // Full path in bucket, e.g., resumes/file-name.pdf
        Body: buffer,
        ContentType: mimeType,
        //ACL: 'public-read' // or 'private' if you want to restrict
    };

    const command = new PutObjectCommand(uploadParams);
    const response = await s3.send(command);

    // Manually build the public URL
    const fileUrl = `https://${process.env.S3_BucketName}.s3.${process.env.S3_Region}.amazonaws.com/${fileName}`;

    return { Location: fileUrl, ETag: response.ETag };
};

module.exports = { uploadFileToS3 };