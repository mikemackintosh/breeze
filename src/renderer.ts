// src/renderer.ts
import CodeMirror from "codemirror";
import "codemirror/mode/markdown/markdown";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/ayu-mirage.css";
import "./styles/main.css";

// Define the ElectronAPI interface to match the exposed API from preload.ts
interface ElectronAPI {
  saveFile: (
    content: string,
    filePath: string | null
  ) => Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }>;
  openFile: () => Promise<{
    success: boolean;
    content?: string;
    filePath?: string;
    error?: string;
  }>;
  openFileByPath: (filePath: string) => Promise<{
    success: boolean;
    content?: string;
    filePath?: string;
    error?: string;
  }>;
  getAppInfo: () => Promise<{
    version: string;
    platform: string;
    appPath: string;
  }>;
  saveCharacter: (character: any) => Promise<any>;
  getCharacters: () => Promise<any>;
  saveLocation: (location: any) => Promise<any>;
  getLocations: () => Promise<any>;
  saveAsset: (asset: any) => Promise<any>;
  getAssets: () => Promise<any>;
  generateAIContent: (prompt: string, context: any) => Promise<any>;
  getConfig: () => Promise<any>;
  updateConfig: (config: any) => Promise<any>;
  getAIConfig: () => Promise<any>;
  updateAIConfig: (config: any) => Promise<any>;
  updateLastOpenedFile: (filePath: string) => Promise<boolean>;
  getLastOpenedFile: () => Promise<string>;
  getAutoLoadLastFile: () => Promise<boolean>;
  toggleAutoLoadLastFile: () => Promise<boolean>;
}

// Extend Window interface to include electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Application state
interface AppState {
  currentFilePath: string | null;
  isDirty: boolean;
  currentView: string;
  characters: Character[];
  locations: Location[];
  assets: Asset[];
  chapters: Chapter[];
  currentChapter: number | null;
}

interface Character {
  id: number;
  name: string;
  description: string;
  traits: string[];
  goals?: string;
  backstory?: string;
  relationships?: Array<{
    characterId: number;
    type: string;
    description: string;
  }>;
  originLocationId?: number;
  currentLocationId?: number;
  [key: string]: any; // For additional properties
}

interface Location {
  id: number;
  name: string;
  description: string;
  geography?: string;
  climate?: string;
  culture?: string;
  notes?: string;
  locationType?: "city" | "wilderness" | "landmark" | "building";
  connections?: Array<{
    locationId: number;
    type: string;
    description?: string;
  }>;
  [key: string]: any; // For additional properties
}

interface Asset {
  id: number;
  name: string;
  path: string;
  originalName?: string;
  [key: string]: any; // For additional properties
}

interface Chapter {
  id: number;
  title: string;
  content: string;
}

const state: AppState = {
  currentFilePath: null,
  isDirty: false,
  currentView: "editor",
  characters: [],
  locations: [],
  assets: [],
  chapters: [
    {
      id: 1,
      title: "Chapter 1",
      content: "# Chapter 1\n\nYour story begins here...",
    },
  ],
  currentChapter: 0,
};

// DOM Elements
let editor: CodeMirror.Editor;
const toolbarSections = document.querySelectorAll(".nav-item");
const editorContent = document.getElementById("editor-content") as HTMLElement;
const panelContent = document.getElementById("panel-content") as HTMLElement;
const fileInfo = document.getElementById("file-info") as HTMLElement;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const openBtn = document.getElementById("open-btn") as HTMLButtonElement;
const chaptersList = document.getElementById("chapters-list") as HTMLElement;
const addChapterBtn = document.getElementById(
  "add-chapter-btn"
) as HTMLButtonElement;

/**
 * Initializes the code editor
 */
function initializeEditor() {
  // Remove any existing content to prevent duplication
  editorContent.innerHTML = "";

  // Keep editor hidden unless we're in editor view
  if (state.currentView !== "editor") {
    editorContent.classList.add("hidden");
  }

  // Initialize CodeMirror
  editor = CodeMirror(editorContent, {
    mode: "markdown",
    theme: "ayu-mirage",
    lineWrapping: true,
    lineNumbers: true,
    autofocus: true,
    value: state.chapters[0].content,
    indentUnit: 2,
    tabSize: 2,
    smartIndent: true,
    scrollbarStyle: "native",
    fixedGutter: true,
    gutters: ["CodeMirror-linenumbers"],
    lineNumberFormatter: function (line) {
      return line.toString(); // Convert line number to string
    },
    viewportMargin: Infinity, // For better handling of dynamic content
    extraKeys: {
      Tab: function (cm) {
        if (cm.somethingSelected()) {
          cm.indentSelection("add");
        } else {
          cm.replaceSelection("  ", "end");
        }
      },
    },
  });

  // Force immediate refresh to ensure content is rendered
  setTimeout(() => {
    if (editor) {
      editor.refresh();
    }
  }, 10);

  // Tracks changes to mark file as dirty
  editor.on("change", () => {
    if (!state.isDirty) {
      state.isDirty = true;
      updateFileInfo();
    }

    // Updates the current chapter content
    if (state.currentChapter !== null) {
      state.chapters[state.currentChapter].content = editor.getValue();
    }
  });

  // Event listener for editor gaining focus
  editor.on("focus", () => {
    if (editor) {
      editor.refresh();
    }
  });
}

/**
 * Updates the file info display
 */
function updateFileInfo() {
  const filename = state.currentFilePath
    ? state.currentFilePath.split(/[/\\]/).pop()
    : "Untitled.story";

  fileInfo.textContent = `${filename}${state.isDirty ? " *" : ""}`;
}

/**
 * Analyzes chapter content to find mentioned characters and locations
 */
function findMentionedEntities(content: string): {
  characters: Character[];
  locations: Location[];
} {
  const text = content.toLowerCase();
  const mentionedCharacters: Character[] = [];
  const mentionedLocations: Location[] = [];

  // Find mentioned characters
  state.characters.forEach((character) => {
    if (text.includes(character.name.toLowerCase())) {
      mentionedCharacters.push(character);
    }
  });

  // Find mentioned locations
  state.locations.forEach((location) => {
    if (text.includes(location.name.toLowerCase())) {
      mentionedLocations.push(location);
    }
  });

  return { characters: mentionedCharacters, locations: mentionedLocations };
}

/**
 * Renders the chapters list
 */
function renderChaptersList() {
  chaptersList.innerHTML = "";

  state.chapters.forEach((chapter, index) => {
    const chapterEl = document.createElement("div");
    chapterEl.className = `chapter-item ${
      state.currentChapter === index ? "active" : ""
    }`;
    chapterEl.dataset.index = index.toString();
    chapterEl.draggable = true;

    // Get the first line of content as preview
    const previewText = getChapterPreviewText(chapter.content);

    // Create chapter content with title and preview
    const titleEl = document.createElement("div");
    titleEl.className = "chapter-title";
    titleEl.textContent = chapter.title;

    // Add chapter number as a "type" similar to location type
    const typeEl = document.createElement("div");
    typeEl.className = "location-type"; // Reuse the same styling
    typeEl.textContent = `Chapter ${index + 1}`;

    const previewEl = document.createElement("div");
    previewEl.className = "chapter-preview";
    previewEl.textContent = previewText;

    chapterEl.appendChild(titleEl);
    chapterEl.appendChild(typeEl);

    // Find mentioned characters and locations in this chapter
    const { characters, locations } = findMentionedEntities(chapter.content);

    // Add badges for mentioned entities if any exist
    if (characters.length > 0 || locations.length > 0) {
      const entitiesEl = document.createElement("div");
      entitiesEl.className = "chapter-entities";

      // Add character badges (limit to 3)
      characters.slice(0, 3).forEach((character) => {
        const displayName =
          character.name.length > 12
            ? character.name.substring(0, 10) + "..."
            : character.name;

        const badge = document.createElement("span");
        badge.className = "entity-badge character-badge";
        badge.textContent = displayName;
        badge.setAttribute("title", `Character: ${character.name}`);
        entitiesEl.appendChild(badge);
      });

      // Show count if there are more characters
      if (characters.length > 3) {
        const moreBadge = document.createElement("span");
        moreBadge.className = "entity-badge more-badge";
        moreBadge.textContent = `+${characters.length - 3} more`;
        moreBadge.setAttribute(
          "title",
          `${characters.length - 3} more characters`
        );
        entitiesEl.appendChild(moreBadge);
      }

      // Add location badges (limit to 3)
      locations.slice(0, 3).forEach((location) => {
        const displayName =
          location.name.length > 12
            ? location.name.substring(0, 10) + "..."
            : location.name;

        const badge = document.createElement("span");
        badge.className = "entity-badge location-badge";
        badge.textContent = displayName;
        badge.setAttribute("title", `Location: ${location.name}`);
        entitiesEl.appendChild(badge);
      });

      // Show count if there are more locations
      if (locations.length > 3) {
        const moreBadge = document.createElement("span");
        moreBadge.className = "entity-badge more-badge";
        moreBadge.textContent = `+${locations.length - 3} more`;
        moreBadge.setAttribute(
          "title",
          `${locations.length - 3} more locations`
        );
        entitiesEl.appendChild(moreBadge);
      }

      chapterEl.appendChild(entitiesEl);
    }

    chapterEl.appendChild(previewEl);

    chapterEl.addEventListener("click", () => {
      switchChapter(index);
    });

    // Drag and drop events for reordering
    chapterEl.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData("text/plain", index.toString());
      chapterEl.classList.add("dragging");
    });

    chapterEl.addEventListener("dragend", () => {
      chapterEl.classList.remove("dragging");
    });

    chapterEl.addEventListener("dragover", (e) => {
      e.preventDefault(); // Allow drop
    });

    chapterEl.addEventListener("drop", (e) => {
      e.preventDefault();
      const sourceIndex = parseInt(
        e.dataTransfer?.getData("text/plain") || "-1"
      );
      const targetIndex = index;

      if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
        reorderChapters(sourceIndex, targetIndex);
      }
    });

    // Right-click context menu for chapter
    chapterEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showChapterContextMenu(e, index);
    });

    chaptersList.appendChild(chapterEl);
  });
}

/**
 * Extract the first heading or line from chapter content for preview
 */
function getChapterPreviewText(content: string): string {
  // Extract first line of content (up to 50 chars)
  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  if (lines.length === 0) return "Empty chapter";

  // First try to get the first non-heading text
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip heading lines (# heading)
    if (!line.trim().startsWith("#")) {
      return line.trim().substring(0, 50) + (line.length > 50 ? "..." : "");
    }
  }

  // If no non-heading text found, return the first line
  return (
    lines[0]
      .replace(/^#+\s*/, "")
      .trim()
      .substring(0, 50) + (lines[0].length > 50 ? "..." : "")
  );
}

/**
 * Shows context menu for chapter operations
 */
function showChapterContextMenu(e: MouseEvent, chapterIndex: number) {
  // Remove any existing context menus
  document.querySelectorAll(".context-menu").forEach((menu) => menu.remove());

  // Create context menu
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.position = "absolute";
  menu.style.left = e.pageX + "px";
  menu.style.top = e.pageY + "px";

  // Add menu items
  const menuItems = [
    { label: "Rename", action: () => showRenameChapterDialog(chapterIndex) },
    {
      label: "Move Up",
      action: () => moveChapter(chapterIndex, chapterIndex - 1),
      disabled: chapterIndex === 0,
    },
    {
      label: "Move Down",
      action: () => moveChapter(chapterIndex, chapterIndex + 1),
      disabled: chapterIndex === state.chapters.length - 1,
    },
    { label: "Delete", action: () => confirmDeleteChapter(chapterIndex) },
  ];

  menuItems.forEach((item) => {
    const menuItem = document.createElement("div");
    menuItem.className = `context-menu-item ${item.disabled ? "disabled" : ""}`;
    menuItem.textContent = item.label;

    if (!item.disabled) {
      menuItem.addEventListener("click", () => {
        document
          .querySelectorAll(".context-menu")
          .forEach((menu) => menu.remove());
        item.action();
      });
    }

    menu.appendChild(menuItem);
  });

  // Add menu to document
  document.body.appendChild(menu);

  // Close menu on outside click
  document.addEventListener("click", function closeMenu(e) {
    if (!menu.contains(e.target as Node)) {
      menu.remove();
      document.removeEventListener("click", closeMenu);
    }
  });
}

/**
 * Reorders chapters using drag and drop
 */
function reorderChapters(sourceIndex: number, targetIndex: number) {
  // Store the current content of the edited chapter
  if (state.currentChapter !== null) {
    state.chapters[state.currentChapter].content = editor.getValue();
  }

  // Get the chapter being moved
  const chapter = state.chapters[sourceIndex];

  // Remove from original position
  state.chapters.splice(sourceIndex, 1);

  // Insert at new position
  state.chapters.splice(targetIndex, 0, chapter);

  // Update current chapter index if needed
  if (state.currentChapter === sourceIndex) {
    state.currentChapter = targetIndex;
  } else if (state.currentChapter !== null) {
    // Adjust current chapter index if the reordering affected its position
    if (
      sourceIndex < state.currentChapter &&
      targetIndex >= state.currentChapter
    ) {
      state.currentChapter--;
    } else if (
      sourceIndex > state.currentChapter &&
      targetIndex <= state.currentChapter
    ) {
      state.currentChapter++;
    }
  }

  // Re-render the list
  renderChaptersList();

  // Mark document as dirty
  state.isDirty = true;
  updateFileInfo();
}

/**
 * Moves a chapter up or down
 */
function moveChapter(currentIndex: number, newIndex: number) {
  if (newIndex < 0 || newIndex >= state.chapters.length) return;
  reorderChapters(currentIndex, newIndex);
}

/**
 * Shows dialog to rename a chapter
 */
function showRenameChapterDialog(chapterIndex: number) {
  const chapter = state.chapters[chapterIndex];
  if (!chapter) return;

  // Create modal overlay
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  document.body.appendChild(modalOverlay);

  // Create modal container
  const modal = document.createElement("div");
  modal.className = "modal rename-chapter-modal";
  modalOverlay.appendChild(modal);

  // Modal content
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Rename Chapter</h2>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label for="chapter-title">Chapter Title</label>
        <input type="text" id="chapter-title" value="${chapter.title}" required>
      </div>
    </div>
    <div class="modal-footer">
      <button id="cancel-btn" class="btn btn-secondary">Cancel</button>
      <button id="save-btn" class="btn btn-primary">Save</button>
    </div>
  `;

  // Handle close button
  const closeBtn = modal.querySelector(".modal-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle cancel button
  const cancelBtn = modal.querySelector("#cancel-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle save button
  const saveBtn = modal.querySelector("#save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const titleInput = document.getElementById(
        "chapter-title"
      ) as HTMLInputElement;
      if (titleInput && titleInput.value.trim()) {
        chapter.title = titleInput.value.trim();
        renderChaptersList();
        state.isDirty = true;
        updateFileInfo();
        document.body.removeChild(modalOverlay);
      }
    });
  }

  // Focus on title input
  setTimeout(() => {
    const titleInput = document.getElementById(
      "chapter-title"
    ) as HTMLInputElement;
    if (titleInput) {
      titleInput.focus();
      titleInput.select();
    }
  }, 100);
}

/**
 * Confirms and deletes a chapter
 */
function confirmDeleteChapter(chapterIndex: number) {
  if (state.chapters.length <= 1) {
    alert("You cannot delete the last remaining chapter.");
    return;
  }

  const chapter = state.chapters[chapterIndex];
  if (
    !confirm(
      `Are you sure you want to delete "${chapter.title}"? This cannot be undone.`
    )
  ) {
    return;
  }

  // Remove the chapter
  state.chapters.splice(chapterIndex, 1);

  // Update current chapter index if needed
  if (state.currentChapter === chapterIndex) {
    // Switch to previous chapter or first chapter if this was the first
    state.currentChapter = Math.max(0, chapterIndex - 1);
    if (editor) {
      editor.setValue(state.chapters[state.currentChapter].content);
    }
  } else if (
    state.currentChapter !== null &&
    state.currentChapter > chapterIndex
  ) {
    // Adjust current chapter index if a chapter before it was removed
    state.currentChapter--;
  }

  // Re-render the list
  renderChaptersList();

  // Mark document as dirty
  state.isDirty = true;
  updateFileInfo();
}

/**
 * Switches to a different chapter
 */
function switchChapter(index: number) {
  if (state.currentChapter === index) return;

  // Store current content before switching
  if (state.currentChapter !== null) {
    state.chapters[state.currentChapter].content = editor.getValue();
  }

  state.currentChapter = index;

  // Update editor with new content
  if (editor) {
    editor.setValue(state.chapters[index].content);

    // Place cursor at the beginning of the document
    editor.setCursor({ line: 2, ch: 0 });

    // Ensure focus on the editor
    editor.focus();
  }

  renderChaptersList();
}

/**
 * Adds a new chapter
 */
function addNewChapter() {
  // Store current content before creating new chapter
  if (state.currentChapter !== null) {
    state.chapters[state.currentChapter].content = editor.getValue();
  }

  const chapterNumber = state.chapters.length + 1;
  const newChapter: Chapter = {
    id: Date.now(),
    title: `Chapter ${chapterNumber}`,
    content: `# Chapter ${chapterNumber}\n\nContinue your story here...`,
  };

  state.chapters.push(newChapter);
  renderChaptersList();
  switchChapter(state.chapters.length - 1);
}

/**
 * Switches between different views (editor, characters, locations, etc.)
 */
function switchView(view: string) {
  // Store editor content if switching away from editor view
  if (
    state.currentView === "editor" &&
    view !== "editor" &&
    state.currentChapter !== null
  ) {
    state.chapters[state.currentChapter].content = editor.getValue();
  }

  // Update the current view
  state.currentView = view;

  // Updates active toolbar section
  toolbarSections.forEach((section) => {
    if (section.getAttribute("data-section") === view) {
      section.classList.add("nav-item-active");
    } else {
      section.classList.remove("nav-item-active");
    }
  });

  // Get chapter browser element
  const chapterBrowser = document.getElementById("chapter-browser");
  const sidebarTitle = document.querySelector("#chapter-browser h2");
  const addChapterBtn = document.getElementById("add-chapter-btn");

  // Hide all panels first
  editorContent.classList.add("hidden");
  editorContent.style.display = "none";
  panelContent.classList.add("hidden");
  
  // Hide all specific panels in the panel content
  document.querySelectorAll("#panel-content > div").forEach(panel => {
    panel.classList.add("hidden");
  });

  if (view === "editor") {
    // Show editor
    editorContent.classList.remove("hidden");
    editorContent.style.display = "block";

    // Refresh editor to ensure content is displayed properly
    if (editor) {
      editor.refresh();
    }

    // Show chapters sidebar
    if (chapterBrowser) {
      chapterBrowser.classList.remove("hidden");
    }
    if (sidebarTitle) {
      sidebarTitle.textContent = "Chapters";
    }
    if (addChapterBtn) {
      addChapterBtn.textContent = "+ Add";
      // Replace with original event listener
      const newBtn = addChapterBtn.cloneNode(true);
      addChapterBtn.parentNode?.replaceChild(newBtn, addChapterBtn);
      newBtn.addEventListener("click", addNewChapter);
    }

    // Render chapter list
    renderChaptersList();
  } else {
    // Show panel content but not the editor
    panelContent.classList.remove("hidden");
    
    // Show the specific panel for this view
    const specificPanel = document.getElementById(`${view}-panel`);
    if (specificPanel) {
      specificPanel.classList.remove("hidden");
    }

    // Update sidebar based on view
    if (view === "characters") {
      // Show character list in the sidebar
      if (chapterBrowser) {
        chapterBrowser.classList.remove("hidden");
      }
      if (sidebarTitle) {
        sidebarTitle.textContent = "Characters";
      }
      if (addChapterBtn) {
        addChapterBtn.textContent = "+ Add Character";
        // Replace with character dialog event listener
        const newBtn = addChapterBtn.cloneNode(true);
        addChapterBtn.parentNode?.replaceChild(newBtn, addChapterBtn);
        newBtn.addEventListener("click", () => {
          showCharacterDialog();
        });
      }

      // Render character list in sidebar
      renderCharactersList();
    } else if (view === "locations") {
      // Show locations list in the sidebar
      if (chapterBrowser) {
        chapterBrowser.classList.remove("hidden");
      }
      if (sidebarTitle) {
        sidebarTitle.textContent = "Locations";
      }
      if (addChapterBtn) {
        addChapterBtn.textContent = "+ Add Location";
        // Replace with location dialog event listener
        const newBtn = addChapterBtn.cloneNode(true);
        addChapterBtn.parentNode?.replaceChild(newBtn, addChapterBtn);
        newBtn.addEventListener("click", () => {
          showLocationDialog();
        });
      }

      // Render locations list in sidebar
      renderLocationsList();
    } else {
      // For other views, hide the chapter browser
      if (chapterBrowser) {
        chapterBrowser.classList.add("hidden");
      }
    }

    // Initialize panel content if needed
    renderPanelContent(view);
  }
}

/**
 * Initializes or updates content for different panels
 * Uses existing HTML structure in index.html instead of recreating it
 */
function renderPanelContent(panel: string) {
  // The panel structure exists in HTML, we just need to activate the specific panel
  // and add event listeners or dynamic content
  switch (panel) {
    case "characters":
      // Initialize character panel event listeners and data
      initializeCharactersPanel();
      break;
    case "locations":
      // Initialize locations panel event listeners and data
      initializeLocationsPanel();
      break;
    case "assets":
      // Initialize assets panel event listeners and data
      initializeAssetsPanel();
      break;
    case "ai":
      // Initialize AI panel event listeners and data
      initializeAIPanel();
      break;
    case "settings":
      // Initialize settings panel event listeners and data
      initializeSettingsPanel();
      break;
  }
}

/**
 * Renders the characters list in the sidebar
 */
function renderCharactersList() {
  const chaptersList = document.getElementById("chapters-list");
  if (!chaptersList) return;

  chaptersList.innerHTML =
    state.characters.length > 0
      ? state.characters
          .map(
            (char) => `
        <div class="character-item" data-id="${char.id}">
          <div class="character-name">${char.name}</div>
          <div class="character-preview">${
            char.description
              ? char.description.substring(0, 40) +
                (char.description.length > 40 ? "..." : "")
              : "No description"
          }</div>
        </div>
      `
          )
          .join("")
      : "<p class='no-items-msg'>No characters yet.</p>";

  // Add click handlers to character items
  const characterItems = document.querySelectorAll(".character-item");
  characterItems.forEach((item) => {
    item.addEventListener("click", () => {
      const characterId = parseInt(item.getAttribute("data-id") || "0", 10);
      if (characterId) {
        // Select the character and highlight in the graph
        selectCharacter(characterId);
        // Show character details
        showCharacterDetails(characterId);
      }
    });
  });
}

/**
 * Select a character and update UI
 */
function selectCharacter(characterId: number) {
  // Remove active class from all items
  document.querySelectorAll(".character-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Add active class to selected character
  const selectedItem = document.querySelector(
    `.character-item[data-id="${characterId}"]`
  );
  if (selectedItem) {
    selectedItem.classList.add("active");
  }
}

/**
 * Renders character details panel to show selected character details and relationships
 */
function renderCharacterDetails(characterId: number) {
  const character = state.characters.find((c) => c.id === characterId);
  if (!character) return;

  // Get the character details container
  const detailsContainer = document.createElement("div");
  detailsContainer.className = "character-detail-panel";

  // Get character relationships
  const relationships = character.relationships || [];

  // Get character locations
  const originLocation = character.originLocationId
    ? state.locations.find((l) => l.id === character.originLocationId)
    : null;
  const currentLocation = character.currentLocationId
    ? state.locations.find((l) => l.id === character.currentLocationId)
    : null;

  // Create the content
  detailsContainer.innerHTML = `
    <div class="character-detail-header">
      <h3>${character.name}</h3>
      <div class="character-actions">
        <button class="edit-character-btn" data-id="${
          character.id
        }">Edit</button>
      </div>
    </div>
    <div class="character-detail-body">
      <div class="detail-section">
        <h4>Description</h4>
        <p>${character.description || "No description provided."}</p>
      </div>
      
      ${
        character.traits && character.traits.length > 0
          ? `
      <div class="detail-section">
        <h4>Traits</h4>
        <div class="traits-list">
          ${character.traits
            .map((trait) => `<span class="trait-pill">${trait}</span>`)
            .join(" ")}
        </div>
      </div>
      `
          : ""
      }
      
      ${
        character.goals
          ? `
      <div class="detail-section">
        <h4>Goals</h4>
        <p>${character.goals}</p>
      </div>
      `
          : ""
      }
      
      ${
        character.backstory
          ? `
      <div class="detail-section">
        <h4>Backstory</h4>
        <p>${character.backstory}</p>
      </div>
      `
          : ""
      }
      
      <div class="detail-section">
        <h4>Locations</h4>
        <div class="character-locations">
          <div class="location-item">
            <span class="location-label">Origin:</span>
            <span class="location-value">${
              originLocation ? originLocation.name : "Unknown"
            }</span>
          </div>
          <div class="location-item">
            <span class="location-label">Current:</span>
            <span class="location-value">${
              currentLocation ? currentLocation.name : "Unknown"
            }</span>
          </div>
        </div>
      </div>
      
      <div class="detail-section">
        <div class="section-header">
          <h4>Relationships</h4>
          <button class="add-relationship-btn action-btn small" data-id="${
            character.id
          }">+ Add</button>
        </div>
        <div class="relationship-list">
          ${
            relationships.length > 0
              ? relationships
                  .map((rel) => {
                    const relatedCharacter = state.characters.find(
                      (c) => c.id === rel.characterId
                    );
                    return relatedCharacter
                      ? `
                <div class="relationship-item">
                  <div class="relationship-info">
                    <span class="relationship-type">${rel.type}:</span>
                    <span class="relationship-name">${
                      relatedCharacter.name
                    }</span>
                    ${
                      rel.description
                        ? `<span class="relationship-desc">${rel.description}</span>`
                        : ""
                    }
                  </div>
                  <div class="relationship-actions">
                    <button class="edit-relationship-btn" data-character="${
                      character.id
                    }" data-relationship="${
                          rel.characterId
                        }" title="Edit Relationship">✎</button>
                    <button class="remove-relationship-btn" data-character="${
                      character.id
                    }" data-relationship="${
                          rel.characterId
                        }" title="Remove Relationship">×</button>
                  </div>
                </div>
              `
                      : "";
                  })
                  .join("")
              : '<p class="empty-list">No relationships defined.</p>'
          }
        </div>
      </div>
    </div>
  `;

  // Create a modal to display the details
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  document.body.appendChild(modalOverlay);

  const modal = document.createElement("div");
  modal.className = "modal character-detail-modal";
  modalOverlay.appendChild(modal);
  modal.appendChild(detailsContainer);

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.className = "modal-close-btn";
  closeButton.innerHTML = "&times;";
  detailsContainer
    .querySelector(".character-detail-header")
    ?.appendChild(closeButton);

  closeButton.addEventListener("click", () => {
    document.body.removeChild(modalOverlay);
  });

  // Add event listeners for relationship management

  // Edit character button
  const editCharacterBtn = modal.querySelector(".edit-character-btn");
  if (editCharacterBtn) {
    editCharacterBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
      showCharacterDialog(characterId);
    });
  }

  // Add relationship button
  const addRelationshipBtn = modal.querySelector(".add-relationship-btn");
  if (addRelationshipBtn) {
    addRelationshipBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
      showRelationshipDialog(
        parseInt(addRelationshipBtn.getAttribute("data-id") || "0")
      );
    });
  }

  // Edit relationship buttons
  const editRelationshipBtns = modal.querySelectorAll(".edit-relationship-btn");
  editRelationshipBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const charId = parseInt(btn.getAttribute("data-character") || "0");
      const relatedCharId = parseInt(
        btn.getAttribute("data-relationship") || "0"
      );

      document.body.removeChild(modalOverlay);
      showRelationshipDialog(charId, relatedCharId);
    });
  });

  // Remove relationship buttons
  const removeRelationshipBtns = modal.querySelectorAll(
    ".remove-relationship-btn"
  );
  removeRelationshipBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const charId = parseInt(btn.getAttribute("data-character") || "0");
      const relatedCharId = parseInt(
        btn.getAttribute("data-relationship") || "0"
      );

      if (charId && relatedCharId) {
        document.body.removeChild(modalOverlay);
        removeCharacterRelationship(charId, relatedCharId);
      }
    });
  });
}

/**
 * Show character details in a modal
 */
function showCharacterDetails(characterId: number) {
  renderCharacterDetails(characterId);
}

/**
 * Initializes the characters panel
 * Uses existing HTML structure in index.html
 */
function initializeCharactersPanel() {
  const charactersPanel = document.getElementById("characters-panel");
  if (!charactersPanel) return;
  
  // Reference the existing HTML structure
  const addCharacterBtn = charactersPanel.querySelector(".btn-success");
  const characterGrid = document.getElementById("characters-grid");
  const relationshipGraph = document.getElementById("relationship-graph-container");
  
  // Set up the add character button
  if (addCharacterBtn) {
    // Reset event listeners
    const newAddBtn = addCharacterBtn.cloneNode(true);
    addCharacterBtn.parentNode?.replaceChild(newAddBtn, addCharacterBtn);
    
    // Add new event listener
    newAddBtn.addEventListener("click", () => {
      showCharacterDialog();
    });
  }
  
  // Create an add relationship button if it doesn't exist
  let addRelationshipBtn = charactersPanel.querySelector(".panel-header .panel-actions button");
  if (!addRelationshipBtn) {
    const panelActions = charactersPanel.querySelector(".panel-header .panel-actions");
    if (panelActions) {
      addRelationshipBtn = document.createElement("button");
      addRelationshipBtn.textContent = "Add Relationship";
      addRelationshipBtn.className = "action-btn app-region-no-drag";
      addRelationshipBtn.id = "add-relationship-btn";
      panelActions.appendChild(addRelationshipBtn);
    }
  }
  
  // Set up add relationship button
  if (addRelationshipBtn) {
    // Reset event listeners
    const newRelationshipBtn = addRelationshipBtn.cloneNode(true);
    addRelationshipBtn.parentNode?.replaceChild(newRelationshipBtn, addRelationshipBtn);
    
    // Add relationship button event
    newRelationshipBtn.addEventListener("click", () => {
      if (state.characters.length < 2) {
        alert("You need at least two characters to create a relationship.");
        return;
      }
      // Since we're creating a brand new relationship with no pre-selected character,
      // we'll use the first character as a default
      const defaultCharacterId =
        state.characters.length > 0 ? state.characters[0].id : 0;
      showRelationshipDialog(defaultCharacterId);
    });
  }
  
  // Update characters grid
  if (characterGrid) {
    if (state.characters.length > 0) {
      characterGrid.innerHTML = state.characters.map(char => `
        <div class="character-card" data-id="${char.id}">
          <h3>${char.name}</h3>
          <div class="character-role">${char.role || "Unknown"}</div>
          <p>${char.description ? char.description.substring(0, 100) + (char.description.length > 100 ? "..." : "") : "No description"}</p>
          <div class="character-traits">
            ${char.traits && char.traits.length > 0 ? 
              char.traits.slice(0, 3).map(trait => `<span class="badge">${trait}</span>`).join("") +
              (char.traits.length > 3 ? `<span class="badge badge-more">+${char.traits.length - 3}</span>` : "")
              : '<span class="empty-traits">No traits</span>'}
          </div>
        </div>
      `).join("");
      
      // Add click event to character cards
      document.querySelectorAll(".character-card").forEach(card => {
        card.addEventListener("click", () => {
          const id = parseInt(card.getAttribute("data-id") || "0");
          if (id) {
            showCharacterDetails(id);
          }
        });
      });
    } else {
      characterGrid.innerHTML = `<div class="empty-state col-span-3"><p>No characters created yet</p></div>`;
    }
  }
  
  // Initialize the relationship graph
  if (relationshipGraph) {
    if (state.characters.length > 0) {
      // Create SVG container if needed
      let graphSvgContainer = relationshipGraph.querySelector(".relationship-graph-svg");
      if (!graphSvgContainer) {
        // Clear the existing content first
        relationshipGraph.innerHTML = "";
        
        // Create graph container
        graphSvgContainer = document.createElement("div");
        graphSvgContainer.className = "relationship-graph-svg";
        relationshipGraph.appendChild(graphSvgContainer);
        
        // Add legend
        const legendDiv = document.createElement("div");
        legendDiv.className = "graph-legend";
        legendDiv.innerHTML = `
          <h3>Legend</h3>
          <div class="legend-item">
            <span class="legend-color friend"></span> Friend
          </div>
          <div class="legend-item">
            <span class="legend-color family"></span> Family
          </div>
          <div class="legend-item">
            <span class="legend-color rival"></span> Rival
          </div>
          <div class="legend-item">
            <span class="legend-color enemy"></span> Enemy
          </div>
        `;
        relationshipGraph.appendChild(legendDiv);
      }
      
      // Initialize the character graph
      initializeCharacterGraph();
    } else {
      relationshipGraph.innerHTML = "<div class='empty-state'>Add characters to start creating relationship connections</div>";
    }
  }
}

/**
 * Removes a relationship between characters
 */
async function removeCharacterRelationship(
  characterId: number,
  relatedCharacterId: number
) {
  // Find the character
  const character = state.characters.find((c) => c.id === characterId);
  if (!character || !character.relationships) return;

  // Ask for confirmation
  if (!confirm("Are you sure you want to remove this relationship?")) {
    return;
  }

  // Remove the relationship
  character.relationships = character.relationships.filter(
    (rel) => rel.characterId !== relatedCharacterId
  );

  try {
    // Save the character
    await window.electronAPI.saveCharacter(character);

    // Also check if there's a reverse relationship to remove
    const relatedCharacter = state.characters.find(
      (c) => c.id === relatedCharacterId
    );
    if (relatedCharacter && relatedCharacter.relationships) {
      relatedCharacter.relationships = relatedCharacter.relationships.filter(
        (rel) => rel.characterId !== characterId
      );

      await window.electronAPI.saveCharacter(relatedCharacter);
    }

    // Update the graph
    initializeCharacterGraph();

    // Show updated details
    showCharacterDetails(characterId);
  } catch (error) {
    console.error("Error removing relationship:", error);
    alert("Failed to remove the relationship.");
  }
}

/**
 * Shows a dialog to create or edit a relationship between characters
 */
function showRelationshipDialog(
  characterId: number,
  relatedCharacterId?: number
) {
  // Create modal overlay
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  document.body.appendChild(modalOverlay);

  // Create modal container
  const modal = document.createElement("div");
  modal.className = "modal relationship-modal";
  modalOverlay.appendChild(modal);

  // Find existing relationship if editing
  let existingRelationship = undefined;
  if (characterId && relatedCharacterId) {
    const character = state.characters.find((c) => c.id === characterId);
    if (character && character.relationships) {
      existingRelationship = character.relationships.find(
        (r) => r.characterId === relatedCharacterId
      );
    }
  }

  // Create relationship dialog content
  modal.innerHTML = `
    <div class="modal-header">
      <h2>${
        existingRelationship ? "Edit Relationship" : "Character Relationship"
      }</h2>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <form id="relationship-form">
        <div class="form-group">
          <label for="character1-select">First Character</label>
          <select id="character1-select" required ${
            characterId ? "disabled" : ""
          }>
            <option value="">Select a character</option>
            ${state.characters
              .map(
                (char) =>
                  `<option value="${char.id}" ${
                    char.id === characterId ? "selected" : ""
                  }>${char.name}</option>`
              )
              .join("")}
          </select>
        </div>
        
        <div class="form-group">
          <label for="relationship-type">Relationship Type</label>
          <select id="relationship-type" required>
            <option value="">Select relationship type</option>
            <option value="friend" ${
              existingRelationship?.type === "friend" ? "selected" : ""
            }>Friend</option>
            <option value="family" ${
              existingRelationship?.type === "family" ? "selected" : ""
            }>Family</option>
            <option value="rival" ${
              existingRelationship?.type === "rival" ? "selected" : ""
            }>Rival</option>
            <option value="enemy" ${
              existingRelationship?.type === "enemy" ? "selected" : ""
            }>Enemy</option>
            <option value="lover" ${
              existingRelationship?.type === "lover" ? "selected" : ""
            }>Lover</option>
            <option value="mentor" ${
              existingRelationship?.type === "mentor" ? "selected" : ""
            }>Mentor</option>
            <option value="colleague" ${
              existingRelationship?.type === "colleague" ? "selected" : ""
            }>Colleague</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="character2-select">Second Character</label>
          <select id="character2-select" required ${
            relatedCharacterId ? "disabled" : ""
          }>
            <option value="">Select a character</option>
            ${state.characters
              .filter((char) => char.id !== characterId) // Don't show the first character
              .map(
                (char) =>
                  `<option value="${char.id}" ${
                    char.id === relatedCharacterId ? "selected" : ""
                  }>${char.name}</option>`
              )
              .join("")}
          </select>
        </div>
        
        <div class="form-group">
          <label for="relationship-description">Description</label>
          <textarea id="relationship-description" rows="3" placeholder="Describe their relationship...">${
            existingRelationship?.description || ""
          }</textarea>
        </div>
        
        ${
          existingRelationship
            ? `
        <div class="form-group bidirectional-toggle">
          <label>
            <input type="checkbox" id="bidirectional-checkbox" checked>
            Also update in other direction (reciprocal relationship)
          </label>
        </div>
        `
            : ""
        }
      </form>
    </div>
    <div class="modal-footer">
      <button id="cancel-relationship-btn" class="btn">Cancel</button>
      <button id="save-relationship-btn" class="btn primary">Save Relationship</button>
    </div>
  `;

  // Handle close button
  const closeBtn = modal.querySelector(".modal-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle cancel button
  const cancelBtn = modal.querySelector("#cancel-relationship-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle save button
  const saveBtn = modal.querySelector("#save-relationship-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const char1Select = document.getElementById(
        "character1-select"
      ) as HTMLSelectElement;
      const char2Select = document.getElementById(
        "character2-select"
      ) as HTMLSelectElement;
      const relationshipTypeSelect = document.getElementById(
        "relationship-type"
      ) as HTMLSelectElement;
      const relationshipDescription = document.getElementById(
        "relationship-description"
      ) as HTMLTextAreaElement;
      const bidirectionalCheckbox = document.getElementById(
        "bidirectional-checkbox"
      ) as HTMLInputElement;

      const isBidirectional = bidirectionalCheckbox
        ? bidirectionalCheckbox.checked
        : true;

      // Validate form
      if (
        !char1Select.value ||
        !char2Select.value ||
        !relationshipTypeSelect.value
      ) {
        alert("Please select both characters and a relationship type.");
        return;
      }

      if (char1Select.value === char2Select.value) {
        alert("Please select two different characters.");
        return;
      }

      // Create relationship
      const char1Id = parseInt(char1Select.value);
      const char2Id = parseInt(char2Select.value);
      const relationType = relationshipTypeSelect.value;
      const description = relationshipDescription.value.trim();

      try {
        // Add/update relationship to the first character
        const char1 = state.characters.find((c) => c.id === char1Id);
        if (char1) {
          if (!char1.relationships) {
            char1.relationships = [];
          }

          // Check if relationship already exists
          const existingRelIdx = char1.relationships.findIndex(
            (r) => r.characterId === char2Id
          );

          if (existingRelIdx >= 0) {
            // Update existing relationship
            char1.relationships[existingRelIdx] = {
              characterId: char2Id,
              type: relationType,
              description,
            };
          } else {
            // Add new relationship
            char1.relationships.push({
              characterId: char2Id,
              type: relationType,
              description,
            });
          }

          // Save the character with the new relationship
          await window.electronAPI.saveCharacter(char1);

          // Optionally update the reciprocal relationship
          if (isBidirectional) {
            const char2 = state.characters.find((c) => c.id === char2Id);
            if (char2) {
              if (!char2.relationships) {
                char2.relationships = [];
              }

              // Check if reverse relationship already exists
              const existingReverseRelIdx = char2.relationships.findIndex(
                (r) => r.characterId === char1Id
              );

              if (existingReverseRelIdx >= 0) {
                // Update existing reverse relationship
                char2.relationships[existingReverseRelIdx] = {
                  characterId: char1Id,
                  type: relationType,
                  description,
                };
              } else {
                // Add new reverse relationship
                char2.relationships.push({
                  characterId: char1Id,
                  type: relationType,
                  description,
                });
              }

              await window.electronAPI.saveCharacter(char2);
            }
          }

          // Update the graph
          initializeCharacterGraph();

          // Close the modal and show updated details if appropriate
          document.body.removeChild(modalOverlay);

          // Show details of the first character
          if (characterId) {
            showCharacterDetails(characterId);
          }
        }
      } catch (error) {
        console.error("Error saving relationship:", error);
        alert("Failed to save the relationship.");
      }
    });
  }
}

/**
 * Shows character creation/edit dialog
 */
function showCharacterDialog(characterId?: number) {
  // Create modal overlay
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  document.body.appendChild(modalOverlay);

  // Create modal container
  const modal = document.createElement("div");
  modal.className = "modal character-modal";
  modalOverlay.appendChild(modal);

  let character: Character = {
    id: 0,
    name: "",
    description: "",
    traits: [],
    goals: "",
    backstory: "",
    relationships: [],
  };

  // If editing an existing character, load the data
  if (characterId) {
    const existingCharacter = state.characters.find(
      (c) => c.id === characterId
    );
    if (existingCharacter) {
      character = { ...existingCharacter };
    }
  }

  // Modal content
  modal.innerHTML = `
    <div class="modal-header">
      <h2>${characterId ? "Edit Character" : "Create New Character"}</h2>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <form id="character-form">
        <div class="form-group">
          <label for="character-name">Name</label>
          <input type="text" id="character-name" value="${
            character.name
          }" required>
        </div>
        
        <div class="form-group">
          <label for="character-description">Description</label>
          <textarea id="character-description" rows="3">${
            character.description
          }</textarea>
        </div>
        
        <div class="form-group">
          <label for="character-traits">Character Traits (comma separated)</label>
          <input type="text" id="character-traits" value="${
            Array.isArray(character.traits) ? character.traits.join(", ") : ""
          }">
        </div>
        
        <div class="form-group">
          <label for="character-goals">Goals and Motivations</label>
          <textarea id="character-goals" rows="3">${
            character.goals || ""
          }</textarea>
        </div>
        
        <div class="form-group">
          <label for="character-backstory">Backstory</label>
          <textarea id="character-backstory" rows="5">${
            character.backstory || ""
          }</textarea>
        </div>
        
        <div class="form-group">
          <label for="character-origin">Origin Location</label>
          <select id="character-origin">
            <option value="">Select a location...</option>
            ${state.locations
              .map(
                (loc) =>
                  `<option value="${loc.id}" ${
                    character.originLocationId === loc.id ? "selected" : ""
                  }>${loc.name}</option>`
              )
              .join("")}
          </select>
        </div>
        
        <div class="form-group">
          <label for="character-current-location">Current Location</label>
          <select id="character-current-location">
            <option value="">Select a location...</option>
            ${state.locations
              .map(
                (loc) =>
                  `<option value="${loc.id}" ${
                    character.currentLocationId === loc.id ? "selected" : ""
                  }>${loc.name}</option>`
              )
              .join("")}
          </select>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button id="cancel-character-btn" class="btn">Cancel</button>
      <button id="save-character-btn" class="btn primary">Save Character</button>
    </div>
  `;

  // Handle close button
  const closeBtn = modal.querySelector(".modal-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle cancel button
  const cancelBtn = modal.querySelector("#cancel-character-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle save button
  const saveBtn = modal.querySelector("#save-character-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      try {
        // Get form inputs directly from the modal container to avoid potential ID conflicts
        const nameInput = modal.querySelector(
          "#character-name"
        ) as HTMLInputElement;
        const descriptionInput = modal.querySelector(
          "#character-description"
        ) as HTMLTextAreaElement;
        const traitsInput = modal.querySelector(
          "#character-traits"
        ) as HTMLInputElement;
        const goalsInput = modal.querySelector(
          "#character-goals"
        ) as HTMLTextAreaElement;
        const backstoryInput = modal.querySelector(
          "#character-backstory"
        ) as HTMLTextAreaElement;

        // Validate name field with better error handling
        if (!nameInput) {
          console.error("Name input field not found in modal");
          alert("Error: Could not find name input field. Please try again.");
          return;
        }

        console.log("Character name input value:", nameInput.value);

        // Simple check for empty name
        if (!nameInput.value || nameInput.value.trim() === "") {
          alert("Character name is required");
          nameInput.focus();
          return;
        }

        // Get location selects directly from the modal
        const originLocationSelect = modal.querySelector(
          "#character-origin"
        ) as HTMLSelectElement;
        const currentLocationSelect = modal.querySelector(
          "#character-current-location"
        ) as HTMLSelectElement;

        // Prepare character data
        const updatedCharacter: Character = {
          id: character.id || Date.now(),
          name: nameInput.value.trim(),
          description: descriptionInput.value.trim(),
          traits: traitsInput.value
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t),
          goals: goalsInput.value.trim(),
          backstory: backstoryInput.value.trim(),
          relationships: character.relationships || [],
          originLocationId: originLocationSelect?.value
            ? parseInt(originLocationSelect.value)
            : undefined,
          currentLocationId: currentLocationSelect?.value
            ? parseInt(currentLocationSelect.value)
            : undefined,
        };

        try {
          // Save character
          const result = await window.electronAPI.saveCharacter(
            updatedCharacter
          );

          if (result.success) {
            // Update ID if new character
            updatedCharacter.id = result.id;

            // Update state
            if (characterId) {
              // Update existing character
              const index = state.characters.findIndex(
                (c) => c.id === characterId
              );
              if (index !== -1) {
                state.characters[index] = updatedCharacter;
              }
            } else {
              // Add new character
              state.characters.push(updatedCharacter);
            }

            // Re-render characters panel if currently visible
            if (state.currentView === "characters") {
              initializeCharactersPanel();
            }

            // Close modal
            document.body.removeChild(modalOverlay);
          } else {
            alert("Failed to save character");
          }
        } catch (error) {
          console.error("Error saving character:", error);
          alert(
            `Error saving character: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } catch (outerError) {
        console.error("Error in character form processing:", outerError);
        alert("An unexpected error occurred. Please try again.");
      }
    });
  }

  // Focus on name input
  setTimeout(() => {
    const nameInput = document.getElementById(
      "character-name"
    ) as HTMLInputElement;
    if (nameInput) {
      nameInput.focus();
    }
  }, 100);
}

/**
 * Initializes the character relationship graph
 */
function initializeCharacterGraph() {
  // Use relationship-graph-container which is the ID in the HTML
  const graphContainer = document.getElementById("relationship-graph-container");
  if (!graphContainer) return;

  // Clear any existing content
  graphContainer.innerHTML = "";

  if (state.characters.length === 0) {
    graphContainer.innerHTML =
      '<div class="empty-graph">Add characters to visualize relationships</div>';
    return;
  }

  // For this implementation, we'll create a simple visual representation
  // In a real implementation, you'd likely use a library like D3.js or Cytoscape.js

  // Create an SVG element for the graph
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 800 600");
  graphContainer.appendChild(svg);

  // Define character positions in a circle layout
  const centerX = 400;
  const centerY = 300;
  const radius = 200;
  const characterPositions: { [id: number]: { x: number; y: number } } = {};

  // Place characters in a circle
  state.characters.forEach((character, index) => {
    const angle = (index / state.characters.length) * 2 * Math.PI;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    characterPositions[character.id] = { x, y };

    // Create character node
    const charGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );

    // Character circle
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", x.toString());
    circle.setAttribute("cy", y.toString());
    circle.setAttribute("r", "30");
    circle.setAttribute("fill", "#2d2d2d");
    circle.setAttribute("stroke", "#666");
    circle.setAttribute("stroke-width", "2");
    circle.setAttribute("data-id", character.id.toString());
    circle.classList.add("character-node");

    // Character name
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x.toString());
    text.setAttribute("y", y.toString());
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dy", "0.3em");
    text.setAttribute("fill", "#fff");
    text.setAttribute("font-size", "12px");
    text.textContent = character.name.substring(0, 10);

    // Add hover and click events
    charGroup.addEventListener("mouseover", () => {
      circle.setAttribute("fill", "#3c3c3c");
      circle.setAttribute("stroke", "#9cdcfe");
    });

    charGroup.addEventListener("mouseout", () => {
      circle.setAttribute("fill", "#2d2d2d");
      circle.setAttribute("stroke", "#666");
    });

    charGroup.addEventListener("click", () => {
      selectCharacter(character.id);
      showCharacterDetails(character.id);
    });

    charGroup.appendChild(circle);
    charGroup.appendChild(text);
    svg.appendChild(charGroup);
  });

  // Draw relationship lines
  state.characters.forEach((character) => {
    if (character.relationships && character.relationships.length > 0) {
      character.relationships.forEach((rel) => {
        // Get positions
        const sourcePos = characterPositions[character.id];
        const targetPos = characterPositions[rel.characterId];

        if (sourcePos && targetPos) {
          // Create line
          const line = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
          );
          line.setAttribute("x1", sourcePos.x.toString());
          line.setAttribute("y1", sourcePos.y.toString());
          line.setAttribute("x2", targetPos.x.toString());
          line.setAttribute("y2", targetPos.y.toString());
          line.setAttribute("stroke", getRelationshipColor(rel.type));
          line.setAttribute("stroke-width", "2");

          // Add relationship type as tooltip
          const title = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "title"
          );
          title.textContent = `${character.name} → ${
            state.characters.find((c) => c.id === rel.characterId)?.name ||
            "Unknown"
          }: ${rel.type} ${rel.description ? "- " + rel.description : ""}`;

          line.appendChild(title);
          svg.insertBefore(line, svg.firstChild); // Add lines at the bottom layer
        }
      });
    }
  });

  console.log("Character graph initialized");
}

/**
 * Gets a color based on relationship type
 */
function getRelationshipColor(type: string): string {
  switch (type) {
    case "friend":
      return "#4CAF50"; // Green
    case "family":
      return "#2196F3"; // Blue
    case "rival":
      return "#FF9800"; // Orange
    case "enemy":
      return "#F44336"; // Red
    case "lover":
      return "#E91E63"; // Pink
    case "mentor":
      return "#9C27B0"; // Purple
    case "colleague":
      return "#607D8B"; // Blue-grey
    default:
      return "#CCCCCC"; // Gray
  }
}

/**
 * Renders the locations list in the sidebar
 */
function renderLocationsList() {
  const chaptersList = document.getElementById("chapters-list");
  if (!chaptersList) return;

  chaptersList.innerHTML =
    state.locations.length > 0
      ? state.locations
          .map(
            (location) => `
        <div class="location-item" data-id="${location.id}">
          <div class="location-name">${location.name}</div>
          <div class="location-type">${
            location.locationType ? location.locationType : "Unknown"
          }</div>
          <div class="location-preview">${
            location.description
              ? location.description.substring(0, 40) +
                (location.description.length > 40 ? "..." : "")
              : "No description"
          }</div>
        </div>
      `
          )
          .join("")
      : "<p class='no-items-msg'>No locations yet.</p>";

  // Add click handlers to location items
  const locationItems = document.querySelectorAll(".location-item");
  locationItems.forEach((item) => {
    item.addEventListener("click", () => {
      const locationId = parseInt(item.getAttribute("data-id") || "0", 10);
      if (locationId) {
        // Select the location
        selectLocation(locationId);
        // Show location details
        showLocationDetails(locationId);
      }
    });
  });
}

/**
 * Select a location and update UI
 */
function selectLocation(locationId: number) {
  // Remove active class from all items
  document.querySelectorAll(".location-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Add active class to selected location
  const selectedItem = document.querySelector(
    `.location-item[data-id="${locationId}"]`
  );
  if (selectedItem) {
    selectedItem.classList.add("active");
  }

  // Update the location details panel to show the selected location
  const detailsContainer = document.getElementById("selected-location-details");
  if (detailsContainer) {
    renderLocationDetails(locationId);
  }
}

/**
 * Show location details in the selected-location-details panel
 */
function showLocationDetails(locationId: number) {
  // Find the location
  const location = state.locations.find((l) => l.id === locationId);
  if (!location) return;

  // Just render the location details in the panel
  renderLocationDetails(locationId);
}

/**
 * Initializes the locations panel
 * Uses existing HTML structure in index.html
 */
function initializeLocationsPanel() {
  const locationsPanel = document.getElementById("locations-panel");
  if (!locationsPanel) return;
  
  // Reference existing HTML elements
  const addLocationBtn = locationsPanel.querySelector(".btn-success");
  const locationsList = document.getElementById("locations-list");
  const locationMapContainer = document.getElementById("location-map-container");
  const locationDetails = document.getElementById("location-details");
  const selectedLocationName = document.getElementById("selected-location-name");
  
  // Set up add location button
  if (addLocationBtn) {
    // Reset event listeners
    const newAddBtn = addLocationBtn.cloneNode(true);
    addLocationBtn.parentNode?.replaceChild(newAddBtn, addLocationBtn);
    
    // Add new event listener
    newAddBtn.addEventListener("click", () => {
      showLocationDialog();
    });
  }
  
  // Update locations list
  if (locationsList) {
    if (state.locations.length > 0) {
      locationsList.innerHTML = state.locations.map(location => `
        <div class="location-item" data-id="${location.id}">
          <div class="location-name">${location.name}</div>
          <div class="location-type ${location.locationType || 'unknown'}">${location.locationType || 'Unknown'}</div>
        </div>
      `).join("");
      
      // Add click event to location items
      document.querySelectorAll(".location-item").forEach(item => {
        item.addEventListener("click", () => {
          const id = parseInt(item.getAttribute("data-id") || "0");
          if (id) {
            // Select the location and show details
            selectLocation(id);
            
            // Update the name in the map header
            if (selectedLocationName) {
              const location = state.locations.find(l => l.id === id);
              if (location) {
                selectedLocationName.textContent = location.name;
              }
            }
            
            // Show location details
            if (locationDetails) {
              renderLocationDetailsToElement(id, locationDetails);
            }
          }
        });
      });
    } else {
      locationsList.innerHTML = `<div class="empty-state"><p>No locations created yet</p></div>`;
    }
  }
  
  // Initialize the location map visualization
  if (locationMapContainer && state.locations.length > 0) {
    // Clear existing content
    locationMapContainer.innerHTML = `<div id="location-map" class="location-map"></div>`;
    initializeLocationMap();
  } else if (locationMapContainer) {
    locationMapContainer.innerHTML = `<div class="empty-state">Add locations to start building your world map</div>`;
  }
  
  // Show empty detail state
  if (locationDetails && selectedLocationName) {
    selectedLocationName.textContent = "Select a Location";
    locationDetails.innerHTML = `<div class="empty-state"><p>Select a location to view details</p></div>`;
  }
}

/**
 * Renders location details to a specified element
 * Helper function for initializeLocationsPanel
 */
function renderLocationDetailsToElement(locationId: number, container: HTMLElement) {
  const location = state.locations.find(l => l.id === locationId);
  if (!location || !container) return;
  
  container.innerHTML = `
    <div class="location-detail">
      <div class="detail-section">
        <h4>Description</h4>
        <p>${location.description || "No description provided."}</p>
      </div>
      
      ${location.geography ? `
      <div class="detail-section">
        <h4>Geography</h4>
        <p>${location.geography}</p>
      </div>
      ` : ''}
      
      ${location.climate ? `
      <div class="detail-section">
        <h4>Climate</h4>
        <p>${location.climate}</p>
      </div>
      ` : ''}
      
      ${location.culture ? `
      <div class="detail-section">
        <h4>Culture</h4>
        <p>${location.culture}</p>
      </div>
      ` : ''}
      
      ${location.notes ? `
      <div class="detail-section">
        <h4>Notes</h4>
        <p>${location.notes}</p>
      </div>
      ` : ''}
      
      <div class="detail-section">
        <div class="section-header">
          <h4>Connected Locations</h4>
          <button class="add-connection-btn action-btn small" data-id="${location.id}">+ Add</button>
        </div>
        <div class="connection-list">
          ${location.connections && location.connections.length > 0 
            ? location.connections.map(conn => {
                const connectedLocation = state.locations.find(l => l.id === conn.locationId);
                return connectedLocation ? `
                  <div class="connection-item">
                    <div class="connection-info">
                      <span class="connection-type">${conn.type}:</span>
                      <span class="connection-name">${connectedLocation.name}</span>
                    </div>
                  </div>
                ` : '';
              }).join("")
            : '<p class="empty-list">No connections.</p>'
          }
        </div>
      </div>
      
      <div class="actions">
        <button class="btn edit-location-btn" data-id="${location.id}">Edit Location</button>
      </div>
    </div>
  `;
  
  // Add event listeners to buttons within the details
  const editBtn = container.querySelector(".edit-location-btn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const id = parseInt(editBtn.getAttribute("data-id") || "0");
      if (id) {
        showLocationDialog(id);
      }
    });
  }
  
  const addConnectionBtn = container.querySelector(".add-connection-btn");
  if (addConnectionBtn) {
    addConnectionBtn.addEventListener("click", () => {
      const id = parseInt(addConnectionBtn.getAttribute("data-id") || "0");
      if (id) {
        showLocationConnectionDialog(id);
      }
    });
  }
}

/**
 * Renders detailed view of a specific location
 */
function renderLocationDetails(locationId: number) {
  const location = state.locations.find((l) => l.id === locationId);
  if (!location) return;

  const detailsContainer = document.getElementById("selected-location-details");
  if (!detailsContainer) return;

  // Get connections for this location
  const connections = location.connections || [];

  detailsContainer.innerHTML = `
    <div class="location-detail-header">
      <h3>${location.name}</h3>
      <div class="location-actions">
        <button class="edit-btn action-btn" data-id="${
          location.id
        }">Edit</button>
      </div>
    </div>
    <div class="location-detail-body">
      <div class="detail-section">
        <h4>Description</h4>
        <p>${location.description || "No description provided."}</p>
      </div>
      
      ${
        location.geography
          ? `
      <div class="detail-section">
        <h4>Geography</h4>
        <p>${location.geography}</p>
      </div>
      `
          : ""
      }
      
      ${
        location.climate
          ? `
      <div class="detail-section">
        <h4>Climate</h4>
        <p>${location.climate}</p>
      </div>
      `
          : ""
      }
      
      ${
        location.culture
          ? `
      <div class="detail-section">
        <h4>Culture</h4>
        <p>${location.culture}</p>
      </div>
      `
          : ""
      }
      
      ${
        location.notes
          ? `
      <div class="detail-section">
        <h4>Notes</h4>
        <p>${location.notes}</p>
      </div>
      `
          : ""
      }
      
      <div class="detail-section">
        <div class="section-header">
          <h4>Connections</h4>
          <button class="add-connection-btn action-btn small" data-id="${
            location.id
          }">+ Add</button>
        </div>
        <div class="connection-list">
          ${
            connections.length > 0
              ? connections
                  .map((conn) => {
                    const connectedLocation = state.locations.find(
                      (l) => l.id === conn.locationId
                    );
                    return connectedLocation
                      ? `
                <div class="connection-item">
                  <div class="connection-info">
                    <span class="connection-type">${conn.type}:</span>
                    <span class="connection-name">${
                      connectedLocation.name
                    }</span>
                    ${
                      conn.description
                        ? `<span class="connection-desc">${conn.description}</span>`
                        : ""
                    }
                  </div>
                  <div class="connection-actions">
                    <button class="edit-connection-btn" data-location="${
                      location.id
                    }" data-connection="${
                          conn.locationId
                        }" title="Edit Connection">✎</button>
                    <button class="remove-connection-btn" data-location="${
                      location.id
                    }" data-connection="${
                          conn.locationId
                        }" title="Remove Connection">×</button>
                  </div>
                </div>
              `
                      : "";
                  })
                  .join("")
              : '<p class="empty-list">No connections.</p>'
          }
        </div>
      </div>
      
      <div class="detail-section">
        <div class="section-header">
          <h4>Characters</h4>
        </div>
        <div class="character-in-location-list">
          ${
            getCharactersAtLocation(location.id).length > 0
              ? getCharactersAtLocation(location.id)
                  .map(
                    (char) => `
              <div class="character-in-location-item">
                <span class="character-name">${char.name}</span>
                <span class="location-status">${
                  char.originLocationId === location.id &&
                  char.currentLocationId === location.id
                    ? "(Origin & Current)"
                    : char.originLocationId === location.id
                    ? "(Origin)"
                    : "(Current)"
                }</span>
              </div>
            `
                  )
                  .join("")
              : '<p class="empty-list">No characters at this location.</p>'
          }
        </div>
      </div>
    </div>
  `;

  // Add edit button event
  const editBtn = detailsContainer.querySelector(".edit-btn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      showLocationDialog(locationId);
    });
  }

  // Add connection button event
  const addConnectionBtn = detailsContainer.querySelector(
    ".add-connection-btn"
  );
  if (addConnectionBtn) {
    addConnectionBtn.addEventListener("click", () => {
      const locationId = parseInt(
        addConnectionBtn.getAttribute("data-id") || "0"
      );
      showLocationConnectionDialog(locationId);
    });
  }

  // Add edit connection button events
  const editConnectionBtns = detailsContainer.querySelectorAll(
    ".edit-connection-btn"
  );
  editConnectionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const locationId = parseInt(btn.getAttribute("data-location") || "0");
      const connectionId = parseInt(btn.getAttribute("data-connection") || "0");

      if (locationId && connectionId) {
        showLocationConnectionDialog(locationId, connectionId);
      }
    });
  });

  // Add remove connection button events
  const removeConnectionBtns = detailsContainer.querySelectorAll(
    ".remove-connection-btn"
  );
  removeConnectionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const locationId = parseInt(btn.getAttribute("data-location") || "0");
      const connectionId = parseInt(btn.getAttribute("data-connection") || "0");

      if (locationId && connectionId) {
        removeLocationConnection(locationId, connectionId);
      }
    });
  });
}

/**
 * Returns list of characters at a given location (either origin or current)
 */
function getCharactersAtLocation(locationId: number): Character[] {
  return state.characters.filter(
    (char) =>
      char.originLocationId === locationId ||
      char.currentLocationId === locationId
  );
}

/**
 * Removes a connection between locations
 */
async function removeLocationConnection(
  locationId: number,
  connectionId: number
) {
  // Find the location
  const location = state.locations.find((l) => l.id === locationId);
  if (!location || !location.connections) return;

  // Ask for confirmation
  if (!confirm("Are you sure you want to remove this connection?")) {
    return;
  }

  // Remove the connection
  location.connections = location.connections.filter(
    (conn) => conn.locationId !== connectionId
  );

  try {
    // Save the first location
    await window.electronAPI.saveLocation(location);

    // Also remove the connection from the other side
    const connectedLocation = state.locations.find(
      (l) => l.id === connectionId
    );
    if (connectedLocation && connectedLocation.connections) {
      connectedLocation.connections = connectedLocation.connections.filter(
        (conn) => conn.locationId !== locationId
      );

      await window.electronAPI.saveLocation(connectedLocation);
    }

    // Update the map and details
    initializeLocationMap();
    renderLocationDetails(locationId);
  } catch (error) {
    console.error("Error removing connection:", error);
    alert("Failed to remove the connection.");
  }
}

/**
 * Initializes the location map visualization
 */
function initializeLocationMap() {
  const mapContainer = document.getElementById("location-map");
  if (!mapContainer) return;

  // Clear any existing content
  mapContainer.innerHTML = "";

  if (state.locations.length === 0) {
    mapContainer.innerHTML =
      '<div class="empty-map">Add locations to visualize your world</div>';
    return;
  }

  // Create an SVG element for the map
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 800 600");
  mapContainer.appendChild(svg);

  // Define location positions in a grid layout
  const locationPositions: { [id: number]: { x: number; y: number } } = {};

  // Arrange locations in a grid pattern
  const cols = Math.ceil(Math.sqrt(state.locations.length));
  const cellWidth = 800 / (cols + 1);
  const cellHeight = 600 / (Math.ceil(state.locations.length / cols) + 1);

  state.locations.forEach((location, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    // Add some random offset to make it look more natural
    const offsetX = Math.random() * 40 - 20;
    const offsetY = Math.random() * 40 - 20;

    const x = (col + 1) * cellWidth + offsetX;
    const y = (row + 1) * cellHeight + offsetY;

    locationPositions[location.id] = { x, y };

    // Create location node
    const locGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );

    // Location circle/icon
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", x.toString());
    circle.setAttribute("cy", y.toString());
    circle.setAttribute("r", "25");
    circle.setAttribute("fill", getLocationColor(location.locationType));
    circle.setAttribute("stroke", "#666");
    circle.setAttribute("stroke-width", "2");
    circle.setAttribute("data-id", location.id.toString());
    circle.classList.add("location-node");

    // Location name
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x.toString());
    text.setAttribute("y", (y + 40).toString());
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "#fff");
    text.setAttribute("font-size", "12px");
    text.textContent = location.name;

    // Add hover and click events
    locGroup.addEventListener("mouseover", () => {
      circle.setAttribute(
        "fill",
        getLocationHighlightColor(location.locationType)
      );
      circle.setAttribute("stroke", "#9cdcfe");
    });

    locGroup.addEventListener("mouseout", () => {
      circle.setAttribute("fill", getLocationColor(location.locationType));
      circle.setAttribute("stroke", "#666");
    });

    locGroup.addEventListener("click", () => {
      selectLocation(location.id);
    });

    locGroup.appendChild(circle);
    locGroup.appendChild(text);
    svg.appendChild(locGroup);
  });

  // Draw connections between locations
  state.locations.forEach((location) => {
    if (location.connections && location.connections.length > 0) {
      location.connections.forEach((conn) => {
        // Get positions
        const sourcePos = locationPositions[location.id];
        const targetPos = locationPositions[conn.locationId];

        if (sourcePos && targetPos) {
          // Create connection line
          const line = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
          );
          line.setAttribute("x1", sourcePos.x.toString());
          line.setAttribute("y1", sourcePos.y.toString());
          line.setAttribute("x2", targetPos.x.toString());
          line.setAttribute("y2", targetPos.y.toString());
          line.setAttribute("stroke", getConnectionColor(conn.type));
          line.setAttribute("stroke-width", "2");

          // Add connection description as tooltip
          const title = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "title"
          );
          title.textContent = `${location.name} → ${
            state.locations.find((l) => l.id === conn.locationId)?.name ||
            "Unknown"
          }: ${conn.type} ${conn.description ? "- " + conn.description : ""}`;

          line.appendChild(title);
          svg.insertBefore(line, svg.firstChild); // Add lines at the bottom layer
        }
      });
    }
  });

  console.log("Location map initialized");
}

/**
 * Gets a color for location type
 */
function getLocationColor(type?: string): string {
  switch (type) {
    case "city":
      return "#4CAF50"; // Green
    case "wilderness":
      return "#795548"; // Brown
    case "landmark":
      return "#FFC107"; // Amber
    case "building":
      return "#607D8B"; // Blue Grey
    default:
      return "#9E9E9E"; // Grey
  }
}

/**
 * Gets a highlight color for location type
 */
function getLocationHighlightColor(type?: string): string {
  switch (type) {
    case "city":
      return "#81C784"; // Light Green
    case "wilderness":
      return "#A1887F"; // Light Brown
    case "landmark":
      return "#FFD54F"; // Light Amber
    case "building":
      return "#90A4AE"; // Light Blue Grey
    default:
      return "#BDBDBD"; // Light Grey
  }
}

/**
 * Gets a color for connection type
 */
function getConnectionColor(type: string): string {
  switch (type) {
    case "road":
      return "#8D6E63"; // Brown
    case "river":
      return "#42A5F5"; // Blue
    case "path":
      return "#FF9800"; // Orange
    case "border":
      return "#F44336"; // Red
    case "sea-route":
      return "#26C6DA"; // Cyan
    default:
      return "#9E9E9E"; // Grey
  }
}

/**
 * Shows dialog to create or edit a connection between locations
 * @param locationId Optional ID of the source location
 * @param connectedLocId Optional ID of the target location when editing an existing connection
 */
function showLocationConnectionDialog(
  locationId?: number,
  connectedLocId?: number
) {
  // Create modal overlay
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  document.body.appendChild(modalOverlay);

  // Create modal container
  const modal = document.createElement("div");
  modal.className = "modal connection-modal";
  modalOverlay.appendChild(modal);

  // Find existing connection if editing between specific locations
  let existingConnection:
    | { locationId: number; type: string; description?: string }
    | undefined = undefined;
  let connectedLocationId: number | undefined = connectedLocId;

  // If we have both source and target location IDs, we're likely editing an existing connection
  if (locationId && connectedLocId) {
    const location = state.locations.find((l) => l.id === locationId);
    if (location && location.connections && location.connections.length > 0) {
      // Look for the specific connection between these two locations
      existingConnection = location.connections.find(
        (conn) => conn.locationId === connectedLocId
      );
    }
  } else if (locationId) {
    // We just have the source location, we're creating a new connection from this location
    connectedLocationId = undefined;
    existingConnection = undefined;
  }

  // Create connection dialog content
  modal.innerHTML = `
    <div class="modal-header">
      <h2>${existingConnection ? "Edit Connection" : "Location Connection"}</h2>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <form id="connection-form">
        <div class="form-group">
          <label for="location1-select">First Location</label>
          <select id="location1-select" required ${
            locationId ? "disabled" : ""
          }>
            <option value="">Select a location</option>
            ${state.locations
              .map(
                (loc) =>
                  `<option value="${loc.id}" ${
                    loc.id === locationId ? "selected" : ""
                  }>${loc.name}</option>`
              )
              .join("")}
          </select>
        </div>
        
        <div class="form-group">
          <label for="connection-type">Connection Type</label>
          <select id="connection-type" required>
            <option value="">Select connection type</option>
            <option value="road" ${
              existingConnection?.type === "road" ? "selected" : ""
            }>Road</option>
            <option value="river" ${
              existingConnection?.type === "river" ? "selected" : ""
            }>River</option>
            <option value="path" ${
              existingConnection?.type === "path" ? "selected" : ""
            }>Path</option>
            <option value="border" ${
              existingConnection?.type === "border" ? "selected" : ""
            }>Border</option>
            <option value="sea-route" ${
              existingConnection?.type === "sea-route" ? "selected" : ""
            }>Sea Route</option>
            <option value="other" ${
              existingConnection?.type === "other" ? "selected" : ""
            }>Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="location2-select">Second Location</label>
          <select id="location2-select" required>
            <option value="">Select a location</option>
            ${state.locations
              .filter((loc) => !locationId || loc.id !== locationId) // Don't show the first location as an option
              .map(
                (loc) =>
                  `<option value="${loc.id}" ${
                    loc.id === connectedLocationId ? "selected" : ""
                  }>${loc.name}</option>`
              )
              .join("")}
          </select>
        </div>
        
        <div class="form-group">
          <label for="connection-description">Description</label>
          <textarea id="connection-description" rows="3" placeholder="Describe this connection...">${
            existingConnection?.description || ""
          }</textarea>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button id="cancel-connection-btn" class="btn">Cancel</button>
      <button id="save-connection-btn" class="btn primary">Save Connection</button>
    </div>
  `;

  // Handle close button
  const closeBtn = modal.querySelector(".modal-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle cancel button
  const cancelBtn = modal.querySelector("#cancel-connection-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle save button
  const saveBtn = modal.querySelector("#save-connection-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const loc1Select = document.getElementById(
        "location1-select"
      ) as HTMLSelectElement;
      const loc2Select = document.getElementById(
        "location2-select"
      ) as HTMLSelectElement;
      const connectionTypeSelect = document.getElementById(
        "connection-type"
      ) as HTMLSelectElement;
      const connectionDescription = document.getElementById(
        "connection-description"
      ) as HTMLTextAreaElement;

      // Validate form
      if (
        !loc1Select.value ||
        !loc2Select.value ||
        !connectionTypeSelect.value
      ) {
        alert("Please select both locations and a connection type.");
        return;
      }

      if (loc1Select.value === loc2Select.value) {
        alert("Please select two different locations.");
        return;
      }

      // Create connection
      const loc1Id = parseInt(loc1Select.value);
      const loc2Id = parseInt(loc2Select.value);
      const connType = connectionTypeSelect.value;
      const description = connectionDescription.value.trim();

      // Add connection to the first location
      const loc1 = state.locations.find((l) => l.id === loc1Id);
      if (loc1) {
        if (!loc1.connections) {
          loc1.connections = [];
        }

        // Check if connection already exists
        const existingConnIdx = loc1.connections.findIndex(
          (c) => c.locationId === loc2Id
        );

        if (existingConnIdx >= 0) {
          // Update existing connection
          loc1.connections[existingConnIdx] = {
            locationId: loc2Id,
            type: connType,
            description,
          };
        } else {
          // Add new connection
          loc1.connections.push({
            locationId: loc2Id,
            type: connType,
            description,
          });
        }

        // Save the location with the new connection
        window.electronAPI
          .saveLocation(loc1)
          .then(() => {
            // Also create the reverse connection for bidirectional navigation
            const loc2 = state.locations.find((l) => l.id === loc2Id);
            if (loc2) {
              if (!loc2.connections) {
                loc2.connections = [];
              }

              // Check if reverse connection already exists
              const existingReverseConnIdx = loc2.connections.findIndex(
                (c) => c.locationId === loc1Id
              );

              if (existingReverseConnIdx >= 0) {
                // Update existing reverse connection
                loc2.connections[existingReverseConnIdx] = {
                  locationId: loc1Id,
                  type: connType,
                  description,
                };
              } else {
                // Add new reverse connection
                loc2.connections.push({
                  locationId: loc1Id,
                  type: connType,
                  description,
                });
              }

              // Save the second location with the reverse connection
              return window.electronAPI.saveLocation(loc2);
            }
            return Promise.resolve({ success: true, id: loc1Id });
          })
          .then(() => {
            // Update the map
            initializeLocationMap();
            // Close the modal
            document.body.removeChild(modalOverlay);
          })
          .catch((error) => {
            console.error("Error saving connection:", error);
            alert("Failed to save the connection.");
          });
      }
    });
  }
}

/**
 * Ensures the locations panel is initialized before showing location details
 * This is especially important when adding a new location
 */
function ensureLocationsPanelInitialized() {
  // Check if we need to initialize the locations panel first
  const locationMap = document.getElementById("location-map");
  const detailsContainer = document.getElementById("selected-location-details");

  if (!locationMap || !detailsContainer) {
    // If the panel isn't initialized, render it first
    initializeLocationsPanel();
  }
}

/**
 * Shows location creation/edit dialog
 */
function showLocationDialog(locationId?: number) {
  // Make sure the locations panel is initialized
  // This is important when adding a location from the sidebar
  ensureLocationsPanelInitialized();

  // Create modal overlay
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  document.body.appendChild(modalOverlay);

  // Create modal container
  const modal = document.createElement("div");
  modal.className = "modal location-modal";
  modalOverlay.appendChild(modal);

  let location: Location = {
    id: 0,
    name: "",
    description: "",
    geography: "",
    climate: "",
    culture: "",
    notes: "",
  };

  // If editing an existing location, load the data
  if (locationId) {
    const existingLocation = state.locations.find((l) => l.id === locationId);
    if (existingLocation) {
      location = { ...existingLocation };
    }
  }

  // Modal content
  modal.innerHTML = `
    <div class="modal-header">
      <h2>${locationId ? "Edit Location" : "Create New Location"}</h2>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <form id="location-form">
        <div class="form-group">
          <label for="location-name">Name</label>
          <input type="text" id="location-name" value="${
            location.name
          }" required>
        </div>
        
        <div class="form-group">
          <label for="location-type">Location Type</label>
          <select id="location-type">
            <option value="" ${
              !location.locationType ? "selected" : ""
            }>Select a type...</option>
            <option value="city" ${
              location.locationType === "city" ? "selected" : ""
            }>City</option>
            <option value="wilderness" ${
              location.locationType === "wilderness" ? "selected" : ""
            }>Wilderness</option>
            <option value="landmark" ${
              location.locationType === "landmark" ? "selected" : ""
            }>Landmark</option>
            <option value="building" ${
              location.locationType === "building" ? "selected" : ""
            }>Building</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="location-description">Description</label>
          <textarea id="location-description" rows="3">${
            location.description || ""
          }</textarea>
        </div>
        
        <div class="form-group">
          <label for="location-geography">Geography</label>
          <textarea id="location-geography" rows="2">${
            location.geography || ""
          }</textarea>
        </div>
        
        <div class="form-group">
          <label for="location-climate">Climate</label>
          <textarea id="location-climate" rows="2">${
            location.climate || ""
          }</textarea>
        </div>
        
        <div class="form-group">
          <label for="location-culture">Culture</label>
          <textarea id="location-culture" rows="3">${
            location.culture || ""
          }</textarea>
        </div>
        
        <div class="form-group">
          <label for="location-notes">Notes</label>
          <textarea id="location-notes" rows="3">${
            location.notes || ""
          }</textarea>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button id="cancel-location-btn" class="btn">Cancel</button>
      <button id="save-location-btn" class="btn primary">Save Location</button>
    </div>
  `;

  // Handle close button
  const closeBtn = modal.querySelector(".modal-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle cancel button
  const cancelBtn = modal.querySelector("#cancel-location-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle save button
  const saveBtn = modal.querySelector("#save-location-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      try {
        // Get form inputs directly from the modal container to avoid potential ID conflicts
        const nameInput = modal.querySelector(
          "#location-name"
        ) as HTMLInputElement;
        const locationTypeSelect = modal.querySelector(
          "#location-type"
        ) as HTMLSelectElement;
        const descriptionInput = modal.querySelector(
          "#location-description"
        ) as HTMLTextAreaElement;
        const geographyInput = modal.querySelector(
          "#location-geography"
        ) as HTMLTextAreaElement;
        const climateInput = modal.querySelector(
          "#location-climate"
        ) as HTMLTextAreaElement;
        const cultureInput = modal.querySelector(
          "#location-culture"
        ) as HTMLTextAreaElement;
        const notesInput = modal.querySelector(
          "#location-notes"
        ) as HTMLTextAreaElement;

        // Validate name field with better error handling
        if (!nameInput) {
          console.error("Location name input field not found in modal");
          alert("Error: Could not find location name field. Please try again.");
          return;
        }

        console.log("Location name input value:", nameInput.value);

        // Simple check for empty name
        if (!nameInput.value || nameInput.value.trim() === "") {
          alert("Location name is required");
          nameInput.focus();
          return;
        }

        // Prepare location data
        const updatedLocation: Location = {
          id: location.id || Date.now(),
          name: nameInput.value.trim(),
          description: descriptionInput.value.trim(),
          geography: geographyInput ? geographyInput.value.trim() : "",
          climate: climateInput ? climateInput.value.trim() : "",
          culture: cultureInput ? cultureInput.value.trim() : "",
          notes: notesInput ? notesInput.value.trim() : "",
          locationType:
            (locationTypeSelect?.value as
              | "city"
              | "wilderness"
              | "landmark"
              | "building") || undefined,
          connections: location.connections || [],
        };

        // Save location
        const result = await window.electronAPI.saveLocation(updatedLocation);

        if (result.success) {
          // Update ID if new location
          updatedLocation.id = result.id;

          // Update state
          if (locationId) {
            // Update existing location
            const index = state.locations.findIndex((l) => l.id === locationId);
            if (index !== -1) {
              state.locations[index] = updatedLocation;
            }
          } else {
            // Add new location
            state.locations.push(updatedLocation);
          }

          // Re-render locations if currently visible
          if (state.currentView === "locations") {
            renderLocationsList();
            initializeLocationsPanel(); // First update the main panel
            renderLocationDetails(updatedLocation.id); // Then show the selected location details

            // Also select the location in the sidebar
            selectLocation(updatedLocation.id);
          }

          // Close modal
          document.body.removeChild(modalOverlay);
        } else {
          alert("Failed to save location");
        }
      } catch (error) {
        console.error("Error in location processing:", error);
        alert(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  // Focus on name input
  setTimeout(() => {
    const nameInput = document.getElementById(
      "location-name"
    ) as HTMLInputElement;
    if (nameInput) {
      nameInput.focus();
    }
  }, 100);
}

/**
 * Initializes the assets panel
 * Uses existing HTML structure in index.html
 */
function initializeAssetsPanel() {
  const assetsPanel = document.getElementById("assets-panel");
  if (!assetsPanel) return;
  
  // Reference existing HTML elements
  const addAssetBtn = assetsPanel.querySelector(".btn-success");
  const importBtn = assetsPanel.querySelector(".btn-secondary");
  const assetsGrid = document.getElementById("assets-grid");
  const assetTabs = document.querySelectorAll(".assets-tab");
  
  // Set up add asset button
  if (addAssetBtn) {
    // Reset event listeners
    const newAddBtn = addAssetBtn.cloneNode(true);
    addAssetBtn.parentNode?.replaceChild(newAddBtn, addAssetBtn);
    
    // Add new event listener
    newAddBtn.addEventListener("click", () => {
      showAssetDialog();
    });
  }
  
  // Set up import button
  if (importBtn) {
    // Reset event listeners
    const newImportBtn = importBtn.cloneNode(true);
    importBtn.parentNode?.replaceChild(newImportBtn, importBtn);
    
    // Add new event listener
    newImportBtn.addEventListener("click", () => {
      // Import assets dialog - would typically open file picker
      showAssetDialog('import');
    });
  }
  
  // Set up asset tabs
  assetTabs.forEach(tab => {
    // Clone to reset event listeners
    const newTab = tab.cloneNode(true);
    tab.parentNode?.replaceChild(newTab, tab);
    
    // Add tab switching functionality
    newTab.addEventListener("click", () => {
      // Remove active class from all tabs
      assetTabs.forEach(t => (t as HTMLElement).classList.remove("active"));
      
      // Add active class to clicked tab
      (newTab as HTMLElement).classList.add("active");
      
      // Here you would also filter the assets by type
      // For this example, we'll just update the grid with the same assets
      if (assetsGrid) {
        updateAssetsGrid(assetsGrid);
      }
    });
  });
  
  // Update assets grid
  if (assetsGrid) {
    updateAssetsGrid(assetsGrid);
  }
}

/**
 * Updates the assets grid with current asset data
 * Helper function for initializeAssetsPanel
 */
function updateAssetsGrid(container: HTMLElement) {
  if (!container) return;
  
  if (state.assets.length > 0) {
    container.innerHTML = state.assets.map(asset => `
      <div class="asset-item" data-id="${asset.id}">
        <div class="asset-preview">
          <img src="${asset.path}" alt="${asset.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZpbGUiPjxyZWN0IHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgeD0iMyIgeT0iMyIgcng9IjIiIHJ5PSIyIi8+PHBhdGggZD0iTTggOGg4Ii8+PHBhdGggZD0iTTggMTJoOCIvPjxwYXRoIGQ9Ik04IDE2aDgiLz48L3N2Zz4='">
        </div>
        <div class="asset-name">${asset.name}</div>
        <div class="asset-meta">${asset.originalName ? asset.originalName : asset.path.split('/').pop() || ''}</div>
      </div>
    `).join("");
    
    // Add click handler for assets
    const assetItems = container.querySelectorAll(".asset-item");
    assetItems.forEach(item => {
      item.addEventListener("click", () => {
        const id = parseInt(item.getAttribute("data-id") || "0");
        if (id) {
          showAssetDetails(id);
        }
      });
    });
  } else {
    container.innerHTML = `<div class="empty-state col-span-full"><p>No assets uploaded yet</p></div>`;
  }
}

/**
 * Shows asset details or launches import dialog
 */
function showAssetDialog(mode = 'add') {
  // In a real implementation, this would show a modal for asset import or creation
  if (mode === 'import') {
    console.log("Asset import dialog would open here");
    alert("Asset import functionality not yet implemented");
  } else {
    console.log("Add asset dialog would open here");
    alert("Add asset functionality not yet implemented");
  }
}

/**
 * Shows details for a specific asset
 */
function showAssetDetails(assetId: number) {
  const asset = state.assets.find(a => a.id === assetId);
  if (!asset) return;
  
  // In a real implementation, this would show a modal with asset details
  console.log("Showing details for asset:", asset);
  alert(`Asset details for ${asset.name} would be shown in a modal`);
}

// We've already defined a new version of this function above

// Define the interface for conversation history items
interface ConversationItem {
  id: string;
  prompt: string;
  response: string;
  timestamp: number;
  rawResponse?: string;
}

// Store conversation history
const conversationHistory: ConversationItem[] = [];

/**
 * Simple markdown renderer function without external dependencies
 */
function renderMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  // Store code blocks to replace later
  const codeBlocks: string[] = [];
  let processedMarkdown = markdown.replace(/```([\s\S]*?)```/g, (match) => {
    codeBlocks.push(match);
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
  });
  
  // Process inline code
  const inlineCodeBlocks: string[] = [];
  processedMarkdown = processedMarkdown.replace(/`([^`]+)`/g, (match, code) => {
    inlineCodeBlocks.push(code);
    return `___INLINE_CODE_${inlineCodeBlocks.length - 1}___`;
  });
  
  // Process headers
  processedMarkdown = processedMarkdown
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // Process bold and italic
  processedMarkdown = processedMarkdown
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Process lists
  const listItems = processedMarkdown.match(/^- (.*$)/gm);
  if (listItems) {
    for (const item of listItems) {
      processedMarkdown = processedMarkdown.replace(item, `<li>${item.slice(2)}</li>`);
    }
    processedMarkdown = processedMarkdown.replace(/<li>.*<\/li>/g, (match) => {
      if (match) {
        return '<ul>' + match + '</ul>';
      }
      return match;
    });
  }
  
  // Process numbered lists
  const numberedListItems = processedMarkdown.match(/^\d+\. (.*$)/gm);
  if (numberedListItems) {
    for (const item of numberedListItems) {
      const content = item.match(/^\d+\. (.*)$/);
      if (content && content[1]) {
        processedMarkdown = processedMarkdown.replace(item, `<li>${content[1]}</li>`);
      }
    }
    processedMarkdown = processedMarkdown.replace(/<li>.*<\/li>/g, (match) => {
      if (match) {
        return '<ol>' + match + '</ol>';
      }
      return match;
    });
  }
  
  // Process links
  processedMarkdown = processedMarkdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Process blockquotes
  processedMarkdown = processedMarkdown.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
  
  // Process paragraphs (any line that doesn't start with a special character)
  processedMarkdown = processedMarkdown
    .split('\n\n')
    .map(para => {
      // Skip if already has HTML tags
      if (para.trim().startsWith('<') && !para.trim().startsWith('<li>')) return para;
      
      return `<p>${para}</p>`;
    })
    .join('\n');
  
  // Replace back code blocks
  codeBlocks.forEach((block, index) => {
    const language = block.match(/```(\w+)/)?.[1] || '';
    const code = block.replace(/```(\w+)?/, '').replace(/```$/, '');
    processedMarkdown = processedMarkdown.replace(
      `___CODE_BLOCK_${index}___`,
      `<pre><code${language ? ` class="language-${language}"` : ''}>${code}</code></pre>`
    );
  });
  
  // Replace back inline code
  inlineCodeBlocks.forEach((code, index) => {
    processedMarkdown = processedMarkdown.replace(
      `___INLINE_CODE_${index}___`,
      `<code>${code}</code>`
    );
  });
  
  return processedMarkdown;
}

/**
 * Initializes the AI assistant panel
 * Uses existing HTML structure in index.html instead of creating it dynamically
 */
function initializeAIPanel() {
  // Make sure AI panel is visible - this is handled by switchView now
  
  // Update the right sidebar for conversation history
  const chapterBrowser = document.getElementById("chapter-browser");
  if (chapterBrowser) {
    // Update the sidebar header
    const sidebarTitle = chapterBrowser.querySelector("h2");
    if (sidebarTitle) {
      sidebarTitle.textContent = "Conversation History";
    }
    
    // Update the add button to be Clear History button
    const addBtn = chapterBrowser.querySelector("#add-chapter-btn");
    if (addBtn) {
      addBtn.textContent = "Clear All";
      addBtn.classList.remove("btn-success");
      addBtn.classList.add("btn-ghost");
      
      // Replace the button with a new one to reset event listeners
      const newBtn = addBtn.cloneNode(true);
      addBtn.parentNode?.replaceChild(newBtn, addBtn);
      
      // Add the new clear history event listener
      newBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear all conversation history?")) {
          conversationHistory.length = 0;
          renderConversationHistoryList();
        }
      });
    }
    
    // Show the sidebar
    chapterBrowser.classList.remove("hidden");
    
    // Render the conversation history
    const chaptersList = document.getElementById("chapters-list");
    if (chaptersList) {
      chaptersList.innerHTML = renderConversationHistory();
      addConversationItemListeners();
    }
  }
  
  // Get UI elements
  const aiSubmitBtn = document.getElementById("generate-ai-btn");
  const aiPromptInput = document.getElementById("ai-prompt") as HTMLTextAreaElement;
  const aiResponseDisplay = document.getElementById("ai-response-display");
  const renderedTab = document.getElementById("rendered-tab");
  const rawTab = document.getElementById("raw-tab");
  const aiResponseRaw = document.getElementById("ai-response-raw");
  
  // Set up tab switching
  if (renderedTab && rawTab && aiResponseRaw && aiResponseDisplay) {
    // Clone buttons to reset event listeners
    const newRenderedTab = renderedTab.cloneNode(true);
    const newRawTab = rawTab.cloneNode(true);
    
    renderedTab.parentNode?.replaceChild(newRenderedTab, renderedTab);
    rawTab.parentNode?.replaceChild(newRawTab, rawTab);
    
    // Add tab switching event listeners
    newRenderedTab.addEventListener("click", () => {
      (newRenderedTab as HTMLElement).classList.add("active");
      (newRawTab as HTMLElement).classList.remove("active");
      aiResponseDisplay.classList.remove("hidden");
      aiResponseRaw.classList.add("hidden");
    });
    
    newRawTab.addEventListener("click", () => {
      (newRawTab as HTMLElement).classList.add("active");
      (newRenderedTab as HTMLElement).classList.remove("active");
      aiResponseRaw.classList.remove("hidden");
      aiResponseDisplay.classList.add("hidden");
    });
  }

  // Set up generate button
  if (aiSubmitBtn && aiPromptInput && aiResponseDisplay && aiResponseRaw) {
    // Clone button to reset event listeners
    const newAiSubmitBtn = aiSubmitBtn.cloneNode(true);
    aiSubmitBtn.parentNode?.replaceChild(newAiSubmitBtn, aiSubmitBtn);
    
    // Add click handler for AI generation
    newAiSubmitBtn.addEventListener("click", async () => {
      const prompt = aiPromptInput.value.trim();
      if (!prompt) {
        return;
      }

      // Show generating message in both views
      aiResponseDisplay.innerHTML = "Generating...";
      aiResponseRaw.innerHTML = "Generating...";

      try {
        // Gets the current chapter content for context
        const currentChapterContent =
          state.currentChapter !== null
            ? state.chapters[state.currentChapter].content
            : "";

        // Extract character, location, and chapter references from the prompt
        const characterReferences = extractCharacterReferences(prompt);
        const locationReferences = extractLocationReferences(prompt);
        const chapterReferences = extractChapterReferences(prompt);

        // Create a cleaned prompt without the references
        const cleanedPrompt = cleanPromptReferences(prompt);

        // Show referenced entities if any
        const referencedContent = [];
        if (characterReferences.length > 0) {
          referencedContent.push(
            `Including context for characters: ${characterReferences
              .map((c) => c.name)
              .join(", ")}`
          );
        }
        if (locationReferences.length > 0) {
          referencedContent.push(
            `Including context for locations: ${locationReferences
              .map((l) => l.name)
              .join(", ")}`
          );
        }
        if (chapterReferences.length > 0) {
          referencedContent.push(
            `Including context for chapters: ${chapterReferences
              .map((c) => "#" + (c.index + 1))
              .join(", ")}`
          );
        }

        if (referencedContent.length > 0) {
          const referenceNotice = `<div class="reference-notice">${referencedContent.join(
            "<br>"
          )}</div>Generating...`;
          aiResponseDisplay.innerHTML = referenceNotice;
          aiResponseRaw.innerHTML = referenceNotice;
        }

        // Calls the AI service with the additional context
        const response = await window.electronAPI.generateAIContent(
          cleanedPrompt,
          {
            currentChapter: currentChapterContent,
            characters: state.characters,
            locations: state.locations,
            referencedCharacters: characterReferences,
            referencedLocations: locationReferences,
            referencedChapters: chapterReferences,
          }
        );

        // Store raw response
        const rawResponse = response.content;
        
        // Render markdown for the rendered view
        const renderedHtml = renderMarkdown(rawResponse);
        
        // Display the responses in their respective panels
        aiResponseDisplay.innerHTML = `<div class="markdown-content">${renderedHtml}</div>`;
        aiResponseRaw.innerText = rawResponse; // Use innerText to preserve formatting
        
        // Make sure the correct tab is visible
        if (renderedTab && renderedTab.classList.contains("active")) {
          aiResponseDisplay.classList.remove("hidden");
          aiResponseRaw.classList.add("hidden");
        } else {
          aiResponseRaw.classList.remove("hidden");
          aiResponseDisplay.classList.add("hidden");
        }

        // Add the conversation to history
        const conversationItem: ConversationItem = {
          id: Date.now().toString(),
          prompt: prompt,
          response: renderedHtml,
          rawResponse: rawResponse,
          timestamp: Date.now(),
        };
        
        // Add to beginning of array so newest is first
        conversationHistory.unshift(conversationItem);
        
        // Re-render the conversation history in the chapter browser
        renderConversationHistoryList();
        
        // Make the newest item active
        const chaptersList = document.getElementById("chapters-list");
        if (chaptersList && chaptersList.firstElementChild) {
          // Remove active from all
          document.querySelectorAll(".chapter-item").forEach(item => {
            item.classList.remove("active");
          });
          
          // Add active to first (newest) item
          if (chaptersList.firstElementChild.classList.contains("chapter-item")) {
            chaptersList.firstElementChild.classList.add("active");
          }
        }

        // Adds a button to insert the generated content
        const insertBtn = document.createElement("button");
        insertBtn.textContent = "Insert into Editor";
        insertBtn.classList.add("insert-ai-btn", "action-btn");
        insertBtn.addEventListener("click", () => {
          // Inserts the raw AI-generated text at the cursor position
          const doc = editor.getDoc();
          const cursor = doc.getCursor();
          doc.replaceRange(rawResponse, cursor);

          // Switches back to editor view
          switchView("editor");
        });

        // Add insert button to both views
        const insertBtnCopy = insertBtn.cloneNode(true) as HTMLButtonElement;
        insertBtnCopy.addEventListener("click", () => {
          const doc = editor.getDoc();
          const cursor = doc.getCursor();
          doc.replaceRange(rawResponse, cursor);
          switchView("editor");
        });
        
        aiResponseDisplay.appendChild(insertBtn);
        aiResponseRaw.appendChild(insertBtnCopy);
        
        // Clear the prompt input
        aiPromptInput.value = "";
      } catch (error) {
        const errorMsg = `Error: ${error instanceof Error ? error.message : String(error)}`;
        aiResponseDisplay.innerHTML = errorMsg;
        aiResponseRaw.innerHTML = errorMsg;
      }
    });
  }
  
  // Add event listeners to conversation history items
  addConversationItemListeners();
}

/**
 * Renders the conversation history list HTML
 */
function renderConversationHistory(): string {
  if (conversationHistory.length === 0) {
    return `
      <div class="empty-state">
        <p>Your conversation history will appear here</p>
      </div>
    `;
  }
  
  return conversationHistory
    .map(item => {
      const promptPreview = item.prompt.length > 40 
        ? item.prompt.substring(0, 40) + "..." 
        : item.prompt;
        
      const date = new Date(item.timestamp);
      const formattedDate = date.toLocaleDateString();
      
      return `
        <div class="chapter-item conversation-item" data-id="${item.id}">
          <div class="chapter-title">${promptPreview}</div>
          <div class="chapter-preview">${formattedDate}</div>
        </div>
      `;
    })
    .join("");
}

/**
 * Re-renders just the conversation history list
 */
function renderConversationHistoryList() {
  const chaptersList = document.getElementById("chapters-list");
  if (chaptersList) {
    chaptersList.innerHTML = renderConversationHistory();
    addConversationItemListeners();
  }
}

/**
 * Adds event listeners to conversation history items
 */
function addConversationItemListeners() {
  const conversationItems = document.querySelectorAll(".chapter-item.conversation-item");
  conversationItems.forEach(item => {
    item.addEventListener("click", () => {
      const id = item.getAttribute("data-id");
      if (id) {
        const conversation = conversationHistory.find(c => c.id === id);
        if (conversation) {
          // Mark this item as active
          document.querySelectorAll(".chapter-item").forEach(item => {
            item.classList.remove("active");
          });
          item.classList.add("active");
          
          // Display the conversation in the main panel
          const aiResponseDisplay = document.getElementById("ai-response-display");
          const aiResponseRaw = document.getElementById("ai-response-raw");
          const aiPromptInput = document.getElementById("ai-prompt") as HTMLTextAreaElement;
          const renderedTab = document.getElementById("rendered-tab");
          const rawTab = document.getElementById("raw-tab");
          
          if (aiResponseDisplay && aiResponseRaw && aiPromptInput) {
            // Set the prompt
            aiPromptInput.value = conversation.prompt;
            
            // Set the rendered response (in a markdown content container)
            aiResponseDisplay.innerHTML = `<div class="markdown-content">${conversation.response}</div>`;
            
            // Set the raw response
            if (conversation.rawResponse) {
              aiResponseRaw.innerText = conversation.rawResponse;
            } else {
              // If no raw response stored (for backwards compatibility)
              aiResponseRaw.innerText = conversation.response.replace(/<[^>]*>/g, '');
            }
            
            // Make sure the correct tab is active and visible
            if (renderedTab && rawTab) {
              if (renderedTab.classList.contains("active")) {
                aiResponseDisplay.classList.remove("hidden");
                aiResponseRaw.classList.add("hidden");
              } else {
                aiResponseRaw.classList.remove("hidden");
                aiResponseDisplay.classList.add("hidden");
              }
            }
            
            // Add insert button to the rendered view
            const insertBtn = document.createElement("button");
            insertBtn.textContent = "Insert into Editor";
            insertBtn.classList.add("insert-ai-btn", "action-btn");
            insertBtn.addEventListener("click", () => {
              // Inserts the AI-generated text at the cursor position (prefer raw)
              const doc = editor.getDoc();
              const cursor = doc.getCursor();
              const textToInsert = conversation.rawResponse || conversation.response.replace(/<[^>]*>/g, '');
              doc.replaceRange(textToInsert, cursor);

              // Switches back to editor view
              switchView("editor");
            });
            
            // Add insert button to raw view as well
            const insertBtnRaw = insertBtn.cloneNode(true) as HTMLButtonElement;
            insertBtnRaw.addEventListener("click", () => {
              const doc = editor.getDoc();
              const cursor = doc.getCursor();
              const textToInsert = conversation.rawResponse || conversation.response.replace(/<[^>]*>/g, '');
              doc.replaceRange(textToInsert, cursor);
              switchView("editor");
            });

            aiResponseDisplay.appendChild(insertBtn);
            aiResponseRaw.appendChild(insertBtnRaw);
          }
        }
      }
    });
  });
}

/**
 * Extracts character references (using @ notation) from the prompt
 */
function extractCharacterReferences(prompt: string): any[] {
  const references: any[] = [];
  const regex = /@(\w+)/g;
  let match;

  while ((match = regex.exec(prompt)) !== null) {
    const characterName = match[1];
    // Search for character by name (case insensitive)
    const character = state.characters.find(
      (c) =>
        c.name.toLowerCase() === characterName.toLowerCase() ||
        c.name.toLowerCase().includes(characterName.toLowerCase())
    );

    if (character && !references.some((c) => c.id === character.id)) {
      references.push(character);
    }
  }

  return references;
}

/**
 * Extracts location references (using @ notation) from the prompt
 */
function extractLocationReferences(prompt: string): any[] {
  const references: any[] = [];
  const regex = /@(\w+)/g;
  let match;

  while ((match = regex.exec(prompt)) !== null) {
    const locationName = match[1];
    // Search for location by name (case insensitive)
    const location = state.locations.find(
      (l) =>
        l.name.toLowerCase() === locationName.toLowerCase() ||
        l.name.toLowerCase().includes(locationName.toLowerCase())
    );

    if (location && !references.some((l) => l.id === location.id)) {
      references.push(location);
    }
  }

  return references;
}

/**
 * Extracts chapter references (using # notation) from the prompt
 */
function extractChapterReferences(prompt: string): any[] {
  const references: any[] = [];
  const regex = /#(\d+)/g;
  let match;

  while ((match = regex.exec(prompt)) !== null) {
    const chapterNumber = parseInt(match[1], 10);
    if (chapterNumber > 0 && chapterNumber <= state.chapters.length) {
      // Convert from 1-based to 0-based index
      const chapter = state.chapters[chapterNumber - 1];
      if (chapter && !references.some((c) => c.index === chapterNumber - 1)) {
        references.push({ ...chapter, index: chapterNumber - 1 });
      }
    }
  }

  return references;
}

/**
 * Cleans the prompt by removing reference markers
 */
function cleanPromptReferences(prompt: string): string {
  // Remove character/location references
  let cleaned = prompt.replace(/@\w+/g, (match) => {
    // Replace with just the name without @
    return match.substring(1);
  });

  // Remove chapter references
  cleaned = cleaned.replace(/#\d+/g, (match) => {
    // Replace with just "Chapter X"
    return `Chapter ${match.substring(1)}`;
  });

  return cleaned;
}

/**
 * Auto-save timer ID
 */
let autoSaveTimerId: number | null = null;

/**
 * Saves the current document
 * @param silent If true, won't show any success/error messages (for auto-save)
 * @param saveAs If true, shows save dialog even if file already exists
 */
async function saveDocument(silent = false, saveAs = false) {
  try {
    // Skip saving if there's no content to save or it's not dirty (unless it's a save-as)
    if (state.chapters.length === 0 || (!state.isDirty && !saveAs)) {
      return { success: true };
    }

    // Creates a document object with all story data
    const document = {
      version: 1,
      title: state.currentFilePath
        ? state.currentFilePath.split(/[/\\]/).pop()?.replace(".story", "") ||
          "Untitled"
        : "Untitled",
      chapters: state.chapters,
      characters: state.characters,
      locations: state.locations,
      assets: state.assets,
    };

    // For saveAs, we force a new save dialog by passing null as filePath
    const filePath = saveAs ? null : state.currentFilePath;

    const result = await window.electronAPI.saveFile(
      JSON.stringify(document, null, 2),
      filePath
    );

    if (result.success) {
      state.currentFilePath = result.filePath || null;
      state.isDirty = false;
      updateFileInfo();

      // Save the file path as the last opened file
      if (state.currentFilePath) {
        window.electronAPI.updateLastOpenedFile(state.currentFilePath);
      }

      if (!silent) {
        console.log("Document saved successfully");
      }
    } else {
      console.error("Failed to save file:", result.error);
      if (!silent) {
        alert("Failed to save file: " + (result.error || "Unknown error"));
      }
    }

    return result;
  } catch (error) {
    console.error("Error saving file:", error);
    if (!silent) {
      alert(
        "Error saving file: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
    return { success: false, error };
  }
}

/**
 * Sets up auto-save functionality
 */
async function setupAutoSave() {
  try {
    // Clear any existing auto-save timer
    if (autoSaveTimerId !== null) {
      window.clearInterval(autoSaveTimerId);
      autoSaveTimerId = null;
    }

    // Get auto-save interval from config (in minutes)
    const config = await window.electronAPI.getConfig();
    const autoSaveIntervalMinutes = config.autosaveInterval || 5;

    // Convert minutes to milliseconds (if interval is 0, disable auto-save)
    if (autoSaveIntervalMinutes <= 0) {
      console.log("Auto-save disabled");
      return;
    }

    const intervalMs = autoSaveIntervalMinutes * 60 * 1000;

    // Set up new auto-save timer
    autoSaveTimerId = window.setInterval(async () => {
      if (state.isDirty && state.currentFilePath) {
        // Auto-save silently if we have a file path
        console.log("Auto-saving document...");
        await saveDocument(true);
      }
    }, intervalMs);

    console.log(`Auto-save enabled (every ${autoSaveIntervalMinutes} minutes)`);
  } catch (error) {
    console.error("Error setting up auto-save:", error);
  }
}

/**
 * Loads the last opened file if exists and auto-load is enabled
 */
async function loadLastOpenedFile() {
  try {
    // Check if auto-load is enabled
    const autoLoadEnabled = await window.electronAPI.getAutoLoadLastFile();
    if (!autoLoadEnabled) {
      console.log("Auto-load last file is disabled");
      return false;
    }

    // Get the last opened file path
    const lastOpenedFilePath = await window.electronAPI.getLastOpenedFile();
    if (!lastOpenedFilePath) {
      console.log("No last opened file found");
      return false;
    }

    // Check if the file exists
    try {
      // Use the custom IPC call to load a specific file by path
      const result = await window.electronAPI.openFileByPath(
        lastOpenedFilePath
      );

      if (result.success) {
        const document = JSON.parse(result.content || "{}");

        // Loads the document data into the app state
        state.currentFilePath = result.filePath || null;
        state.chapters = document.chapters || [];
        state.characters = document.characters || [];
        state.locations = document.locations || [];
        state.assets = document.assets || [];
        state.isDirty = false;
        state.currentChapter = state.chapters.length > 0 ? 0 : null;

        // Updates the UI
        updateFileInfo();
        renderChaptersList();

        // Updates the editor content
        if (state.currentChapter !== null) {
          editor.setValue(state.chapters[state.currentChapter].content);
        } else {
          editor.setValue("");
        }

        console.log(
          "Last opened file loaded successfully:",
          lastOpenedFilePath
        );
        return true;
      } else {
        console.log("Failed to load last opened file:", result.error);
        return false;
      }
    } catch (error) {
      console.error("Error loading last opened file:", error);
      return false;
    }
  } catch (error) {
    console.error("Error in loadLastOpenedFile:", error);
    return false;
  }
}

/**
 * Opens a document
 */
async function openDocument() {
  try {
    const result = await window.electronAPI.openFile();

    if (result.success) {
      const document = JSON.parse(result.content || "{}");

      // Loads the document data into the app state
      state.currentFilePath = result.filePath || null;
      state.chapters = document.chapters || [];
      state.characters = document.characters || [];
      state.locations = document.locations || [];
      state.assets = document.assets || [];
      state.isDirty = false;
      state.currentChapter = state.chapters.length > 0 ? 0 : null;

      // Updates the UI
      updateFileInfo();
      renderChaptersList();

      // Updates the editor content
      if (state.currentChapter !== null) {
        editor.setValue(state.chapters[state.currentChapter].content);
      } else {
        editor.setValue("");
      }

      // Save the file path as the last opened file
      if (state.currentFilePath) {
        window.electronAPI.updateLastOpenedFile(state.currentFilePath);
      }
    }
  } catch (error) {
    console.error("Error opening file:", error);
  }
}

/**
 * Loads characters from storage
 */
async function loadCharacters() {
  try {
    const result = await window.electronAPI.getCharacters();
    if (result && Array.isArray(result.characters)) {
      state.characters = result.characters;
    }
  } catch (error) {
    console.error("Error loading characters:", error);
  }
}

/**
 * Loads locations from storage
 */
async function loadLocations() {
  try {
    const result = await window.electronAPI.getLocations();
    if (result && Array.isArray(result.locations)) {
      state.locations = result.locations;
    }
  } catch (error) {
    console.error("Error loading locations:", error);
  }
}

/**
 * Initializes the application
 */
async function initialize() {
  // Initializes the editor
  initializeEditor();

  // Sets up event listeners for toolbar sections
  toolbarSections.forEach((section) => {
    section.addEventListener("click", () => {
      const sectionName = section.getAttribute("data-section");
      if (sectionName) {
        switchView(sectionName);
      }
    });
  });

  // Set up save button
  saveBtn.addEventListener("click", () => saveDocument());

  // Set up Save As button and dropdown functionality
  const saveDropdownBtn = document.getElementById("save-dropdown-btn");
  const saveDropdown = document.getElementById("save-dropdown");
  const saveAsBtn = document.getElementById("save-as-btn");

  if (saveDropdownBtn && saveDropdown && saveAsBtn) {
    // Toggle dropdown visibility when clicking the dropdown button
    saveDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      saveDropdown.classList.toggle("hidden");
    });

    // Handle Save As button click
    saveAsBtn.addEventListener("click", () => {
      saveDropdown.classList.add("hidden");
      saveDocument(false, true); // Save As - force save dialog
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
      saveDropdown.classList.add("hidden");
    });
  }

  // Set up auto-save functionality
  await setupAutoSave();

  // Try loading the last opened file if auto-load is enabled
  await loadLastOpenedFile();
  
  // Set up open button and add chapter button
  openBtn.addEventListener("click", openDocument);
  addChapterBtn.addEventListener("click", addNewChapter);

  // Set up keyboard shortcuts for saving and opening files
  document.addEventListener("keydown", (event) => {
    // Save with Cmd+S (Mac) or Ctrl+S (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === "s") {
      event.preventDefault(); // Prevent browser's save dialog

      // Shift+Cmd+S or Shift+Ctrl+S for Save As
      if (event.shiftKey) {
        saveDocument(false, true); // Save As
      } else {
        saveDocument(); // Regular save
      }
    }

    // Open with Cmd+O (Mac) or Ctrl+O (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === "o") {
      event.preventDefault(); // Prevent browser's open dialog
      openDocument();
    }
  });

  // Load stored data
  await Promise.all([loadCharacters(), loadLocations()]);

  // Initialize all panels once at startup
  // This pre-initializes HTML panels so they're ready when needed
  initializeAIPanel();
  initializeCharactersPanel();
  initializeLocationsPanel();
  initializeAssetsPanel();
  initializeSettingsPanel();

  // Initializes the UI
  updateFileInfo();
  renderChaptersList();

  // Initialize with the editor view and properly set visibility
  switchView("editor");

  // Make sure editor is ready and visible
  if (editor) {
    // Refresh the editor to ensure content is displayed properly
    editor.refresh();

    // Ensure content is set
    if (state.currentChapter !== null) {
      editor.setValue(state.chapters[state.currentChapter].content);

      // Set cursor position to start of document to ensure focus
      editor.setCursor(0, 0);
    }
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", initialize);

// Declares the Electron API interface
/**
 * Initializes the settings panel
 * Uses existing HTML structure in index.html instead of creating it dynamically
 */
function initializeSettingsPanel() {
  // The settings panel already exists in index.html, we just need to initialize it
  const settingsPanel = document.getElementById("settings-panel");
  if (!settingsPanel) return;
  
  // We'll use elements from the existing panel
  const apiModelSelect = document.getElementById("api-model") as HTMLSelectElement;
  const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
  const temperatureInput = document.getElementById("temperature") as HTMLInputElement;
  const fontSizeSelect = document.getElementById("font-size") as HTMLSelectElement;
  const autoSaveInput = document.getElementById("auto-save") as HTMLInputElement;
  const darkModeCheckbox = document.getElementById("dark-mode") as HTMLInputElement;
  
  // Find the Save Settings button
  const saveSettingsBtn = settingsPanel.querySelector(".btn-primary");
  
  // Get the current configuration
  window.electronAPI.getConfig().then((config) => {
    // Fill in current values in the form fields
    if (apiModelSelect && config.aiProvider) {
      // Select the right model from the dropdown
      Array.from(apiModelSelect.options).forEach(option => {
        if (option.textContent?.includes("GPT-4") && config.aiProvider.provider === "openai") {
          option.selected = true;
        } else if (option.textContent?.includes("Claude") && config.aiProvider.provider === "anthropic") {
          option.selected = true;
        }
      });
    }
    
    // Hide actual API key, just show if it exists
    if (apiKeyInput && (config.aiProvider.openaiApiKey || config.aiProvider.anthropicApiKey)) {
      apiKeyInput.value = "••••••••••••••••••••••";
    }
    
    // Set temperature
    if (temperatureInput && config.aiProvider.temperature) {
      temperatureInput.value = config.aiProvider.temperature.toString();
      // Update temperature display
      const tempDisplay = document.querySelector(".temperature-value");
      if (tempDisplay) {
        tempDisplay.textContent = config.aiProvider.temperature.toString();
      }
    }
    
    // Set editor preferences
    if (fontSizeSelect && config.fontSize) {
      // Select the closest font size option
      Array.from(fontSizeSelect.options).forEach(option => {
        const sizeValue = parseInt(option.textContent?.match(/\d+/)?.[0] || "14");
        if (config.fontSize === sizeValue) {
          option.selected = true;
        }
      });
    }
    
    // Set auto-save interval
    if (autoSaveInput && config.autosaveInterval) {
      autoSaveInput.value = config.autosaveInterval.toString();
    }
    
    // Set dark mode
    if (darkModeCheckbox && config.theme) {
      darkModeCheckbox.checked = config.theme === "dark";
    }
  });

  // Set up event listeners
  
  // Update temperature display when slider changes
  if (temperatureInput) {
    const tempDisplay = document.querySelector(".temperature-value");
    temperatureInput.addEventListener("input", () => {
      if (tempDisplay) {
        tempDisplay.textContent = temperatureInput.value;
      }
    });
  }
  
  // Save settings button
  if (saveSettingsBtn) {
    // Reset event listeners
    const newSaveBtn = saveSettingsBtn.cloneNode(true);
    saveSettingsBtn.parentNode?.replaceChild(newSaveBtn, saveSettingsBtn);
    
    // Add new event listener
    newSaveBtn.addEventListener("click", async () => {
      try {
        // Get form values
        const apiModel = apiModelSelect?.value || "Claude 3 Sonnet";
        let provider: "openai" | "anthropic" = "anthropic";
        let model = "claude-3-5-sonnet";
        
        // Determine provider and model from selection
        if (apiModel.includes("GPT")) {
          provider = "openai";
          model = "gpt-4";
        }
        
        // Get temperature
        const temperature = parseFloat(temperatureInput?.value || "0.7");
        
        // Get font size
        const fontSizeOption = fontSizeSelect?.selectedOptions[0]?.textContent || "Medium (14px)";
        const fontSize = parseInt(fontSizeOption.match(/\d+/)?.[0] || "14");
        
        // Get auto-save interval
        const autosaveInterval = parseInt(autoSaveInput?.value || "5");
        
        // Get theme
        const theme = darkModeCheckbox?.checked ? "dark" : "light";
        
        // Save AI settings
        await window.electronAPI.updateAIConfig({
          provider,
          temperature,
          // We don't update API keys from this UI to avoid overwriting them
          // with placeholder values
        });
        
        // Save app settings
        await window.electronAPI.updateConfig({
          fontSize,
          theme,
          autosaveInterval,
        });
        
        // Update editor immediately if needed
        if (theme === "dark") {
          editor.setOption("theme", "ayu-mirage");
        } else {
          editor.setOption("theme", "default");
        }
        
        editor.getWrapperElement().style.fontSize = `${fontSize}px`;
        
        // Update auto-save timer
        setupAutoSave();
        
        alert("Settings saved successfully!");
      } catch (error) {
        alert(
          `Error saving settings: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });
  }
  
  // Cancel button
  const cancelBtn = settingsPanel.querySelector(".btn-secondary");
  if (cancelBtn) {
    // Reset event listeners
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode?.replaceChild(newCancelBtn, cancelBtn);
    
    // Add new event listener
    newCancelBtn.addEventListener("click", () => {
      // Switch back to editor view
      switchView("editor");
    });
  }
}

// Global declarations already defined at the top of the file
