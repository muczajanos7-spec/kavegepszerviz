import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text?: string }) {
  // If SMTP is not configured, just log it in development
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log("\n--- EMAIL MOCK ---");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text || "HTML content"}`);
    console.log("------------------\n");
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Kávégép Szerviz" <noreply@kavegep-szerviz.hu>',
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
}
