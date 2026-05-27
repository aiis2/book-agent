export function parseShortFictionSalesPackage(rawContent, fallbackTitle = "Untitled Short Fiction") {
  const title = normalizeTitle(
    extractTaggedBlock(rawContent, "SHORT_FICTION_PACKAGE_TITLE")
    || extractTaggedBlock(rawContent, "SHORT_FICTION_TITLE")
    || fallbackTitle,
  ) || fallbackTitle;
  const intro = extractTaggedBlock(rawContent, "SHORT_FICTION_INTRO")
    || extractTaggedBlock(rawContent, "INTRO")
    || "";
  const sellingRaw = extractTaggedBlock(rawContent, "SHORT_FICTION_SELLING_POINTS")
    || extractTaggedBlock(rawContent, "SELLING_POINTS")
    || "";
  const coverPrompt = extractTaggedBlock(rawContent, "SHORT_FICTION_COVER_PROMPT")
    || extractTaggedBlock(rawContent, "COVER_PROMPT")
    || "";
  return {
    title,
    intro: intro.trim(),
    sellingPoints: sellingRaw
      .split(/\n+/)
      .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
      .filter(Boolean),
    coverPrompt: coverPrompt.trim(),
    rawContent: String(rawContent ?? "").trim(),
  };
}


function extractTaggedBlock(raw, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^\\s*===\\s*${escaped}\\s*===\\s*\\n([\\s\\S]*?)(?=^\\s*===\\s*[A-Z0-9_ ]+\\s*===\\s*$|(?![\\s\\S]))`,
    "im",
  );
  return pattern.exec(String(raw ?? ""))?.[1]?.trim() ?? "";
}


function normalizeTitle(raw) {
  return String(raw ?? "")
    .replace(/^#+\s*/gm, "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean)
    ?.replace(/^《(.+)》$/, "$1")
    .trim() ?? "";
}
