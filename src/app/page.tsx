import { Dashboard } from "@/components/Dashboard";
import { getTodaysMeetings } from "@/lib/meetings";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { meetings, source, notice } = await getTodaysMeetings();
  const speechConfigured = Boolean(process.env.AZURE_SPEECH_KEY);
  return (
    <Dashboard
      meetings={meetings}
      source={source}
      notice={notice}
      speechConfigured={speechConfigured}
    />
  );
}
