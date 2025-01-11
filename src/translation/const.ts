export const enum EMOJI_LANGUAGE_MAP {
  kr = 'kr',
  us = 'us',
  jp = 'jp',
}

export const isTranslateRequestReaction = (emoji: string) => {
  return (
    [
      EMOJI_LANGUAGE_MAP.kr,
      EMOJI_LANGUAGE_MAP.us,
      EMOJI_LANGUAGE_MAP.jp,
    ] as string[]
  ).includes(emoji);
};
