const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Brakuje SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY."
  );
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

function getUserId(data = {}) {
  return data.user_id || data.userId || null;
}

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Stefcio memory API działa z Supabase"
  });
});

// ZAPIS LUB AKTUALIZACJA PAMIĘCI
app.post("/save-memory", async (req, res) => {
  try {
    const data = req.body || {};
    const userId = getUserId(data);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "user_id jest wymagany"
      });
    }

    const memoryData = {
      user_id: userId,
      name: data.name || "",
      gender: data.gender || "unknown",
      language: data.language || "włoski",
      level: data.level || "",
      last_lesson_topic: data.last_lesson_topic || "",
      what_was_practiced: data.what_was_practiced || "",
      words_to_review: data.words_to_review || "",
      mistakes_to_review: data.mistakes_to_review || "",
      next_lesson_plan: data.next_lesson_plan || "",
      updated_at: new Date().toISOString()
    };

    const { data: saved, error } = await supabase
      .from("student_memory")
      .upsert(memoryData, {
        onConflict: "user_id"
      })
      .select()
      .single();

    if (error) {
      console.error("Błąd save-memory:", error);

      return res.status(500).json({
        success: false,
        error: "Nie udało się zapisać pamięci."
      });
    }

    console.log(`Zapisano pamięć użytkownika: ${userId}`);

    return res.json({
      success: true,
      message: "Pamięć ucznia została zapisana.",
      saved
    });
  } catch (error) {
    console.error("Nieoczekiwany błąd save-memory:", error);

    return res.status(500).json({
      success: false,
      error: "Wewnętrzny błąd serwera."
    });
  }
});

// ODCZYT PAMIĘCI
app.post("/get-memory", async (req, res) => {
  try {
    const data = req.body || {};
    const userId = getUserId(data);

    if (!userId) {
      return res.status(400).json({
        found: false,
        error: "user_id jest wymagany"
      });
    }

    const { data: savedMemory, error } = await supabase
      .from("student_memory")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Błąd get-memory:", error);

      return res.status(500).json({
        found: false,
        error: "Nie udało się pobrać pamięci."
      });
    }

    if (!savedMemory) {
      console.log(`Brak pamięci użytkownika: ${userId}`);

      return res.json({
        found: false,
        message: "Brak zapisanej pamięci dla tego ucznia."
      });
    }

    console.log(`Pobrano pamięć użytkownika: ${userId}`);

    return res.json({
      found: true,
      memory: savedMemory
    });
  } catch (error) {
    console.error("Nieoczekiwany błąd get-memory:", error);

    return res.status(500).json({
      found: false,
      error: "Wewnętrzny błąd serwera."
    });
  }
});

// USUNIĘCIE PAMIĘCI
app.post("/delete-memory", async (req, res) => {
  try {
    const data = req.body || {};
    const userId = getUserId(data);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "user_id jest wymagany"
      });
    }

    const { error } = await supabase
      .from("student_memory")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Błąd delete-memory:", error);

      return res.status(500).json({
        success: false,
        error: "Nie udało się usunąć pamięci."
      });
    }

    console.log(`Usunięto pamięć użytkownika: ${userId}`);

    return res.json({
      success: true,
      message: "Pamięć ucznia została usunięta."
    });
  } catch (error) {
    console.error("Nieoczekiwany błąd delete-memory:", error);

    return res.status(500).json({
      success: false,
      error: "Wewnętrzny błąd serwera."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Stefcio memory API działa na porcie ${PORT}`);
});
