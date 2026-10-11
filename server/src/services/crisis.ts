const PATTERNS: RegExp[] = [
  /\b(kill|killing|murder)\b.{0,30}\b(me|myself)\b/i,
  /\b(going to|will|threat(en|ening|ened)? to|trying to)\b.{0,20}\b(kill|murder|beat|hurt|stab|burn)\b/i,
  /\bsuicid/i,
  /\b(end|take) my (own )?life\b/i,
  /\bwant(ed)? to die\b/i,
  /\b(hurt|harm|cut) myself\b/i,
  /\bself[- ]?harm/i,
  /\b(being|getting) (beaten|attacked|stalked|followed|hit)\b/i,
  /\b(beating|hitting|choking|strangling|attacking) me\b/i,
  /\bimmediate danger\b/i,
  /\bnot safe\b.{0,30}\b(home|now|tonight)\b/i,
  /\blocked (me )?(in|up)\b/i,
  /\b(raped|rape|sexually assaulted)\b.{0,40}\b(today|tonight|just now|right now|yesterday)\b/i,
  /\bhe (has|had|is holding) a (knife|gun|weapon)\b/i,
];

/** Conservative keyword screen. A hit shows emergency guidance; it never replaces human judgement. */
export const detectCrisis = (text: string): boolean => PATTERNS.some((p) => p.test(text));

export const EMERGENCY_MESSAGE =
  'If you or someone else is in immediate danger, please contact local emergency services now (in India: 112) ' +
  'or go to a safe place and reach out to someone you trust. The Women Helpline in India is 181. ' +
  'If you are thinking about harming yourself, Tele-MANAS (14416) offers free mental health support in India. ' +
  'HerGuide is an information tool and cannot respond to emergencies.';
