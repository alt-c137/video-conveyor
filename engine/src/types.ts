// edit.json — всё, что нужно для сборки одного видео. Пишет conveyor/edit.py (ИИ выбирает сцены).
export type Theme = {
  paper: string; // фон код-сцен
  ink: string; // линии и текст
  a1: string; // главный акцент
  a2: string; // второй акцент
  a3: string; // третий (мягкий)
  dark: string; // тёмные плашки
};

export type Word = { w: string; t: number; e: number };
export type Shot = { id: number; start: number; end: number; src: string | null };
export type Caption = { start: number; end: number; text: string; words: Word[]; kind: "phrase" | "title" };
export type Section = { n: number; start: number; title: string };
export type Scene = { type: string; start: number; end: number; props: Record<string, any>; cues?: number[] };
export type Sfx = { t: number; name: string; vol?: number };

export type Edit = {
  fps: number;
  duration: number; // секунды голоса
  title: string;
  channel: string;
  theme: Theme;
  voice: string; // путь в public
  shots: Shot[];
  captions: Caption[];
  sections: Section[];
  scenes: Scene[];
  sfx: Sfx[];
  cta: { intro: number; outro: number };
  endSeconds: number; // длина концовки после голоса
};
