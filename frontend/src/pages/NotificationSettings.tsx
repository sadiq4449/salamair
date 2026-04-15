import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Mail, Volume2, Loader2 } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useToastStore } from '../store/toastStore';
import type { NotificationType } from '../types';

const ALL_TYPES: { key: NotificationType; label: string; description: string }[] = [
  { key: 'REQUEST_CREATED', label: 'New Requests', description: 'When a new fare request is submitted' },
  { key: 'REQUEST_APPROVED', label: 'Request Approved', description: 'When your request is approved' },
  { key: 'REQUEST_REJECTED', label: 'Request Rejected', description: 'When your request is rejected' },
  { key: 'COUNTER_OFFERED', label: 'Counter Offers', description: 'When a counter offer is made' },
  { key: 'SENT_TO_RM', label: 'Sent to RM', description: 'When a request is forwarded to Revenue Management' },
  { key: 'EMAIL_RECEIVED', label: 'Email Received', description: 'When RM replies via email' },
  { key: 'NEW_MESSAGE', label: 'New Messages', description: 'When a new chat message is received' },
  { key: 'SLA_WARNING', label: 'SLA Warnings', description: 'When SLA deadline is approaching' },
  { key: 'SLA_BREACHED', label: 'SLA Breached', description: 'When SLA deadline has passed' },
  { key: 'REQUEST_ASSIGNED', label: 'Request Assigned', description: 'When a request is assigned to you' },
];

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { preferences, fetchPreferences, updatePreferences } = useNotificationStore();
  const { addToast } = useToastStore();
  const [saving, setSaving] = useState(false);
  const [localPrefs, setLocalPrefs] = useState({
    in_app_enabled: true,
    email_enabled: true,
    sound_enabled: true,
    types_disabled: [] as string[],
  });

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        in_app_enabled: preferences.in_app_enabled,
        email_enabled: preferences.email_enabled,
        sound_enabled: preferences.sound_enabled,
        types_disabled: preferences.types_disabled,
      });
    }
  }, [preferences]);

  const handleToggle = (field: 'in_app_enabled' | 'email_enabled' | 'sound_enabled') => {
    setLocalPrefs((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleTypeToggle = (type: string) => {
    setLocalPrefs((prev) => {
      const disabled = prev.types_disabled.includes(type)
        ? prev.types_disabled.filter((t) => t !== type)
        : [...prev.types_disabled, type];
      return { ...prev, types_disabled: disabled };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences(localPrefs);
      addToast('success', 'Notification preferences saved');
    } catch {
      addToast('error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/notifications')}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Notifications
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Notification Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Configure how and when you receive notifications
      </p>

      {/* Global Toggles */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Delivery Channels</h2>
        <div className="space-y-4">
          <ToggleRow
            icon={<Bell className="h-5 w-5" />}
            label="In-App Notifications"
            description="Show notifications inside the app"
            checked={localPrefs.in_app_enabled}
            onChange={() => handleToggle('in_app_enabled')}
          />
          <ToggleRow
            icon={<Mail className="h-5 w-5" />}
            label="Email Alerts"
            description="Send email for critical events (approval, rejection)"
            checked={localPrefs.email_enabled}
            onChange={() => handleToggle('email_enabled')}
          />
          <ToggleRow
            icon={<Volume2 className="h-5 w-5" />}
            label="Notification Sound"
            description="Play a sound when new notifications arrive"
            checked={localPrefs.sound_enabled}
            onChange={() => handleToggle('sound_enabled')}
          />
        </div>
      </div>

      {/* Per-type Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Notification Types</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Toggle individual notification types on or off
        </p>
        <div className="space-y-3">
          {ALL_TYPES.map((t) => (
            <div key={t.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.label}</p>
                <p className="text-xs text-gray-400">{t.description}</p>
              </div>
              <Toggle
                checked={!localPrefs.types_disabled.includes(t.key)}
                onChange={() => handleTypeToggle(t.key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg font-medium text-sm hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Preferences
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
        checked ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        } mt-0.5`}
      />
    </button>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-gray-400 dark:text-gray-500">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
