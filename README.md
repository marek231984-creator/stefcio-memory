# LinguAI Memory API 3.0 — kandydat do wdrożenia

**Ta paczka nie została wdrożona. Produkcja nadal działa na 2.2.**

Najpierw przeczytaj `DEPLOYMENT.md`. Wdrożenie samego `server.js` przerwie
zapisy ze starych klientów. To kod backendu i adapter MU WordPress, NIE gotowy
ZIP wtyczki do przesłania w panelu WordPress.

## Weryfikacja 29.09.2026
- 5 testów Node zakończonych powodzeniem (`npm test`).
- Odtworzenie schematu i testy RLS/RPC w PGlite; bez produkcyjnych danych.
- PHP 8.4: test hooków adaptera, odrzucenie użytkownika wylogowanego,
  brak sekretu serwera w HTML i zgodność podpisu PHP z weryfikacją Node.
- Nie wykonano integracyjnej rozmowy ElevenLabs ani testów na staging.

## Pliki
- `database/`: schemat i oryginalne migracje historyczne, instrukcja odtworzenia.
- `server.js`, `learner-context.js`: backend wymagający podpisu użytkownika/języka.
- `wordpress/`: adapter wystawiający kontekst na podstawie sesji WordPress.
- `test/`, `server.test.js`: testy bez połączenia z produkcją.
- `.github/workflows/test.yml`: testy dla PR i main; ruleset wymaga osobnej aktywacji.

Uruchomienie backendu wymaga istniejących zmiennych SUPABASE_URL,
SUPABASE_SERVICE_ROLE_KEY i LINGUAI_BACKEND_SECRET w środowisku serwera.
Nigdy nie wpisuj ich do repozytorium ani kodu przeglądarki.
