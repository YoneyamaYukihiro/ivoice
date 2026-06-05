export function normalizeForSpeak(text: string): string {
  let result = text;
  result = result.replace(/[（）()：:／/]/g, "、");
  result = result.replace(/[「」『』【】]/g, "");
  result = result.replace(/(?:[、,]\s*){2,}/g, "、");
  return result;
}
