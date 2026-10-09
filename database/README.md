# Odtwarzanie bazy LinguAI

`schema.sql` to pełny, pozbawiony danych uczniów zapis siedmiu tabel aplikacji,
indeksów, kluczy, RLS, uprawnień, dwóch funkcji i wyzwalacza Auth.
Pobrano definicje z katalogu działającej bazy 29.09.2026.

## Nowy projekt

Uruchom `schema.sql` jako administrator wyłącznie w NOWYM, PUSTYM projekcie
Supabase. Supabase dostarcza schemat `auth`, tabelę `auth.users`, funkcję
`auth.uid()` oraz role `anon`, `authenticated` i `service_role`.
Skrypt jest transakcyjny i celowo odmawia nadpisywania istniejących tabel.
Następnie odtwórz prywatną kopię danych właściwymi narzędziami (użytkownicy
Auth przed rekordami odwołującymi się do ich UUID). Nigdy nie publikuj danych
uczniów, kopii WordPressa, kluczy ani haseł w tym repozytorium.

## Działający projekt

Nie wykonuj `schema.sql` ani historycznych migracji na produkcji.
`migrations/` zawiera dwie oryginalne, JUŻ wykonane migracje wraz z ich
rzeczywistymi numerami z `supabase_migrations.schema_migrations`.
Ich efekty są już ujęte w `schema.sql`. Nie uruchamiaj obu ścieżek po sobie.
To zapis historyczny, nie kompletna kolejka `supabase db push`: pierwotne
tabele powstały przed pierwszą z tych migracji.

## Sprawdzenie

`npm ci && npm test` odtwarza schemat w odizolowanym PGlite (PostgreSQL WASM),
ze stubem kontraktu Auth. Sprawdza zapis dla różnych uczniów i języków,
zachowanie pól przy częściowej aktualizacji, historię, rollback i RLS.
Nie łączy się z bazą produkcyjną. Nie zastępuje próby pełnego odtworzenia
całego hostowanego Supabase, konfiguracji Auth, sekretów ani danych.
