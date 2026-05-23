import type { Icebreaker, IcebreakerCategory } from "./types";

export const icebreakers: Icebreaker[] = [
  // ダジャレ
  { id: "d1", category: "dajare", text: "アジェンダ、味元気? …すみません、今日も元気にいきましょう。" },
  { id: "d2", category: "dajare", text: "会議が長いと、解雇 (かいぎ) されそうですね。…冗談です、巻きでいきます。" },
  { id: "d3", category: "dajare", text: "Teams で会議、ちーむ (チーム) ワークが試されますね。" },
  { id: "d4", category: "dajare", text: "司会が AI、しかい (視界) は良好です。" },
  { id: "d5", category: "dajare", text: "予定表、よていひょう…余ってませんよ、ぎっしりです。" },

  // 豆知識
  { id: "t1", category: "trivia", text: "豆知識: 会議の生産性は最初の 7 分で決まると言われています。" },
  { id: "t2", category: "trivia", text: "豆知識: 立ち会議は座る会議より平均 34% 短く終わるそうです。" },
  { id: "t3", category: "trivia", text: "豆知識: 人間が集中できるのは 90 分が限界らしいので、適度に休憩しましょう。" },
  { id: "t4", category: "trivia", text: "豆知識: 議事録を共有するまでが会議です。" },

  // 天気・季節
  { id: "w1", category: "weather", text: "今日もお忙しい中ありがとうございます。水分補給を忘れずに!" },
  { id: "w2", category: "weather", text: "肩こっていませんか? 一度、肩をぐるっと回してから始めましょう。" },
  { id: "w3", category: "weather", text: "画面の見すぎで目が疲れていませんか? 遠くを見て深呼吸を。" },

  // テック小ネタ
  { id: "tc1", category: "tech", text: "ちなみに、私 (司会君) は Azure Speech で喋っています。違和感あったら教えてください。" },
  { id: "tc2", category: "tech", text: "私の予定取得は Microsoft Graph 経由。SPO さん、いつもありがとうございます。" },
  { id: "tc3", category: "tech", text: "もし音声が途切れたら、それは ACS のせいです。私のせいではありません。たぶん。" },
];

export function pickIcebreaker(
  category?: IcebreakerCategory,
  excludeIds: string[] = [],
): Icebreaker {
  const pool = icebreakers.filter(
    (i) => (!category || i.category === category) && !excludeIds.includes(i.id),
  );
  const source = pool.length > 0 ? pool : icebreakers;
  return source[Math.floor(Math.random() * source.length)]!;
}

export const categoryLabels: Record<IcebreakerCategory, string> = {
  dajare: "ダジャレ",
  trivia: "豆知識",
  weather: "気遣い",
  tech: "中の人ネタ",
};
