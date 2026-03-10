const supabase = require("./supabase");
const sendWhatsAppMessage = require("./sendMessage");

const LIMITS = {
  gemini: 40,        // Daily combined cap: Tier 1 + Tier 2 (free)
  groq: 3000,        // Daily safety cap (Groq free tier)
  openrouter: 50,    // Daily safety cap (paid fallback)
  serper: 2500,      // Lifetime cap
  tavily: 1000,      // Monthly cap
};

function getTodayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

async function ensureRowExists() {
  const today = getTodayIST();
  const { data } = await supabase
    .from("api_usage")
    .select("usage_date")
    .eq("usage_date", today)
    .maybeSingle();

  if (!data) {
    await supabase.from("api_usage").insert([{
      usage_date: today,
      gemini_count: 0,
      groq_count: 0,
      openrouter_count: 0,
      tavily_count: 0,
      serper_count: 0,
      error_count: 0,
    }]);
  }
}

async function getUsage() {
  await ensureRowExists();
  const today = getTodayIST();
  const currentMonth = today.slice(0, 7);

  const { data: allData } = await supabase.from("api_usage").select("*");

  const daily = allData?.find((d) => d.usage_date === today) || {
    gemini_count: 0,
    groq_count: 0,
    openrouter_count: 0,
    error_count: 0,
  };

  let totalSerper = 0;
  let totalTavily = 0;

  allData?.forEach((row) => {
    totalSerper += row.serper_count || 0;
    if (row.usage_date.startsWith(currentMonth)) totalTavily += row.tavily_count || 0;
  });

  const sortedData = [...(allData || [])].sort(
    (a, b) => new Date(a.usage_date) - new Date(b.usage_date)
  );
  const last7Days = sortedData.slice(-7);

  return {
    gemini: daily.gemini_count || 0,
    groq: daily.groq_count || 0,
    openrouter: daily.openrouter_count || 0,
    serper: totalSerper,
    tavily: totalTavily,
    errorsToday: daily.error_count || 0,
    historyLabels: last7Days.map((d) => d.usage_date),
    historyData: last7Days.map((d) =>
      (d.gemini_count || 0) + (d.groq_count || 0) + (d.openrouter_count || 0)
    ),
    errorData: last7Days.map((d) => d.error_count || 0),
    historyRaw: last7Days,
    daysTracked: allData?.length || 1,
  };
}

async function track(service) {
  await ensureRowExists();
  const today = getTodayIST();

  const { data } = await supabase
    .from("api_usage")
    .select(`${service}_count`)
    .eq("usage_date", today)
    .single();

  const currentCount = data ? (data[`${service}_count`] || 0) : 0;

  await supabase
    .from("api_usage")
    .update({ [`${service}_count`]: currentCount + 1 })
    .eq("usage_date", today);

  if (service === "serper" || service === "tavily") {
    const stats = await getUsage();
    const remaining = service === "serper"
      ? LIMITS.serper - stats.serper
      : LIMITS.tavily - stats.tavily;

    if ([50, 10, 0].includes(remaining)) {
      await sendWhatsAppMessage(
        process.env.MY_PHONE_NUMBER,
        `Low Credits Warning: ${service} has ${remaining} requests remaining.`
      );
    }
  }
}

module.exports = { getUsage, track, LIMITS };