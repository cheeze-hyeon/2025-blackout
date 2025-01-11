import { EMOJI_LANGUAGE_MAP } from './const';

type TranslatePayload = {
  text: string;
  language: string;
};

export const useTranslation = async ({ text, language }: TranslatePayload) => {
  let translated: string;
  switch (language) {
    case EMOJI_LANGUAGE_MAP.kr:
      translated = '한국어로 번역';
      break;
    case EMOJI_LANGUAGE_MAP.jp:
      translated = '일본어로 번역';
      break;
    case EMOJI_LANGUAGE_MAP.us:
      translated = '영어로 번역';
      break;
    default:
      return;
  }
  return { text, translated };
};
