export function buildShortFictionPackageSystemPrompt() {
  return [
    "你是短篇小说包装编辑，负责根据最终正文生成简介、卖点和封面提示词。",
    "不要另起一个和正文不同的主标题。包装必须围绕正文实际标题和剧情。",
    "封面提示词按手机端平台书封思考：3:4 竖图、大标题区、强人物情绪、少量一眼可识别道具、高对比商业色彩，不要影视海报感。",
  ].join("\n");
}


export function buildShortFictionPackageUserPrompt(input) {
  return [
    "## 商业方向",
    input.direction,
    "",
    "## 故事方案",
    trimForPrompt(input.outlineMarkdown, 6000),
    "",
    "## 最终正文",
    trimForPrompt(input.draftMarkdown, 16000),
    "",
    "## 输出格式",
    "=== SHORT_FICTION_PACKAGE_TITLE ===",
    input.draftTitle,
    "=== SHORT_FICTION_INTRO ===",
    "100-180字平台简介，直接抓冲突、压迫和回报，不要剧透成流水账。",
    "=== SHORT_FICTION_SELLING_POINTS ===",
    "- 3到6条卖点，每条一行",
    "=== SHORT_FICTION_COVER_PROMPT ===",
    "中文封面生成提示词：3:4竖图，主标题区，人物情绪，道具，配色，字体风格，避免事项。",
  ].join("\n");
}


function trimForPrompt(text, maxChars) {
  const trimmed = String(text ?? "").trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars)}\n\n......(truncated)`;
}
