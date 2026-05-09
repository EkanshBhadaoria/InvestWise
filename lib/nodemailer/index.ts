import nodemailer from 'nodemailer';
import {WELCOME_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE} from "@/lib/nodemailer/templates";

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
    }
})

export const sendWelcomeEmail = async ({ email, name, intro }: WelcomeEmailData) => {
    const senderAddress = process.env.NODEMAILER_EMAIL!;
    const htmlTemplate = WELCOME_EMAIL_TEMPLATE
        .replace('{{name}}', name)
        .replace('{{intro}}', intro);

    const mailOptions = {
        from: `"InvestWise" <${senderAddress}>`,
        to: email,
        subject: `Welcome to InvestWise - your stock market toolkit is ready!`,
        text: 'Thanks for joining InvestWise',
        html: htmlTemplate,
    }

    await transporter.sendMail(mailOptions);
}

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
): Promise<void> => {
    const senderAddress = process.env.NODEMAILER_EMAIL!;
    const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
        .replace('{{date}}', date)
        .replace('{{newsContent}}', newsContent);

    const mailOptions = {
        from: `"InvestWise News" <${senderAddress}>`,
        to: email,
        subject: `📈 Market News Summary Today - ${date}`,
        text: `Today's market news summary from InvestWise`,
        html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);
};
