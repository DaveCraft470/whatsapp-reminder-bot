require("dotenv").config();
const cron = require("node-cron");
const sendWhatsAppMessage = require("./sendMessage");
const supabase = require("./supabase");

function getISTComponents() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const [{ value: day }, , { value: month }] = formatter.formatToParts(now);

  return {
    day: parseInt(day),
    month: parseInt(month),
    timeStr: new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now),
  };
}

// Guard flags — prevent overlapping cron executions that cause node-cron WARN flood
let reminderRunning = false;
let routineRunning = false;

// CRON 1: One-off reminder dispatch — runs every minute
cron.schedule("* * * * *", async () => {
  if (reminderRunning) return;
  reminderRunning = true;

  try {
    const now = new Date().toISOString();

    const { data: dueReminders } = await supabase
      .from("personal_reminders")
      .select("*")
      .lte("reminder_time", now)
      .eq("status", "pending");

    if (dueReminders?.length > 0) {
      for (const reminder of dueReminders) {
        await sendWhatsAppMessage(reminder.phone, `Reminder: ${reminder.message}`);
        await supabase
          .from("personal_reminders")
          .update({ status: "completed" })
          .eq("id", reminder.id);
      }
    }
  } catch (err) {
    console.error("[scheduler] Reminder cron error:", err.message);
  } finally {
    reminderRunning = false;
  }
});

// CRON 2: Daily routine dispatch — runs every minute
cron.schedule("* * * * *", async () => {
  if (routineRunning) return;
  routineRunning = true;

  try {
    const { timeStr } = getISTComponents();

    const { data: routines } = await supabase
      .from("daily_routines")
      .select("*")
      .eq("is_active", true)
      .like("reminder_time", `${timeStr}%`);

    if (routines?.length > 0) {
      for (const routine of routines) {
        await sendWhatsAppMessage(routine.phone, `Daily Routine: ${routine.task_name}`);
      }
    }
  } catch (err) {
    console.error("[scheduler] Routine cron error:", err.message);
  } finally {
    routineRunning = false;
  }
});

// CRON 3: Special event alerts — runs at 08:30 IST (03:00 UTC)
// Runs once daily so no guard flag needed
cron.schedule("0 3 * * *", async () => {
  try {
    const { day: todayDay, month: todayMonth } = getISTComponents();

    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowDay = tomorrowDate.getDate();
    const tomorrowMonth = tomorrowDate.getMonth() + 1;

    const { data: events } = await supabase.from("special_events").select("*");

    if (!events) return;

    for (const event of events) {
      const eDate = new Date(event.event_date);
      const eDay = eDate.getDate();
      const eMonth = eDate.getMonth() + 1;

      if (eDay === todayDay && eMonth === todayMonth) {
        await sendWhatsAppMessage(
          event.phone,
          `Today is ${event.person_name}'s ${event.event_type}. Time to reach out.`
        );
      }

      if (eDay === tomorrowDay && eMonth === tomorrowMonth) {
        await sendWhatsAppMessage(
          event.phone,
          `Advance notice: Tomorrow is ${event.person_name}'s ${event.event_type}. Plan ahead.`
        );
      }
    }
  } catch (err) {
    console.error("[scheduler] Events cron error:", err.message);
  }
});