import { ExpiryReminderSection } from '@/components/settings/ExpiryReminderSection';
import { LocationSection } from '@/components/settings/LocationSection';
import { SettingsPage } from '@/components/settings/SettingsPage';

export default function RemindersSettingsScreen() {
  return (
    <SettingsPage>
      <ExpiryReminderSection />
      <LocationSection />
    </SettingsPage>
  );
}
