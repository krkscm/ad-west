/** True when any toolbar search, column filter, or extra filter signal is active. */
export function isListFilterActive(...signals: Array<string | boolean | undefined | null>): boolean {
  return signals.some((signal) => {
    if (typeof signal === 'boolean') return signal;
    if (typeof signal === 'string') return signal.trim().length > 0;
    return false;
  });
}
