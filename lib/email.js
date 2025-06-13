// mailer.js
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SendgridApiKey); // Use dotenv or similar for security

const otpEmailContent = otp => `
  <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>OTP Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #ffffff;">
  <table align="center" width="100%" style="max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
    <tr>
      <td style="background-color: #915dc2; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
        <img src="https://api.hepdex.com/images/logo.jpg" alt="Company Logo" style="max-height: 50px;" />
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <h2 style="color: #915dc2; text-align: center;">One-Time Password (OTP)</h2>
        <p style="font-size: 16px; color: #333333;">
          Hello, <br /><br />
          Use the following One-Time Password (OTP) to complete your action. This OTP is valid for the next 10 minutes.
        </p>
        <div style="margin: 30px auto; text-align: center;">
          <span style="display: inline-block; padding: 15px 30px; font-size: 24px; font-weight: bold; color: #ffffff; background-color: #915dc2; border-radius: 8px; letter-spacing: 2px;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 14px; color: #666666; text-align: center;">
          If you did not request this, please ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #888888; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
        © 2025 HepDex. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>

`;



const contactEmailContent = ({ name, email, inquiryType, message }) => `
  <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contact Inquiry</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #ffffff;">
  <table align="center" width="100%" style="max-width: 600px; width: 100%; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
    <tr>
      <td style="background-color: #915dc2; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
        <img src="https://api.hepdex.com/images/logo.jpg" alt="Company Logo" style="max-height: 50px;" />
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <h2 style="color: #915dc2; text-align: center; font-size: 20px;">New Contact Form Submission</h2>
        <p style="font-size: 16px; color: #333333;"><strong>Name:</strong> ${name}</p>
        <p style="font-size: 16px; color: #333333;"><strong>Email:</strong> ${email}</p>
        <p style="font-size: 16px; color: #333333;"><strong>Inquiry Type:</strong> ${inquiryType}</p>
        <p style="font-size: 16px; color: #333333;"><strong>Message:</strong></p>
        <p style="font-size: 16px; color: #555555; white-space: pre-wrap;">${message}</p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #888888; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
        © 2025 HepDex. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
`;





const sendEmail = async ({ to='tech@hepdex.com', subject, text, html, replyTo }) => {

  const msg = {
    to,
    from: {
      name: 'Hepdex',
      email: 'tech@hepdex.com', // Must match a domain verified in SendGrid
    },
    replyTo, 
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Error sending email:', error.response?.body || error.message);
  }
};

module.exports = {
  sendEmail,
  otpEmailContent,
  contactEmailContent
};
