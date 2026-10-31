import { useEffect, useState } from 'react';
import { budgetSubtitle, formatsSubtitle, reminderSubtitle, type AppSettings } from '../../core/settings/settings';
import { downloadsRowSubtitle, type DownloadedLesson } from '../../core/downloads/downloads';
import { mockDownloadsRepository } from '../../data/mock/mockDownloadsRepository';
import { useOnboardingStore } from '../../state/useOnboardingStore';
import { useSettingsStore } from '../../state/useSettingsStore';
import { useSaveNotice, type SaveNotice } from './useSaveNotice';

export interface SettingsData {
  settings: AppSettings;
  notice: SaveNotice | null;
  budgetCaption: string;
  formatsCaption: string;
  reminderCaption: string;
  downloadsCaption: string;
  setDownloadOnWifi: (value: boolean) => void;
}

export function useSettingsData(): SettingsData {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const budget = useOnboardingStore((s) => s.answers.budgetMinutes);
  const formats = useOnboardingStore((s) => s.answers.formats);
  const notice = useSaveNotice();
  const [downloads, setDownloads] = useState<DownloadedLesson[]>([]);

  useEffect(() => {
    let cancelled = false;
    mockDownloadsRepository
      .list()
      .then((items) => {
        if (!cancelled) setDownloads(items);
      })
      .catch(() => {
        // The caption is decoration — leave it empty rather than block the screen.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    settings,
    notice,
    budgetCaption: budgetSubtitle(budget),
    formatsCaption: formatsSubtitle(formats),
    reminderCaption: reminderSubtitle(settings.reminderTime),
    downloadsCaption: downloadsRowSubtitle(downloads),
    setDownloadOnWifi: (value) => {
      void update({ downloadOnWifi: value });
    },
  };
}
