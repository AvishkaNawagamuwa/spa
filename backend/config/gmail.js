const { google } = require('googleapis');
require('dotenv').config();


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

module.exports = oauth2Client;

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
// Function to send email
async function sendEmail(to, subject, body) {
  const rawMessage = [
    `From: "LSA Spa Management" <${process.env.GMAIL_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    body,
  ].join('\n');
    const encodedMessage = Buffer.from(rawMessage).toString('base64');
    const formattedMessage = encodedMessage.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    try {
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: formattedMessage,
        },
      });
      console.log('Email sent successfully:', response.data);
    } catch (error) {
      console.error('Error sending email:', error);
    }

  

}


module.exports = { sendEmail };

  //API endpoint
 app.post('/send-email', express.json(), async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    const result = await sendEmail(to, subject, message);
    res.json({ success: true, messageId: result.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});