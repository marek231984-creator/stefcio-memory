const express = require("express");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const LINGUAI_BACKEND_SECRET =
  process.env.LINGUAI_BACKEND_SECRET;

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY ||
  !LINGUAI_BACKEND_SECRET
) {
  console.error("Brakuje wymaganych zmiennych środowiskowych.");
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);


// =====================================================
// BEZPIECZEŃSTWO
// =====================================================

function requireBackendSecret(req, res, next) {
  const provided = req.get("x-linguai-secret") || "";
  const expected = LINGUAI_BACKEND_SECRET;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized"
    });
  }

  next();
}


// =====================================================
// WORDPRESS USER ID
// =====================================================

function getWpUserId(data = {}) {
  const value =
    data.wp_user_id ??
    data.wpUserId ??
    null;

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "LinguAI Memory API",
    version: "2.0"
  });
});


// Wszystkie endpointy /api wymagają sekretu
app.use("/api", requireBackendSecret);


// =====================================================
// POBIERANIE PAMIĘCI UCZNIA
// =====================================================

app.post("/api/memory/get", async (req, res) => {
  try {
    const wpUserId = getWpUserId(req.body);

    if (!wpUserId) {
      return res.status(400).json({
        found: false,
        error: "wp_user_id jest wymagany"
      });
    }

    const { data: memory, error } = await supabase
      .from("student_memory")
      .select(`
        id,
        wp_user_id,
        name,
        gender,
        language,
        level,
        last_lesson_topic,
        what_was_practiced,
        words_to_review,
        mistakes_to_review,
        next_lesson_plan,
        updated_at
      `)
      .eq("wp_user_id", wpUserId)
      .maybeSingle();

    if (error) {
      console.error("Błąd memory/get:", error);

      return res.status(500).json({
        found: false,
        error: "Nie udało się pobrać pamięci ucznia."
      });
    }

    if (!memory) {
      return res.json({
        found: false,
        wp_user_id: wpUserId
      });
    }

    return res.json({
      found: true,
      memory
    });

  } catch (error) {
    console.error("Błąd memory/get:", error);

    return res.status(500).json({
      found: false,
      error: "Wewnętrzny błąd serwera."
    });
  }
});


// =====================================================
// ZAPIS / AKTUALIZACJA PAMIĘCI
// =====================================================

app.post("/api/memory/save", async (req, res) => {
  try {
    const data = req.body || {};
    const wpUserId = getWpUserId(data);

    if (!wpUserId) {
      return res.status(400).json({
        success: false,
        error: "wp_user_id jest wymagany"
      });
    }

    const allowedFields = [
      "name",
      "gender",
      "language",
      "level",
      "last_lesson_topic",
      "what_was_practiced",
      "words_to_review",
      "mistakes_to_review",
      "next_lesson_plan"
    ];

    const memoryData = {};

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          data,
          field
        )
      ) {
        memoryData[field] = data[field];
      }
    }

    memoryData.updated_at =
      new Date().toISOString();


    // Sprawdzamy, czy pamięć użytkownika już istnieje
    const {
      data: existing,
      error: lookupError
    } = await supabase
      .from("student_memory")
      .select("id")
      .eq("wp_user_id", wpUserId)
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Błąd wyszukiwania ucznia:",
        lookupError
      );

      return res.status(500).json({
        success: false,
        error: "Nie udało się znaleźć ucznia."
      });
    }


    let saved;
    let saveError;


    // -----------------------------------------
    // AKTUALIZACJA ISTNIEJĄCEGO UCZNIA
    // -----------------------------------------

    if (existing) {
      const result = await supabase
        .from("student_memory")
        .update(memoryData)
        .eq("id", existing.id)
        .select()
        .single();

      saved = result.data;
      saveError = result.error;
    }


    // -----------------------------------------
    // NOWY UŻYTKOWNIK WORDPRESS
    // -----------------------------------------

    else {
      const result = await supabase
        .from("student_memory")
        .insert({
          legacy_user_id: `wp_${wpUserId}`,
          wp_user_id: wpUserId,
          ...memoryData
        })
        .select()
        .single();

      saved = result.data;
      saveError = result.error;
    }


    if (saveError) {
      console.error(
        "Błąd memory/save:",
        saveError
      );

      return res.status(500).json({
        success: false,
        error: "Nie udało się zapisać pamięci ucznia."
      });
    }


    return res.json({
      success: true,
      memory: saved
    });

  } catch (error) {
    console.error("Błąd memory/save:", error);

    return res.status(500).json({
      success: false,
      error: "Wewnętrzny błąd serwera."
    });
  }
});


// =====================================================
// START SERWERA
// =====================================================

app.listen(PORT, () => {
  console.log(
    `LinguAI Memory API działa na porcie ${PORT}`
  );
});
