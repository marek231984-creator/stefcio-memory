# Stan: wdrożenie częściowe — 29.09.2026

Produkcja pozostaje na API 2.2, commit c107cc499616d2b035b6febd68e017490179430f.
Kod zapisano w GitHub na gałęzi security/learner-context-20260929, w roboczym PR #1.
Integracja GitHub odmówiła zapisu (403); zapis wykonano przez zalogowany panel GitHub.
Nie zmieniono produkcyjnej bazy. Backend nadal działa jako API 2.2.

## Wykonane na produkcji

- Adapter podpisu dopisano do aktywnego WPCode 422 z osłoną
  `function_exists`, zachowując wcześniejszy kod i jego kopię sprzed zmiany.
- Poprawiono wybór języka pierwszej lekcji: kontekst bierze język z żądania
  WordPress, zamiast domyślnego włoskiego przy pustej pamięci.
- Sprawdzono widżety EN, ES, IT i ZH: właściwy agent, język i obecność
  podpisanego kontekstu. Regresja PHP dla czterech języków przeszła.
- W istniejącym wspólnym narzędziu ElevenLabs zapisującym pamięć dodano
  `x-linguai-context` jako zmienną dynamiczną `secret__learner_context`.
  Istniejący sekret usługi pozostawiono bez zmian.
- CI dla commitu 16d4ffbcaefa457c1020143803c5648b3489c431 zakończyło się sukcesem.
- Complianz: zarządzanie zgodą zmieniono z ukrywania na telefonach na
  „Pokaż wszędzie”, położenie na lewy dolny róg. Na panelu potwierdzono
  odrzucenie opcjonalnych cookies i ponowne otwarcie banera przyciskiem.

Po wyraźnej zgodzie użytkownika na warunki ElevenLabs wykonano krótką rozmowę
tekstową w języku chińskim na koncie administratora. Agent zapisał
„TEST TECHNICZNY 29.09”; po zakończeniu rozmowy i przeładowaniu panelu widoczne
są temat, powitanie i plan „Powtórka powitania”. Panel pokazuje poziom A0
(przed testem był nieokreślony). Test dotyczy dotychczasowego API 2.2.
Nie wykonano testu dwóch kont na staging. API 3.0 nie zostało
scalone ani wdrożone; nie wolno traktować powyższych kontroli UI jako pełnego
testu autoryzacji na produkcji.

## Co przygotowano

- Schemat bazy bez danych osobowych i dwa oryginalne historyczne skrypty migracji.
- Test odtworzenia schematu i atomowego zapisu pamięci/historii w odizolowanym
  PostgreSQL WASM. RLS ogranicza odczyt do własnego Auth UUID; wywołania RPC
  przez `anon` i `authenticated` są odrzucane.
- API 3.0: oprócz dotychczasowego sekretu usługi wymaga podpisanego kontekstu
  ucznia i języka, z oddzielnym zakresem odczytu/zapisu i terminem ważności.
- Adapter WordPress podpisujący tożsamość z `get_current_user_id()`.
- Testy podmiany ucznia/języka, podpisu, zakresu i daty ważności; workflow CI.

## Granice ochrony

Podpis zapewnia, że podany uczeń i język zostały zatwierdzone przez serwer
WordPress przy wystawieniu tokenu. Nie jest to kontrola aktywności sesji przy
każdym zapisie. Token zapisu działa maksymalnie dwie godziny, również po
wylogowaniu; token odczytu 120 sekund. To świadomy, ograniczony czasowo dostęp
do pamięci jednego ucznia i jednego języka. Token nie daje dostępu bez drugiego,
istniejącego sekretu usługi. Nie wolno go umieszczać w URL, logach ani promptach.
Przechowuj go jako `secret__learner_context` w ElevenLabs.
Kompromitacja wspólnego sekretu usługi nadal kompromituje tę granicę zaufania.
Rozwiązanie nie zastępuje autoryzacji płatnego pakietu, limitów użycia ani
prywatnego/signed-url dostępu do samej rozmowy ElevenLabs.

## Wdrożenie — skoordynowane, najpierw staging

1. Utwórz gałąź i PR, uruchom `npm ci --ignore-scripts && npm test`.
2. Zainstaluj adapter `wordpress/linguai-learner-context.php` w staging WordPress,
   jako MU plugin. Korzysta z istniejącego serwerowego nagłówka sekretu; nie
   wymaga wpisywania klucza do repozytorium.
3. W narzędziu ElevenLabs wywołującym `/api/memory/save` zachowaj
   `x-linguai-secret` jako istniejący sekret usługi i dodaj nagłówek
   `x-linguai-context` typu dynamic variable o wartości `secret__learner_context`.
   Zrób to dla narzędzi używanych przez wszystkie cztery języki. Nie generuj
   wartości tokenu przez LLM ani nie dodawaj jej do promptu.
4. Na staging uruchom backend API 3.0 z dotychczasowymi zmiennymi serwerowymi.
   Nowy backend celowo odrzuca wszystkie stare wywołania bez podpisu.
5. Sprawdź dwoma kontami WordPress każdy z czterech języków: odczyt pamięci,
   faktyczna rozmowa, zapis, ponowne otwarcie panelu. Sprawdź podmianę id/języka,
   długi czas otwarcia strony, wygasły token, brak dostępu po końcu TTL,
   odświeżenie strony i to, że cache nigdy nie współdzieli kontekstu uczniów.
6. Dopiero po tym zastosuj tę samą kolejność na produkcji: WordPress → narzędzie
   ElevenLabs → backend. Nie wdrażaj samego backendu przed klientami.

Jeżeli token wygasł, trzeba odświeżyć stronę i rozpocząć nową rozmowę. Obecny
adapter nie ma automatycznego odnawiania podczas trwającej rozmowy.
Wykonano opisany wyżej test produkcyjnej rozmowy tekstowej; nie wdrożono staging.

## Ruleset dla main

W GitHub Settings → Rules → Rulesets ustaw regułę aktywną dla `main`:
blokowanie usuwania, blokowanie force push, zmiany przez pull request,
wymagany status `test` z workflow `Tests`, rozwiązane dyskusje.
Ustaw 0 obowiązkowych zatwierdzeń, dopóki repozytorium utrzymuje jedna osoba
(autor nie może zatwierdzić własnego PR). Sprawdź zielony status CI przed
włączeniem wymaganego statusu. Nie dodawaj ogólnego bypassu administratora.
Ochronę main włączono 29.09.2026 (ruleset Ochrona main, ID 24165432).
Nie dodano wyjątków pozwalających omijać regułę.

## Dodatkowe ustalenia audytu

Funkcja `linguai_save_memory` jest SECURITY INVOKER i ma EXECUTE wyłącznie dla
postgres/service_role. To nie jest publiczny endpoint bez autoryzacji.
Wyzwalacz `create_student_memory_for_new_user` ma zbyt szerokie uprawnienia
EXECUTE (PUBLIC, anon, authenticated); doradca Supabase zgłasza ostrzeżenie.
To funkcja triggerowa, nie dowód skutecznego publicznego wywołania ani włamania.
Osobna poprawka powinna odebrać te nadmiarowe uprawnienia i sprawdzić rejestrację
użytkownika. Ochrona Supabase Auth przed wyciekłymi hasłami jest wyłączona;
nie zmieniono jej w tym zadaniu.

Dokumentacja:
- https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
