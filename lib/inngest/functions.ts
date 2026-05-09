import { inngest } from "@/lib/inngest/client";
import {
  NEWS_SUMMARY_EMAIL_PROMPT,
  PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "@/lib/inngest/prompts";
import {
  sendNewsSummaryEmail,
  sendPriceAlertEmail,
  sendVolumeAlertEmail,
  sendWelcomeEmail,
} from "@/lib/nodemailer";
import { getAllUsersForNewsEmail } from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import {
  getDailyCandle,
  getNews,
  getQuote,
} from "@/lib/actions/finnhub.actions";
import { getDateRange, getFormattedTodayDate } from "@/lib/utils";
import { connectToDatabase } from "@/database/mongoose";
import { Alert as AlertModel } from "@/database/models/alert.model";

export const sendSignUpEmail = inngest.createFunction(
  { id: "sign-up-email" },
  { event: "app/user.created" },
  async ({ event, step }) => {
    const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `;

    const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace(
      "{{userProfile}}",
      userProfile,
    );

    const response = await step.ai.infer("generate-welcome-intro", {
      model: step.ai.models.gemini({ model: "gemini-2.5-flash-lite" }),
      body: {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
    });

    await step.run("send-welcome-email", async () => {
      const part = response.candidates?.[0]?.content?.parts?.[0];
      const introText =
        (part && "text" in part ? part.text : null) ||
        "Thanks for joining InvestWise. You now have the tools to track markets and make smarter moves.";

      const {
        data: { email, name },
      } = event;

      return await sendWelcomeEmail({ email, name, intro: introText });
    });

    return {
      success: true,
      message: "Welcome email sent successfully",
    };
  },
);

export const sendDailyNewsSummary = inngest.createFunction(
  { id: "daily-news-summary" },
  [{ event: "app/send.daily.news" }, { cron: "0 12 * * *" }],
  async ({ step }) => {
    // Step #1: Get all users for news delivery
    const users = await step.run("get-all-users", getAllUsersForNewsEmail);

    if (!users || users.length === 0)
      return { success: false, message: "No users found for news email" };

    // Step #2: For each user, get watchlist symbols -> fetch news (fallback to general)
    const results = await step.run("fetch-user-news", async () => {
      const perUser: Array<{
        user: UserForNewsEmail;
        articles: MarketNewsArticle[];
      }> = [];
      for (const user of users as UserForNewsEmail[]) {
        try {
          const symbols = await getWatchlistSymbolsByEmail(user.email);
          let articles = await getNews(symbols);
          // Enforce max 6 articles per user
          articles = (articles || []).slice(0, 6);
          // If still empty, fallback to general
          if (!articles || articles.length === 0) {
            articles = await getNews();
            articles = (articles || []).slice(0, 6);
          }
          perUser.push({ user, articles });
        } catch (e) {
          console.error("daily-news: error preparing user news", user.email, e);
          perUser.push({ user, articles: [] });
        }
      }
      return perUser;
    });

    // Step #3: (placeholder) Summarize news via AI
    const userNewsSummaries: {
      user: UserForNewsEmail;
      newsContent: string | null;
    }[] = [];

    for (const { user, articles } of results) {
      try {
        const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace(
          "{{newsData}}",
          JSON.stringify(articles, null, 2),
        );

        const response = await step.ai.infer(`summarize-news-${user.email}`, {
          model: step.ai.models.gemini({ model: "gemini-2.5-flash-lite" }),
          body: {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        const newsContent =
          (part && "text" in part ? part.text : null) || "No market news.";

        userNewsSummaries.push({ user, newsContent });
      } catch (e) {
        console.error("Failed to summarize news for : ", user.email);
        userNewsSummaries.push({ user, newsContent: null });
      }
    }

    // Step #4: (placeholder) Send the emails
    await step.run("send-news-emails", async () => {
      await Promise.all(
        userNewsSummaries.map(async ({ user, newsContent }) => {
          if (!newsContent) return false;

          return await sendNewsSummaryEmail({
            email: user.email,
            date: getFormattedTodayDate(),
            newsContent,
          });
        }),
      );
    });

    return {
      success: true,
      message: "Daily news summary emails sent successfully",
    };
  },
);

export const sendAlertNotifications = inngest.createFunction(
  { id: "alert-notifications" },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const cooldownMs = 30 * 60 * 1000;
    const now = new Date();

    const alerts = await step.run("get-alerts", async () => {
      await connectToDatabase();
      return AlertModel.find({}).lean();
    });

    if (!alerts || alerts.length === 0)
      return { success: false, message: "No alerts found" };

    await step.run("process-alerts", async () => {
      for (const alert of alerts) {
        const lastTriggered = alert.lastTriggeredAt
          ? new Date(alert.lastTriggeredAt)
          : null;
        if (
          lastTriggered &&
          now.getTime() - lastTriggered.getTime() < cooldownMs
        ) {
          continue;
        }

        const symbol = String(alert.symbol || "").toUpperCase();
        const email = String(alert.userEmail || "");
        if (!symbol || !email) continue;

        if (alert.alertType === "volume") {
          const range = getDateRange(14);
          const candle = await getDailyCandle(symbol, range.from, range.to);
          const volumes = candle?.v || [];
          if (volumes.length === 0) continue;

          const currentVolume = volumes[volumes.length - 1];
          const historical = volumes.slice(0, -1);
          const avgVolume =
            historical.length > 0
              ? historical.reduce((sum, v) => sum + v, 0) / historical.length
              : undefined;

          if (currentVolume >= alert.threshold) {
            const quote = await getQuote(symbol);
            await sendVolumeAlertEmail({
              email,
              symbol,
              company: alert.company,
              currentVolume,
              averageVolume: avgVolume,
              currentPrice: quote?.c || 0,
              changePercent: quote?.dp,
            });

            await AlertModel.updateOne(
              { _id: alert._id },
              { $set: { lastTriggeredAt: new Date() } },
            );
          }
        } else {
          const quote = await getQuote(symbol);
          const currentPrice = quote?.c;
          if (!currentPrice) continue;

          const triggerUpper =
            alert.alertType === "upper" && currentPrice >= alert.threshold;
          const triggerLower =
            alert.alertType === "lower" && currentPrice <= alert.threshold;

          if (triggerUpper || triggerLower) {
            await sendPriceAlertEmail({
              email,
              symbol,
              company: alert.company,
              currentPrice,
              threshold: alert.threshold,
              alertType: alert.alertType,
            });

            await AlertModel.updateOne(
              { _id: alert._id },
              { $set: { lastTriggeredAt: new Date() } },
            );
          }
        }
      }
    });

    return { success: true, message: "Alerts processed" };
  },
);
