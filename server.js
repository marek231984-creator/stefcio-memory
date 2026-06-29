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

// ZAPIS PAMIĘCI UCZNIA JĘZYKOWEGO
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
language: data.language || "",
level: data.level || "",
last_lesson_topic: data.last_lesson_topic || "",
what_was_practiced: data.what_was_practiced || "",
words_to_review: data.words_to_review || "",
mistakes_to_review: data.mistakes_to_review || "",
next_lesson_plan: data.next_lesson_plan || "",
updated_at: new Date().toISOString()
};

res.json({
success: true,
message: "Pamięć ucznia została zapisana.",
saved: memory[userId]
});
});

// ODCZYT PAMIĘCI UCZNIA
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
message: "Brak zapisanej pamięci dla tego ucznia."
});
}

res.json({
found: true,
memory: savedMemory
});
});

// CZYSZCZENIE PAMIĘCI UCZNIA
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
message: "Pamięć ucznia została usunięta."
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

// TESTOWY ZAPIS PAMIĘCI
// Tylko do testów.
app.get("/test-save", (req, res) => {
const userId = "marek_001";

memory[userId] = {
user_id: userId,
name: "Marek",
language: "włoski",
level: "A1",
last_lesson_topic: "przedstawianie się",
what_was_practiced: "mówienie jak się nazywam, skąd jestem i po co uczę się włoskiego",
words_to_review: "mi chiamo, sono dalla Polonia, voglio imparare italiano",
mistakes_to_review: "wymowa gli, użycie sono",
next_lesson_plan: "ćwiczyć zamawianie w restauracji",
updated_at: new Date().toISOString()
};

res.json({
success: true,
message: "Testowa pamięć ucznia została zapisana.",
saved: memory[userId]
});
});

app.listen(PORT, () => {
console.log(`Stefcio memory API działa na porcie ${PORT}`);
});
