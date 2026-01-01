import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { TelegramUpdate, extractStartCode, sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();

    // Only process messages with text
    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id.toString();
    const text = update.message.text;
    const firstName = update.message.from.first_name;

    // Handle /start command with code
    if (text.startsWith("/start")) {
      const code = extractStartCode(text);

      if (!code) {
        // Just /start without code
        await sendTelegramMessage(
          chatId,
          `Hi ${firstName}! 👋\n\nTo receive check-in notifications for your child, please use the link provided by your tuition centre.`
        );
        return NextResponse.json({ ok: true });
      }

      // Process the link code
      const supabase = createServerSupabaseClient();

      // Find valid link code
      const { data: linkCode, error: codeError } = await supabase
        .from("telegram_link_codes")
        .select("*")
        .eq("code", code)
        .eq("used", false)
        .single();

      if (codeError || !linkCode) {
        await sendTelegramMessage(
          chatId,
          "Sorry, this link is invalid or has expired. Please request a new link from your tuition centre."
        );
        return NextResponse.json({ ok: true });
      }

      // Check if expired
      if (new Date(linkCode.expires_at) < new Date()) {
        await sendTelegramMessage(
          chatId,
          "Sorry, this link has expired. Please request a new link from your tuition centre."
        );
        return NextResponse.json({ ok: true });
      }

      // Link the Telegram account to the parent
      const { error: updateError } = await supabase
        .from("parents")
        .update({ telegram_chat_id: chatId })
        .eq("id", linkCode.parent_id);

      if (updateError) {
        console.error("Error linking Telegram:", updateError);
        await sendTelegramMessage(
          chatId,
          "Sorry, something went wrong. Please try again later."
        );
        return NextResponse.json({ ok: true });
      }

      // Mark code as used
      await supabase
        .from("telegram_link_codes")
        .update({ used: true })
        .eq("id", linkCode.id);

      // Get parent and student info
      const { data: parent } = await supabase
        .from("parents")
        .select("name")
        .eq("id", linkCode.parent_id)
        .single();

      // Find students linked to this parent
      const { data: students } = await supabase
        .from("students")
        .select("name")
        .or(`primary_parent_id.eq.${linkCode.parent_id},secondary_parent_id.eq.${linkCode.parent_id}`)
        .eq("is_active", true);

      const studentNames = students?.map(s => s.name).join(", ") || "your child";

      await sendTelegramMessage(
        chatId,
        `✅ Successfully linked!\n\nHi ${parent?.name || firstName}! You will now receive notifications when ${studentNames} checks in at the tuition centre.`
      );

      return NextResponse.json({ ok: true });
    }

    // Handle other messages
    await sendTelegramMessage(
      chatId,
      "I can only process check-in notifications. If you need help, please contact your tuition centre."
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
