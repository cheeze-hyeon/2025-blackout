export const isTradeAcceptRequestReaction = (emoji: string) => {
  // 손드는 이모지와 체크 이모지를 추가적으로 포함
  const additionalEmojis = [
    '\u270B', // ✋ 손드는 이모지
    '\u1F91A', // 🤚 손바닥 이모지
    '\u1F44B', // 👋 손 흔드는 이모지
    '\u1F64C', // 🙌 손 들고 있는 이모지
    '\u2705', // ✅ 체크 표시
    '\u1F58C', // 🖌️ 필기용 펜
  ];

  return additionalEmojis.includes(emoji);
};
