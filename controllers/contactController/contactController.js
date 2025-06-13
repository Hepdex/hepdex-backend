const database = require('../../lib/database');
const {sendEmail, contactEmailContent} = require("../../lib/email")
const utilities = require('../../lib/utilities');
const contactController = {}

contactController.postContactMessage = ("/post-contact-message", async (req, res)=>{
    try{
        const payload = JSON.parse(req.body);
        const { name, email, inquiryType, message } = payload;

        if (!name || !email || !inquiryType || !message) {
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "All fields are required"}, true);
            return;
        }

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            utilities.setResponseData(res, 400, {'content-type': 'application/json'}, {msg: "Invalid email format"}, true);
            return;
        }

        // Here you would typically save the contact message to a database
        await database.insertOne({
            name: name.trim(),
            email: email.trim(),
            inquiryType: inquiryType.trim().toLowerCase(),
            message: message.trim(),
            createdAt: new Date()
        }, database.collections.contactMessages);
        
        //just return a success message

        utilities.setResponseData(res, 200, {'content-type': 'application/json'}, {msg: "Contact message received successfully"}, true);

        //send email notification to admin
        const emailContent = contactEmailContent({name, email, inquiryType, message});
        const emailData = {
            subject: `Contact Form Submission`,
            text: `Name: ${name}, Email: ${email}, Inquiry type: ${inquiryType}, Message: ${message}`,
            html: emailContent,
            replyTo: email.trim()
        }
        await sendEmail(emailData)

    }
    catch (err) {
        console.log(err)    
        utilities.setResponseData(res, 500, {'content-type': 'application/json'}, {msg: "server error"}, true)
        return
    }
})

module.exports = contactController