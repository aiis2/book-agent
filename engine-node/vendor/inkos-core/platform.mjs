export function normalizePlatformId(platform) {
  if (typeof platform !== 'string') {
    return undefined;
  }

  const raw = platform.trim();
  if (!raw) {
    return undefined;
  }

  const lowered = raw.toLowerCase();
  const compact = lowered.replace(/[\s_-]+/g, '');

  if (compact === 'tomato' || compact === 'fanqie' || compact === 'fanqienovel' || raw.includes('番茄')) {
    return 'tomato';
  }
  if (compact === 'qidian' || compact === 'qidianzhongwenwang' || raw.includes('起点')) {
    return 'qidian';
  }
  if (compact === 'feilu' || raw.includes('飞卢')) {
    return 'feilu';
  }
  if (compact === 'other' || compact === 'others' || raw.includes('其他') || raw.includes('其它')) {
    return 'other';
  }

  return 'other';
}

export function normalizePlatformOrOther(platform) {
  return normalizePlatformId(platform) ?? 'other';
}