import nodemailer from "nodemailer";
import {
  WELCOME_EMAIL_TEMPLATE,
  NEWS_SUMMARY_EMAIL_TEMPLATE,
  STOCK_ALERT_UPPER_EMAIL_TEMPLATE,
  STOCK_ALERT_LOWER_EMAIL_TEMPLATE,
  VOLUME_ALERT_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";
import { formatPrice } from "@/lib/utils";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL!,
    pass: process.env.NODEMAILER_PASSWORD!,
  },
});

export const sendWelcomeEmail = async ({
  email,
  name,
  intro,
}: WelcomeEmailData) => {
  const senderAddress = process.env.NODEMAILER_EMAIL!;
  const htmlTemplate = WELCOME_EMAIL_TEMPLATE.replace("{{name}}", name).replace(
    "{{intro}}",
    intro,
  );

  const mailOptions = {
    from: `"InvestWise" <${senderAddress}>`,
    to: email,
    subject: `Welcome to InvestWise - your stock market toolkit is ready!`,
    text: "Thanks for joining InvestWise",
    html: htmlTemplate,
  };

  await transporter.sendMail(mailOptions);
};

export const sendNewsSummaryEmail = async ({
  email,
  date,
  newsContent,
}: {
  email: string;
  date: string;
  newsContent: string;
}): Promise<void> => {
  const senderAddress = process.env.NODEMAILER_EMAIL!;
  const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE.replace(
    "{{date}}",
    date,
  ).replace("{{newsContent}}", newsContent);

  const mailOptions = {
    from: `"InvestWise News" <${senderAddress}>`,
    to: email,
    subject: `📈 Market News Summary Today - ${date}`,
    text: `Today's market news summary from InvestWise`,
    html: htmlTemplate,
  };

  await transporter.sendMail(mailOptions);
};

export const sendPriceAlertEmail = async ({
  email,
  symbol,
  company,
  currentPrice,
  threshold,
  alertType,
}: {
  email: string;
  symbol: string;
  company: string;
  currentPrice: number;
  threshold: number;
  alertType: "upper" | "lower";
}): Promise<void> => {
  const senderAddress = process.env.NODEMAILER_EMAIL!;
  const template =
    alertType === "upper"
      ? STOCK_ALERT_UPPER_EMAIL_TEMPLATE
      : STOCK_ALERT_LOWER_EMAIL_TEMPLATE;

  const htmlTemplate = template
    .replace(/{{symbol}}/g, symbol)
    .replace(/{{company}}/g, company)
    .replace(/{{timestamp}}/g, new Date().toLocaleString("en-US"))
    .replace(/{{currentPrice}}/g, formatPrice(currentPrice))
    .replace(/{{targetPrice}}/g, formatPrice(threshold));

  const mailOptions = {
    from: `"InvestWise Alerts" <${senderAddress}>`,
    to: email,
    subject: `Price Alert: ${symbol} ${alertType === "upper" ? "above" : "below"} ${formatPrice(threshold)}`,
    text: `Price alert for ${symbol}: ${formatPrice(currentPrice)}`,
    html: htmlTemplate,
  };

  await transporter.sendMail(mailOptions);
};

export const sendVolumeAlertEmail = async ({
  email,
  symbol,
  company,
  currentVolume,
  averageVolume,
  currentPrice,
  changePercent,
}: {
  email: string;
  symbol: string;
  company: string;
  currentVolume: number;
  averageVolume?: number;
  currentPrice: number;
  changePercent?: number;
}): Promise<void> => {
  const senderAddress = process.env.NODEMAILER_EMAIL!;
  const volumeSpike =
    averageVolume && averageVolume > 0
      ? `${(currentVolume / averageVolume).toFixed(1)}x`
      : "High";

  const alertMessage =
    averageVolume && averageVolume > 0
      ? `Volume is ${volumeSpike} above average`
      : "Volume exceeded your threshold";

  const priceColor = changePercent && changePercent < 0 ? "#ef4444" : "#10b981";
  const changeDirection = changePercent && changePercent < 0 ? "" : "+";

  const htmlTemplate = VOLUME_ALERT_EMAIL_TEMPLATE.replace(
    /{{symbol}}/g,
    symbol,
  )
    .replace(/{{company}}/g, company)
    .replace(/{{timestamp}}/g, new Date().toLocaleString("en-US"))
    .replace(/{{currentVolume}}/g, (currentVolume / 1_000_000).toFixed(2))
    .replace(
      /{{averageVolume}}/g,
      averageVolume ? (averageVolume / 1_000_000).toFixed(2) : "N/A",
    )
    .replace(/{{volumeSpike}}/g, volumeSpike)
    .replace(/{{alertMessage}}/g, alertMessage)
    .replace(/{{currentPrice}}/g, formatPrice(currentPrice))
    .replace(
      /{{changePercent}}/g,
      changePercent ? Math.abs(changePercent).toFixed(2) : "0.00",
    )
    .replace(/{{changeDirection}}/g, changeDirection)
    .replace(/{{priceColor}}/g, priceColor);

  const mailOptions = {
    from: `"InvestWise Alerts" <${senderAddress}>`,
    to: email,
    subject: `Volume Alert: ${symbol} spike detected`,
    text: `Volume alert for ${symbol}: ${currentVolume.toLocaleString()} shares`,
    html: htmlTemplate,
  };

  await transporter.sendMail(mailOptions);
};
