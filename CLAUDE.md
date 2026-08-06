# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Grades-Analyser** is a client-side only Weighted Grade Calculator — a single-page web app with no build step or backend. It lets students manually enter grades per subject/task or upload a CSV, then computes weighted averages, statistics (mean, median, mode, std dev), and renders charts.

## File Structure

| File | Purpose |
|---|---|
| `index.html` | Single-page HTML skeleton; loads external CDN libs (PapaParse, Chart.js, Material Icons, Google Fonts) |
| `styles.css` | MD3-inspired theme with light/dark mode via CSS custom properties |
| `script.js` | All application logic — subject/task CRUD, localStorage persistence, CSV import/export, data processing, Chart.js rendering |

## Key Architecture

- **No framework** — vanilla JS, direct DOM manipulation
- **State** lives in three global variables: `subjects` (array), `nextId` (counter), `taskCounters` (map). Persisted to `localStorage` as `gradeData`
- **CSV format** expects columns: `Subject, Task, MarkGotten, MaxMark, Weight`
- **Charts**: Chart.js renders per-subject line charts + a subject comparison bar chart
- **Theme**: Light/dark toggle persisted to `localStorage` as `theme`; also respects `prefers-color-scheme`

## Development

- **No build tool** — just open `index.html` in a browser or serve with any static server
- Quick local server: `npx serve .` or `python -m http.server`
- **No tests, no linter, no type checking** currently set up

## External Dependencies (CDN)

- PapaParse 5.3.2 — CSV parsing
- Chart.js (latest) — chart rendering
- Material Icons — icon font
- Google Fonts (Atkinson Hyperlegible)
