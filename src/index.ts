import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import bodyParser from 'body-parser';
import { readFileSync } from 'fs';
import https from 'https';
import { spawn, execSync } from 'child_process';
import sendEmail from './controller/sendEmail';


let port: number = parseInt(process.env.PORT || '8989');
const secret: string = process.env.WEBHOOK_SECRET || '';
const emailTo: string[] = process.env.EMAILTOSEND?.split(',') || [];

const args = process.argv.slice(2);
let devMode = false
args.forEach((arg, index) => {
  if (arg.toLowerCase() === '--port' || arg.toLowerCase() === '-p') {
    port = parseInt(args[index + 1]);
  }
  if (arg.toLowerCase() === '--dev') {
    devMode = true;
  }
});

const app = express();

// === Middleware ===
app.use(bodyParser.raw({ type: "application/json" }));

// === Routes ===
app.get("/", (req: Request, res: Response) => {
  res.send("Hello World over HTTPS!");
});

app.post("/deploy", (req: any, res: any) => {

  const receivedSignatureRaw: string | string[] | undefined = req.headers["x-hub-signature-256"];
  const receivedSignature = Array.isArray(receivedSignatureRaw) ? receivedSignatureRaw[0] : receivedSignatureRaw;
  const payload: string = req.body?.toString("utf8");

  if (!receivedSignature || !payload) {
    console.log("Warning: No signature received!");
    return res.status(401).send("Unauthorized: No signature provided");
  }

  if (!secret) {
    console.error("Error: WEBHOOK_SECRET environment variable not set!");
    return res.status(500).send("Internal Server Error: Webhook secret not configured");
  }

  try {
    const hashObject = createHmac("sha256", secret).update(payload);
    const calculatedSignature = `sha256=${hashObject.digest("hex")}`;

    const signaturesMatch = timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(receivedSignature)
    );

    if (!signaturesMatch) {
      console.log(`Signatures do not match\nExpected: ${calculatedSignature}\nActual:   ${receivedSignature}`);
      return res.status(401).send("Unauthorized: Invalid signature");
    }

    console.log("Webhook signature verified successfully!");
    res.status(200).send("Webhook received and signature verified. Deployment process initiated.");

    const deploy = spawn('bash', ['./deploy.sh']);

    deploy.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    deploy.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    deploy.on('close', async (code) => {
      console.log(`Deployment script exited with code ${code}`);

      if (code === 5) {
        console.log('✅ Deployment succeeded.');
        await sendEmail(emailTo);
      } else if (code === 9) {
        console.log('❌ Deployment failed.');
        const lastCommit = execSync('git log -1 --pretty=format:"%h - %an: %s (%cd)"', {
          encoding: 'utf-8',
        });
        sendEmail(emailTo, lastCommit);
      } else {
        console.log('⚠️ Unknown exit code with code: ' + code);
      }
    });

  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return res.status(500).send("Internal Server Error: Failed to verify signature");
  }

})


if (devMode) {
  app.listen(port, () => {
    console.log(`🚀 HTTP Server running at http://localhost:${port}`);
  });
}
else {

  // === Load SSL Certificates ===
  const httpsOptions = {
    key: readFileSync(process.env.SSL_KEY_FILE || ''),
    cert: readFileSync(process.env.SSL_CRT_FILE || ''),
  };


  // === Start HTTPS server ===
  https.createServer(httpsOptions, app).listen(port, () => {
    console.log(`🚀 HTTPS Server running at https://localhost:${port}`);
  });
}