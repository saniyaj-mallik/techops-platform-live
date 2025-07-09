'use server'

import nodeMailer from 'nodemailer';

export const sendEmail = async (options) => {
    const transporter = nodeMailer.createTransport({
      host: process.env.SMPT_HOST,
      port: process.env.SMPT_PORT,
      service: process.env.SMPT_SERVICE,
      auth: {
        user: process.env.SMPT_MAIL,
        pass: process.env.SMPT_PASSWORD,
      },
    });
  
    const mailOptions = {
      from: process.env.SMPT_MAIL,
      to: options.email,
      subject: options.subject,
    };

    if (options.html) {
      mailOptions.html = options.html;
      // Fallback plain text (strip HTML tags)
      mailOptions.text = options.text || options.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    } else if (options.text || options.message) {
      mailOptions.text = options.text || options.message;
    }
  
    await transporter.sendMail(mailOptions);
  };