# Dictionary flipper

## [WORK IN PROGRESS]

- [English](#english)
- [Русский](#русский)

---

# English

Version 2 of the `json` dictionary is parsed more granularly than version 1. In 2 version the `definition` is parsed in a way that there is a `value` field that often contains a translation with single word. This can help us to use the one-way dictionary as a two-way dictionary, for example if we got parsed Lezgi-English dictionary we could eventually use it as English-Lezgi dictionary too.

To do this we need to flip the dictionary. This is done by the `flipper.ts` script. It takes the v2 `json` dictionary as an input and outputs the flipped dictionary where `definition` with a single word becomes `expression` and its `expression` becomes a `definition`.

---

# Русский

Вторая версия словаря `json` распарсена более детально, чем первая. Во второй версии `definition` разбирается таким образом, что имеется поле `value`, которое часто содержит перевод одним словом. Это может помочь нам использовать односторонний словарь как двусторонний, например, если мы распарсили лезгинско-английский словарь, то мы можем использовать его и как англо-лезгинский словарь.

Для этого необходимо перевернуть словарь. Это делает скрипт `flipper.ts`. Он принимает на вход словарь v2 `json` и выдает перевернутый словарь, в котором `definition` с одним словом становится `expression`, а его `expression` - `definition`.
