import { EMOJI_LANGUAGE_MAP } from './const';
import { requestTranslation } from '../AImodel';

type TranslatePayload = {
  text: string;
  language: string;
};

export const useTranslation = async ({ text, language }: TranslatePayload) => {
  const translated = await requestTranslation(language, text);

  return { text, translated };
};
