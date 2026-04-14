import nodemailer from "npm:nodemailer@6.9.16";

type MailPayload = {
  from?: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const readGmailCredentials = () => {
  const user = Deno.env.get("GMAIL_USER");
  const pass = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!user || !pass) {
    throw new Error("Server misconfiguration: Missing email credentials.");
  }

  return { user, pass };
};

export const sendEmailMessage = async (payload: MailPayload) => {
  const { user, pass } = readGmailCredentials();
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
    tls: {
      servername: "smtp.gmail.com",
    },
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  await transporter.sendMail({
    from: payload.from || `NORSU Admission <${user}>`,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
};
