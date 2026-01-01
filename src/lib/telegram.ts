// Telegram Bot API integration

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: "HTML" | "Markdown";
}

export interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
  error_code?: number;
}

// Send a message to a Telegram chat
export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      // Handle rate limiting - retry once after 1 second
      if (data.error_code === 429) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const retryResponse = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
          }),
        });
        const retryData: TelegramResponse = await retryResponse.json();
        if (!retryData.ok) {
          return { success: false, error: retryData.description || "Rate limit exceeded" };
        }
        return { success: true };
      }
      return { success: false, error: data.description || "Telegram API error" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// Format check-in notification message
export function formatCheckInNotification(
  studentName: string,
  centreName: string = "ABC Centre",
  time: string
): string {
  return `${studentName} checked in at ${centreName} at ${time}`;
}

// Process Telegram webhook update (for /start command)
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
}

// Extract link code from /start command
export function extractStartCode(text: string): string | null {
  const match = text.match(/^\/start\s+(\w+)$/);
  return match ? match[1] : null;
}

// Set webhook URL for the bot
export async function setWebhook(webhookUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/setWebhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message"],
      }),
    });

    const data: TelegramResponse = await response.json();
    return data.ok;
  } catch {
    return false;
  }
}

// Get bot info (useful for generating bot link)
export async function getBotInfo(): Promise<{ username: string } | null> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/getMe`);
    const data = await response.json();
    if (data.ok && data.result) {
      return { username: data.result.username };
    }
    return null;
  } catch {
    return null;
  }
}
