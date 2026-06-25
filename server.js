const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;

// Prosta pamięć w RAM.
// Dobra do testów.
// Uwaga: po restarcie serwera pamięć się wyczyści.
const memory = {};

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Stefcio memory API działa"
  });
});

// ZAPIS PAMIĘCI
// Agent zapisuje, co i z kim było ćwiczone.
app.post("/save-memory", (req, res) => {
  const data = req.body || {};

  const userId =
    data.user_id ||
    data.userId ||
    data.name ||
    "default_user";

  memory[userId] = {
    user_id: userId,

    // Kto jest użytkownikiem / trenerem
    name: data.name || userId,

    // Z kim było ćwiczenie
    person_trained_with: data.person_trained_with || "",

    // Temat ćwiczenia
    exercise_topic: data.exercise_topic || "",

    // Co dokładnie było ćwiczone
    what_was_practiced: data.what_was_practiced || "",

    // Notatki po ćwiczeniu
    notes: data.notes || "",

    // Co Stefcio ma zaproponować następnym razem
    next_training_plan: data.next_training_plan || "",

    updated_at: new Date().toISOString()
  };

  res.json({
    success: true,
    message: "Pamięć treningu została zapisana.",
    saved: memory[userId]
  });
});

// ODCZYT PAMIĘCI
// Agent pyta, co wcześniej ćwiczył z daną osobą.
app.post("/get-memory", (req, res) => {
  const data = req.body || {};

  const userId =
    data.user_id ||
    data.userId ||
    data.name ||
    "default_user";

  const savedMemory = memory[userId];

  if (!savedMemory) {
    return res.json({
      found: false,
      message: "Brak zapisanej pamięci dla tego użytkownika."
    });
  }

  res.json({
    found: true,
    memory: savedMemory
  });
});

// CZYSZCZENIE PAMIĘCI
// Opcjonalnie: można usunąć pamięć jednej osoby.
app.post("/delete-memory", (req, res) => {
  const data = req.body || {};

  const userId =
    data.user_id ||
    data.userId ||
    data.name ||
    "default_user";

  if (!memory[userId]) {
    return res.json({
      success: false,
      message: "Nie znaleziono pamięci do usunięcia."
    });
  }

  delete memory[userId];

  res.json({
    success: true,
    message: "Pamięć została usunięta."
  });
});

// PODGLĄD CAŁEJ PAMIĘCI
// Tylko do testów.
app.get("/all-memory", (req, res) => {
  res.json({
    count: Object.keys(memory).length,
    memory
  });
});

app.listen(PORT, () => {
  console.log(`Stefcio memory API działa na porcie ${PORT}`);
});
