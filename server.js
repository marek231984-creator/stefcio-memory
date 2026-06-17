const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;

// Prosta pamiec w RAM - dobra do testu.
// Pozniej podmienimy na prawdziwa baze danych.
const memory = {};

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Stefcio memory API dziala"
  });
});

app.post("/save-memory", (req, res) => {
  const data = req.body || {};

  const userId =
    data.user_id ||
    data.userId ||
    data.name ||
    "default_user";

  memory[userId] = {
    user_id: userId,
    name: data.name || userId,
    italian_level: data.italian_level || "",
    last_lesson_topic: data.last_lesson_topic || "",
    words_to_review: data.words_to_review || "",
    mistakes_to_review: data.mistakes_to_review || "",
    next_lesson_plan: data.next_lesson_plan || "",
    updated_at: new Date().toISOString()
  };

  res.json({
    success: true,
    saved: memory[userId]
  });
});

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
      message: "Brak zapisanej pamieci dla tego uzytkownika."
    });
  }

  res.json({
    found: true,
    memory: savedMemory
  });
});

app.listen(PORT, () => {
  console.log(`Stefcio memory API dziala na porcie ${PORT}`);
});
