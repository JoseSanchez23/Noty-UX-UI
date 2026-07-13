// ==========================================
// DASHBOARD Y GESTIÓN DE NOTAS
// Mejoras UX: creación simplificada, búsqueda,
// filtros, orden, favoritos y eliminación segura.
// ==========================================

const notesList = document.querySelector("#notesList");
const notesSearch = document.querySelector("#notesSearch");
const notesFilter = document.querySelector("#notesFilter");
const notesSort = document.querySelector("#notesSort");
const notesCount = document.querySelector("#notesCount");
const noteTitle = document.querySelector("#noteTitle");
const noteEditor = document.querySelector("#noteEditor");
const messageElement = document.querySelector("#message");
const newNoteButton = document.querySelector("#newNoteButton");
const favoriteNoteButton = document.querySelector("#favoriteNoteButton");
const saveNoteButton = document.querySelector("#saveNoteButton");
const deleteNoteButton = document.querySelector("#deleteNoteButton");
const exportPdfButton = document.querySelector("#exportPdfButton");
const logoutButton = document.querySelector("#logoutButton");
const toolbar = document.querySelector(".toolbar");

const FAVORITES_KEY = "noty_favorite_notes";

let notes = [];
let selectedNoteId = null;
let favoriteNoteIds = loadFavoriteIds();

function showMessage(text, type = "info") {
  messageElement.textContent = text;
  messageElement.className = `message ${type}`;
}

function protectDashboard() {
  if (!getToken()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function loadFavoriteIds() {
  try {
    const storedFavorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return new Set(storedFavorites.map(String));
  } catch (error) {
    return new Set();
  }
}

function saveFavoriteIds() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favoriteNoteIds]));
}

function isFavorite(noteId) {
  return favoriteNoteIds.has(String(noteId));
}

function getPlainText(html) {
  const temporaryElement = document.createElement("div");
  temporaryElement.innerHTML = html || "";
  return temporaryElement.textContent.trim();
}

function formatDate(dateValue) {
  if (!dateValue) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateValue));
}

function updateFavoriteButton() {
  const hasSelectedNote = Boolean(selectedNoteId);
  const selectedIsFavorite = hasSelectedNote && isFavorite(selectedNoteId);

  favoriteNoteButton.disabled = !hasSelectedNote;
  favoriteNoteButton.setAttribute("aria-pressed", String(selectedIsFavorite));
  favoriteNoteButton.title = selectedIsFavorite
    ? "Quitar de favoritas"
    : "Marcar como favorita";

  favoriteNoteButton.classList.toggle("is-favorite", selectedIsFavorite);
}

function setEditor(note) {
  selectedNoteId = note ? note.id : null;
  noteTitle.value = note ? note.title : "";
  noteEditor.innerHTML = note ? note.content : "";

  deleteNoteButton.disabled = !note;
  exportPdfButton.disabled = !note;
  updateFavoriteButton();
  renderNotesList();

  if (!note) {
    noteTitle.focus();
    showMessage("Nueva nota lista. Escribe un título y contenido.", "info");
  }
}

function getVisibleNotes() {
  const query = notesSearch.value.trim().toLocaleLowerCase("es");
  const filter = notesFilter.value;
  const sort = notesSort.value;

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = !query ||
      note.title.toLocaleLowerCase("es").includes(query) ||
      getPlainText(note.content).toLocaleLowerCase("es").includes(query);

    const matchesFilter = filter !== "favorites" || isFavorite(note.id);
    return matchesSearch && matchesFilter;
  });

  return filteredNotes.sort((firstNote, secondNote) => {
    if (sort === "updated-asc") {
      return new Date(firstNote.updated_at) - new Date(secondNote.updated_at);
    }

    if (sort === "title-asc") {
      return firstNote.title.localeCompare(secondNote.title, "es");
    }

    if (sort === "title-desc") {
      return secondNote.title.localeCompare(firstNote.title, "es");
    }

    return new Date(secondNote.updated_at) - new Date(firstNote.updated_at);
  });
}

function renderNotesList() {
  notesList.innerHTML = "";
  const visibleNotes = getVisibleNotes();

  notesCount.textContent = `${visibleNotes.length} de ${notes.length} ${notes.length === 1 ? "nota" : "notas"}`;

  if (visibleNotes.length === 0) {
    const hasActiveSearchOrFilter = notesSearch.value.trim() || notesFilter.value !== "all";
    notesList.innerHTML = `<p class="empty-state">${
      hasActiveSearchOrFilter
        ? "No se encontraron notas con esos criterios."
        : "Aún no tienes notas. Crea la primera con el botón Nueva nota."
    }</p>`;
    return;
  }

  visibleNotes.forEach((note) => {
    const noteButton = document.createElement("button");
    noteButton.className = note.id === selectedNoteId ? "note-item active" : "note-item";
    noteButton.type = "button";
    noteButton.setAttribute("aria-label", `Abrir nota ${note.title}`);

    const titleRow = document.createElement("span");
    titleRow.className = "note-item-title";

    const title = document.createElement("strong");
    title.textContent = note.title;

    titleRow.appendChild(title);

    if (isFavorite(note.id)) {
      const favoriteIcon = document.createElement("span");
      favoriteIcon.className = "favorite-indicator";
      favoriteIcon.textContent = "★";
      favoriteIcon.title = "Nota favorita";
      favoriteIcon.setAttribute("aria-label", "Nota favorita");
      titleRow.appendChild(favoriteIcon);
    }

    const preview = document.createElement("span");
    preview.className = "note-preview";
    preview.textContent = getPlainText(note.content).slice(0, 70) || "Nota sin contenido";

    const date = document.createElement("span");
    date.className = "note-date";
    date.textContent = formatDate(note.updated_at);

    noteButton.append(titleRow, preview, date);
    noteButton.addEventListener("click", () => setEditor(note));
    notesList.appendChild(noteButton);
  });
}

async function loadNotes(preferredNoteId = selectedNoteId) {
  try {
    notes = await apiRequest("/notes");

    const validIds = new Set(notes.map((note) => String(note.id)));
    favoriteNoteIds = new Set([...favoriteNoteIds].filter((id) => validIds.has(id)));
    saveFavoriteIds();

    const preferredNote = notes.find((note) => String(note.id) === String(preferredNoteId));
    setEditor(preferredNote || notes[0] || null);
    showMessage(notes.length ? "Notas cargadas correctamente." : "Crea tu primera nota.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function setSavingState(isSaving) {
  saveNoteButton.disabled = isSaving;
  saveNoteButton.innerHTML = isSaving
    ? '<span aria-hidden="true">⏳</span> Guardando...'
    : '<i data-lucide="save" style="width:16px; height:16px;"></i> Guardar';
  if (window.lucide) lucide.createIcons();
}

async function saveNote() {
  const title = noteTitle.value.trim();
  const content = noteEditor.innerHTML.trim();
  const plainContent = getPlainText(content);

  if (!title) {
    showMessage("Escribe un título para guardar la nota.", "error");
    noteTitle.focus();
    return;
  }

  if (!plainContent) {
    showMessage("Escribe contenido antes de guardar la nota.", "error");
    noteEditor.focus();
    return;
  }

  setSavingState(true);
  showMessage("Guardando nota...", "info");

  try {
    let savedNoteId = selectedNoteId;

    if (selectedNoteId) {
      await apiRequest(`/notes/${selectedNoteId}`, {
        method: "PUT",
        body: JSON.stringify({ title, content })
      });
      showMessage("Nota actualizada correctamente.", "success");
    } else {
      const data = await apiRequest("/notes", {
        method: "POST",
        body: JSON.stringify({ title, content })
      });
      savedNoteId = data.note.id;
      showMessage("Nota creada correctamente.", "success");
    }

    await loadNotes(savedNoteId);
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setSavingState(false);
  }
}

async function deleteNote() {
  if (!selectedNoteId) {
    showMessage("Selecciona una nota antes de eliminar.", "error");
    return;
  }

  const selectedNote = notes.find((note) => String(note.id) === String(selectedNoteId));
  const noteName = selectedNote ? `“${selectedNote.title}”` : "esta nota";
  const confirmed = window.confirm(
    `¿Seguro que deseas eliminar ${noteName}? Esta acción no se puede deshacer.`
  );

  if (!confirmed) {
    showMessage("Eliminación cancelada.", "info");
    return;
  }

  deleteNoteButton.disabled = true;
  showMessage("Eliminando nota...", "info");

  try {
    await apiRequest(`/notes/${selectedNoteId}`, { method: "DELETE" });
    favoriteNoteIds.delete(String(selectedNoteId));
    saveFavoriteIds();
    selectedNoteId = null;
    await loadNotes();
    showMessage("Nota eliminada correctamente.", "success");
  } catch (error) {
    showMessage(error.message, "error");
    deleteNoteButton.disabled = false;
  }
}

function toggleFavorite() {
  if (!selectedNoteId) {
    showMessage("Guarda la nota antes de marcarla como favorita.", "error");
    return;
  }

  const noteId = String(selectedNoteId);

  if (favoriteNoteIds.has(noteId)) {
    favoriteNoteIds.delete(noteId);
    showMessage("Nota eliminada de favoritas.", "info");
  } else {
    favoriteNoteIds.add(noteId);
    showMessage("Nota marcada como favorita.", "success");
  }

  saveFavoriteIds();
  updateFavoriteButton();
  renderNotesList();
}

function applyFormat(command, value = null) {
  document.execCommand(command, false, value);
  noteEditor.focus();
}

function exportNoteToPdf() {
  if (!selectedNoteId) {
    showMessage("Selecciona una nota guardada antes de exportar.", "error");
    return;
  }

  const pdfContent = document.createElement("article");
  pdfContent.className = "pdf-note";

  const title = document.createElement("h1");
  title.textContent = noteTitle.value;

  const content = document.createElement("div");
  content.innerHTML = noteEditor.innerHTML;
  pdfContent.append(title, content);

  if (typeof html2pdf !== "function") {
    showMessage("No se pudo cargar la herramienta de exportación.", "error");
    return;
  }

  html2pdf()
    .set({
      margin: 12,
      filename: `${noteTitle.value.trim() || "noty-note"}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    })
    .from(pdfContent)
    .save()
    .then(() => showMessage("PDF exportado correctamente.", "success"))
    .catch(() => showMessage("No se pudo exportar el PDF.", "error"));
}

toolbar.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button) applyFormat(button.dataset.command, button.dataset.value || null);
});

newNoteButton.addEventListener("click", () => setEditor(null));
notesSearch.addEventListener("input", renderNotesList);
notesFilter.addEventListener("change", renderNotesList);
notesSort.addEventListener("change", renderNotesList);
favoriteNoteButton.addEventListener("click", toggleFavorite);
saveNoteButton.addEventListener("click", saveNote);
deleteNoteButton.addEventListener("click", deleteNote);
exportPdfButton.addEventListener("click", exportNoteToPdf);

noteTitle.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveNote();
  }
});

noteEditor.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveNote();
  }
});

logoutButton.addEventListener("click", () => {
  removeToken();
  window.location.href = "login.html";
});

if (protectDashboard()) {
  lucide.createIcons();
  loadNotes();
}
