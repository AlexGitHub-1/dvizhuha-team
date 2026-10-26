import { SCENES } from "./story";
/** Achievement data only. Each one unlocks when its counter reaches `goal`; counters are updated by rules in meta/achievements.ts. Rewards are cosmetic only. */
export type AchGroup = "pain" | "odd" | "story" | "meta";
export type FrameId = "bone" | "gold" | "ghost";
export interface AchReward { title?: string; scene?: string; frame?: FrameId; joke?: "flag" | "plaster" }
export interface AchDef { id: string; group: AchGroup; icon: string; name: string; desc: string; hint: string; counter: string; goal: number; secret?: boolean; reward: AchReward }

export const ACH_GROUPS: Record<AchGroup, string> = { pain: "Поражения и упрямство", odd: "Странные бои", story: "Сюжет и улики", meta: "Метаигра" };
export const FRAMES: Record<FrameId, { name: string; cls: string }> = {
  bone: { name: "Костяная", cls: "border-muted-foreground ring-2 ring-muted-foreground/40" },
  gold: { name: "Золотая", cls: "border-gold ring-2 ring-gold/50" },
  ghost: { name: "Призрачная", cls: "border-poison ring-2 ring-poison/40" },
};

export const ACHIEVEMENTS: AchDef[] = [
  { id: "pain", group: "pain", icon: "🩸", name: "Ученик боли", desc: "Проиграть 10 боёв.", hint: "Боль — лучший учитель.", counter: "losses", goal: 10, reward: { title: "Битый", frame: "bone" } },
  { id: "masochist", group: "pain", icon: "🩹", name: "Мазохист", desc: "Проиграть 50 боёв.", hint: "Ещё больше боли.", counter: "losses", goal: 50, secret: true, reward: { title: "Мазохист", scene: "s_aerin", joke: "plaster" } },
  { id: "stubborn", group: "pain", icon: "🐏", name: "Упрямый осёл", desc: "Проиграть уровень 5 раз подряд, а потом всё-таки победить.", hint: "Не сдаваться.", counter: "stubborn", goal: 1, reward: { title: "Упрямый", scene: "s_grosh" } },
  { id: "nearmiss", group: "pain", icon: "😬", name: "На волоске", desc: "Проиграть, оставив воротам меньше 1% здоровья.", hint: "Ещё бы чуть-чуть…", counter: "nearMiss", goal: 1, secret: true, reward: { title: "Почти" } },
  { id: "clown", group: "pain", icon: "🤡", name: "Клоун Орды", desc: "Проиграть уровень, который уже пройден на 3★.", hint: "Вернуться туда, где уже был героем.", counter: "clown", goal: 1, secret: true, reward: { title: "Клоун" } },

  { id: "pacifist", group: "odd", icon: "🏳️", name: "Пацифист", desc: "Закончить бой, не призвав ни одного бойца.", hint: "Иногда лучшая атака — никакой атаки.", counter: "pacifist", goal: 1, secret: true, reward: { title: "Пацифист", scene: "s_kaira", joke: "flag" } },
  { id: "lastsec", group: "odd", icon: "⏱️", name: "Последняя секунда", desc: "Победить, когда до конца боя меньше 3 секунд.", hint: "Тик-так.", counter: "lastSecond", goal: 1, reward: { title: "Опоздавший" } },
  { id: "lonewolf", group: "odd", icon: "🐺", name: "Одинокий волк", desc: "Победить, призвав за бой только одного бойца.", hint: "Один в поле воин.", counter: "loneWolf", goal: 1, secret: true, reward: { title: "Одиночка" } },
  { id: "notowers", group: "odd", icon: "🕊️", name: "Без единой башни", desc: "Победить, не разрушив ни одной башни.", hint: "Мимо стражи — прямо к воротам.", counter: "noTowers", goal: 1, reward: { title: "Призрак дорог" } },
  { id: "greedy", group: "odd", icon: "💰", name: "Жадина", desc: "Закончить бой с полной шкалой эссенции.", hint: "Копить, копить, копить…", counter: "greedy", goal: 1, reward: { title: "Скряга" } },
  { id: "beggar", group: "odd", icon: "🥄", name: "Нищий полководец", desc: "Победить отрядом, где все бойцы 1-го уровня.", hint: "Прокачка — для слабаков.", counter: "beggar", goal: 1, secret: true, reward: { title: "Нищий" } },
  { id: "goblins", group: "odd", icon: "👺", name: "Гоблинский рай", desc: "Призвать 30 гоблинов-разведчиков в одном бою.", hint: "Больше гоблинов богу гоблинов.", counter: "goblins", goal: 30, reward: { title: "Гоблинолюб" } },
  { id: "silence", group: "odd", icon: "🤫", name: "Тишина", desc: "Пройти бой с выключенными звуками и музыкой.", hint: "Тсс.", counter: "silence", goal: 1, secret: true, reward: { title: "Немой" } },
  { id: "optimist", group: "odd", icon: "🌈", name: "Оптимист", desc: "Победить с силой отряда меньше половины требуемой.", hint: "Цифры врут.", counter: "optimist", goal: 1, secret: true, reward: { title: "Оптимист" } },
  { id: "perfect", group: "odd", icon: "💎", name: "Перфекционист", desc: "Переиграть уровень с 1★ на 3★.", hint: "Одной звезды мало.", counter: "perfect", goal: 1, reward: { title: "Перфекционист", frame: "gold" } },
  { id: "night", group: "odd", icon: "🌙", name: "Ночная смена", desc: "Сыграть бой между 3 и 5 часами ночи.", hint: "Когда спит даже стража.", counter: "night", goal: 1, secret: true, reward: { title: "Полуночник", frame: "ghost" } },

  { id: "wrong", group: "story", icon: "🫵", name: "Не тот", desc: "Обвинить не того на доске улик.", hint: "Поспешные выводы.", counter: "wrong", goal: 1, secret: true, reward: { title: "Слепой судья", scene: "s_vale" } },
  { id: "sherlock", group: "story", icon: "🔍", name: "Шерлок", desc: "Верно обвинить, собрав все улики.", hint: "Все улики — одна правда.", counter: "sherlock", goal: 1, reward: { title: "Сыщик", scene: "s_scribe" } },
  { id: "skipper", group: "story", icon: "⏭️", name: "Нетерпеливый", desc: "Пропустить 10 катсцен.", hint: "Кому нужен этот сюжет?", counter: "skips", goal: 10, secret: true, reward: { title: "Нетерпеливый" } },
  { id: "archivist", group: "story", icon: "📜", name: "Архивариус", desc: "Перечитать в Летописи каждую сцену похода.", hint: "Всё записано.", counter: "rewatched", goal: SCENES.length, reward: { title: "Архивариус", scene: "s_selesta" } },

  { id: "unlucky", group: "meta", icon: "🐈‍⬛", name: "Невезучий", desc: "Открыть 15 сундуков подряд без редкого бойца и выше.", hint: "Чёрная полоса.", counter: "dry", goal: 15, secret: true, reward: { title: "Невезучий" } },
  { id: "dupes", group: "meta", icon: "🪞", name: "Коллекционер дубликатов", desc: "Получить одного и того же бойца из сундуков 5 раз как дубликат.", hint: "Опять он?!", counter: "dupMax", goal: 5, reward: { title: "Двойник" } },
  { id: "resign", group: "meta", icon: "🔄", name: "Отставка", desc: "Сбросить таланты 3 раза.", hint: "Передумал. Снова.", counter: "resets", goal: 3, reward: { title: "Нерешительный" } },
  { id: "hoarder", group: "meta", icon: "🏦", name: "Скупой рыцарь", desc: "Накопить 5000 золота одновременно.", hint: "Золото любит тишину.", counter: "maxGold", goal: 5000, reward: { title: "Казначей" } },
];
export const ACH_BY_ID: Record<string, AchDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
