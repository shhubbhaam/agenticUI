import ReactTestRenderer, { act } from 'react-test-renderer';
import { DEFAULT_SETTINGS } from '../../core/settings/settings';
import { useSettingsStore } from '../../state/useSettingsStore';
import { getDatabase } from '../../data/local/database';

// Press the touchable whose accessibilityLabel starts with `prefix`
// (ContentRow labels are "<title>. <subtitle>").
export async function pressRow(tree: ReactTestRenderer.ReactTestRenderer, prefix: string) {
  const node = tree.root.find(
    (n) =>
      typeof n.props.onPress === 'function' &&
      typeof n.props.accessibilityLabel === 'string' &&
      n.props.accessibilityLabel.startsWith(prefix)
  );
  await act(async () => {
    node.props.onPress();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

export function rowProps(tree: ReactTestRenderer.ReactTestRenderer, prefix: string) {
  return tree.root.find(
    (n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(prefix) && n.props.accessibilityRole
  ).props;
}

export async function signInSettings(username = 'settings-user@example.com') {
  await act(async () => {
    await useSettingsStore.getState().load(username);
  });
  return username;
}

export function resetSettings() {
  useSettingsStore.setState({ username: null, settings: DEFAULT_SETTINGS, notice: null });
}

// Make the next SQLite write fail, as when the disk is full.
export async function failNextWrite() {
  const db = await getDatabase();
  return jest.spyOn(db, 'runAsync').mockRejectedValueOnce(new Error('disk full'));
}
