// Grober Filter für Zettel von Gästen (App Store 1.2: Inhalte anderer brauchen einen Filter).
// Fängt nur das Gröbste; was durchrutscht, lässt sich melden und löschen.

const WORDS = [
  // Deutsch
  "arschloch", "fotze", "hurensohn", "hure", "wichser", "missgeburt", "spast", "spasti", "schlampe", "nutte", "fick", "ficken", "neger", "kanake",
  "schwuchtel", "judensau", "sieg heil", "heil hitler", "verreck", "kill dich", "bring dich um",
  // Englisch
  "fuck", "cunt", "bitch", "whore", "slut", "nigger", "nigga", "faggot", "retard", "kill yourself", "kys",
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0@]/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/\$/g, "s");

const PATTERN = new RegExp(`(^|[^a-zäöüß])(${WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "i");

/** true, wenn der Text etwas enthält, das auf einem Zettel nichts verloren hat */
export const isAbusive = (text: string) => PATTERN.test(normalize(text));
