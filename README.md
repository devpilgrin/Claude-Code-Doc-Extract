# doc-extract

**Claude Code plugin** — automatic extraction of PDF, DOCX, XLSX into Markdown with embedded images. Intercepts `Read` calls and redirects all skills, agents, and tools to the extracted data. No external applications, no native modules — pure JavaScript.

[English](#english) | [Русский](#русский)

---

## English

### What it does

Intercepts `Read` calls on document files and automatically extracts their content into `.temp/<filename>/`:

| Format | Output |
|--------|--------|
| **PDF** | Text by page + extracted images. Pages without a text layer are **skipped** (no OCR). |
| **DOCX** | Full text in Markdown + embedded images (`![](images/...)`). |
| **XLSX** | Each sheet → Markdown table. |

Output lands in `.temp/<filename>/index.md` with images in `.temp/<filename>/images/`.

### How it works

1. You (or any agent/skill) try to `Read` a `.pdf`/`.docx`/`.xlsx` file
2. The plugin's `PreToolUse` hook intercepts the call
3. Content is extracted to `.temp/<filename>/`
4. The original `Read` is blocked — Claude is redirected to the extracted Markdown
5. A manifest at `.temp/.doc-extract.json` tracks all extractions

**No OCR.** If a PDF page has no text, it is skipped.

### Installation

```bash
# Install from GitHub:
npm install -g https://github.com/devpilgrin/Claude-Code-Doc-Extract.git

# Or clone and link:
git clone https://github.com/devpilgrin/Claude-Code-Doc-Extract.git
cd Claude-Code-Doc-Extract
npm install
npm link
```

### Usage

```bash
# Standalone CLI
doc-extract report.pdf          # → .temp/report/index.md
doc-extract data.xlsx           # → .temp/data/index.md
doc-extract letter.docx         # → .temp/letter/index.md

# Claude Code slash commands
/extract-doc report.pdf         # Manual extraction
/doc-extracted                  # List all extracted documents
/doc-extracted report.pdf       # Check if a specific file was extracted
```

### Why no external apps?

The plugin bundles three pure-JS libraries:
- **pdfjs-dist** (Mozilla) — PDF parsing, no native binaries
- **mammoth** — DOCX → Markdown conversion
- **SheetJS (xlsx)** — spreadsheet reading

Everything runs in Node.js. No Python, no LibreOffice, no MS Office required.

### Requirements

- Node.js ≥ 18
- Claude Code (for plugin mode) or standalone use

---

## Русский

**Плагин для Claude Code** — автоматическое извлечение PDF, DOCX, XLSX в Markdown со встроенными изображениями. Перехватывает вызовы `Read` и перенаправляет все скиллы, агенты и инструменты на извлечённые данные.

### Что делает

Перехватывает вызовы `Read` к файлам документов и автоматически извлекает их содержимое в `.temp/<имя_файла>/`:

| Формат | Результат |
|--------|-----------|
| **PDF** | Текст по страницам + извлечённые изображения. Страницы без текстового слоя **пропускаются** (без OCR). |
| **DOCX** | Полный текст в Markdown + встроенные изображения (`![](images/...)`). |
| **XLSX** | Каждый лист → Markdown-таблица. |

Вывод: `.temp/<имя_файла>/index.md`, изображения в `.temp/<имя_файла>/images/`.

### Как работает

1. Вы (или любой агент/скилл) пытаетесь прочитать файл `.pdf`/`.docx`/`.xlsx`
2. Хук `PreToolUse` плагина перехватывает вызов
3. Содержимое извлекается в `.temp/<имя_файла>/`
4. Оригинальный `Read` блокируется — Claude перенаправляется на извлечённый Markdown
5. Манифест `.temp/.doc-extract.json` отслеживает все извлечения

**Без OCR.** Если страница PDF не содержит текста — она пропускается.

### Установка

```bash
# Установка из GitHub:
npm install -g https://github.com/devpilgrin/Claude-Code-Doc-Extract.git

# Или клонировать и установить локально:
git clone https://github.com/devpilgrin/Claude-Code-Doc-Extract.git
cd Claude-Code-Doc-Extract
npm install
npm link
```

### Использование

```bash
# CLI
doc-extract report.pdf          # → .temp/report/index.md
doc-extract data.xlsx           # → .temp/data/index.md

# Слеш-команды в Claude Code
/extract-doc report.pdf         # Ручное извлечение
/doc-extracted                  # Список всех извлечённых документов
/doc-extracted report.pdf       # Проверить, извлечён ли конкретный файл
```

### Почему без сторонних приложений?

Плагин использует три pure-JS библиотеки:
- **pdfjs-dist** (Mozilla) — разбор PDF без нативных бинарников
- **mammoth** — конвертация DOCX → Markdown
- **SheetJS (xlsx)** — чтение электронных таблиц

Всё работает в Node.js. Ни Python, ни LibreOffice, ни MS Office не нужны.

### Требования

- Node.js ≥ 18
- Claude Code (для режима плагина) или standalone-использование
