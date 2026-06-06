export type AvatarGender = 'male' | 'female';

const FEMALE_VALUES = new Set([
  'f', 'female', 'woman', 'women', 'girl', 'ladies', 'lady',
]);

const MALE_VALUES = new Set([
  'm', 'male', 'man', 'men', 'boy',
]);

const FEMALE_NAME_HINTS = new Set([
  'devi', 'kumari', 'bai', 'ben', 'amma', 'achi', 'lakshmi', 'priya', 'meera',
  'anita', 'sunita', 'kavita', 'deepa', 'usha', 'radha', 'sita', 'geeta', 'neha',
  'pooja', 'anjali', 'shreya', 'divya', 'nisha', 'rekha', 'sushma',
]);

export function normalizeAvatarGender(value?: string | null): AvatarGender | null {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (FEMALE_VALUES.has(normalized)) return 'female';
  if (MALE_VALUES.has(normalized)) return 'male';
  if (normalized.includes('female') || normalized.includes('woman')) return 'female';
  if (normalized.includes('male') || normalized.includes('man')) return 'male';
  return null;
}

export function inferAvatarGenderFromName(name?: string | null): AvatarGender | null {
  const tokens = (name ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return null;

  for (const token of tokens) {
    if (FEMALE_NAME_HINTS.has(token)) return 'female';
    if (token.endsWith('devi') || token.endsWith('kumari')) return 'female';
  }

  const first = tokens[0];
  if (first.endsWith('a') && first.length > 3 && !first.endsWith('ya')) {
    return 'female';
  }

  return null;
}

export function resolveAvatarGender(
  gender?: string | null,
  name?: string | null,
): AvatarGender {
  return normalizeAvatarGender(gender) ?? inferAvatarGenderFromName(name) ?? 'male';
}
