import nodemailer from "nodemailer";


function getFormattedDateTime():string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  const now = new Date();
  return now.toLocaleString('en-US', options);
}

const sendEmail = async (email:string[], lastCommit:string = "", success:boolean = true) => {
  if (!process.env.EMAIL || !process.env.PASSWORD) {
    console.error(
      "Error: EMAIL and PASSWORD environment variables must be defined!"
    );
    return;
  }

  // 3. Detailed Transport Configuration
  let transporter = nodemailer.createTransport({
    host: "mail.uniconvergetech.in",
    port: 465, // Use 587 for STARTTLS
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  let mailOptionsForUserSuccess = {
    from: process.env.EMAIL,
    to: email,
    subject: "LCA-web App Deployed Successfully",
    text: "This is a test email.  Build Uploaded.",
    html: `<html>
<head>
  <meta charset="UTF-8">
  <title>Deployment Successful</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" bgcolor="#4CAF50" style="padding: 40px 0;">
        <h1 style="color: white; margin: 0;">LCA-web App Deployed Successfully</h1>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 40px;">
        <p style="font-size: 18px; color: #333;">LCA-web app frontend has been successfully deployed to AWS.</p>
        <p style="font-size: 16px; color: #555;">You can now access your application at:</p>
        <p><a href="https://autodrip.automatworld.com/" style="color: #4CAF50; font-size: 16px;">https://autodrip.automatworld.com/</a></p>
        <p style="margin-top: 30px; color: #888;">Deployed on: ${getFormattedDateTime()} <strong></strong></p>
      </td>
    </tr>
    <tr>
      <td bgcolor="#eeeeee" align="center" style="padding: 20px;">
        <p style="color: #666;">This is an automated message from your deployment system.</p>
      </td>
    </tr>
  </table>
</body>
</html>
`,
  };

  let mailOptionsForUserFailure = {
    from: process.env.EMAIL,
    to: email,
    subject: "LCA-web App Deployment Failed",
    text: "This is a test email.  Build Uploaded.",
    html: `<html>
<head>
  <meta charset="UTF-8">
  <title>Deployment Failed</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #fff0f0; margin: 0; padding: 0;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" bgcolor="#f44336" style="padding: 40px 0;">
        <h1 style="color: white; margin: 0;"> LCA-web App Deployment Failed</h1>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 40px;">
        <p style="font-size: 18px; color: #333;">Unfortunately, your frontend deployment to AWS has failed.</p>
        <p style="font-size: 16px; color: #555;">Please review the error logs and retry the deployment.</p>
        <p style="margin-top: 30px; color: #888;">Failed on: <strong>${getFormattedDateTime()}</strong></p>
        <p style="color: #888;">Last git commit: <strong>${lastCommit}</strong></p>
      </td>
    </tr>
    <tr>
      <td bgcolor="#ffe5e5" align="center" style="padding: 20px;">
        <p style="color: #999;">This is an automated message from your deployment system.</p>
      </td>
    </tr>
  </table>
</body>
</html>

`,
  };



  try {
    if (success) {
      const info = await transporter.sendMail(mailOptionsForUserSuccess);
      console.log("Email sent successfully!  Message ID:", info.messageId);

      if (info.rejected && info.rejected.length > 0) {
        console.error("Email was rejected by the server:", info.rejected);
      }
    }
    else {
      const info = await transporter.sendMail(mailOptionsForUserFailure);
      console.log("Email sent successfully! for the build failure Message ID:", info.messageId);

      if (info.rejected && info.rejected.length > 0) {
        console.error("Email was rejected by the server for build failure:", info.rejected);
      }
    }
  } catch (error) {
    console.error("Error sending email:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error("Server response:", (error as any).response);
    }
  } finally {
    console.log("sendEmail function completed.");
  }

};

export default sendEmail;
