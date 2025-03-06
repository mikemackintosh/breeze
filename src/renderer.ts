import CodeMirror from "codemirror";
import "codemirror/mode/markdown/markdown";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/ayu-mirage.css";
import "./styles/main.css";

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
  locationType?: 'city' | 'wilderness' | 'landmark' | 'building';
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
const toolbarSections = document.querySelectorAll(".toolbar-section");
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
 * Renders the chapters list
 */
function renderChaptersList() {
  chaptersList.innerHTML = "";

  state.chapters.forEach((chapter, index) => {
    const chapterEl = document.createElement("div");
    chapterEl.className = `chapter-item ${
      state.currentChapter === index ? "active" : ""
    }`;
    chapterEl.textContent = chapter.title;
    chapterEl.dataset.index = index.toString();

    chapterEl.addEventListener("click", () => {
      switchChapter(index);
    });

    // Right-click context menu for chapter
    chapterEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();

      // Could implement a context menu here
      console.log(`Context menu for chapter ${index}`);
    });

    chaptersList.appendChild(chapterEl);
  });
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
  state.currentView = view;

  // Updates active toolbar section
  toolbarSections.forEach((section) => {
    if (section.getAttribute("data-section") === view) {
      section.classList.add("active");
    } else {
      section.classList.remove("active");
    }
  });

  // Get chapter browser element
  const chapterBrowser = document.getElementById("chapter-browser");
  const chapterHeader = document.querySelector(".chapter-browser-header h2");
  const addChapterBtn = document.getElementById("add-chapter-btn");

  // Shows/hides the appropriate content areas
  if (view === "editor") {
    editorContent.classList.remove("hidden");
    panelContent.classList.add("hidden");
    
    // Show chapters sidebar
    if (chapterBrowser) {
      chapterBrowser.classList.remove("hidden");
    }
    if (chapterHeader) {
      chapterHeader.textContent = "Chapters";
    }
    if (addChapterBtn) {
      addChapterBtn.textContent = "+ Add";
      // Restore the original event listener
      addChapterBtn.replaceWith(addChapterBtn.cloneNode(true));
      document.getElementById("add-chapter-btn")?.addEventListener("click", addNewChapter);
    }
    
    // Render chapter list
    renderChaptersList();
  } else {
    editorContent.classList.add("hidden");
    panelContent.classList.remove("hidden");
    
    // Update sidebar based on view
    if (view === "characters") {
      // Show character list in the sidebar
      if (chapterBrowser) {
        chapterBrowser.classList.remove("hidden");
      }
      if (chapterHeader) {
        chapterHeader.textContent = "Characters";
      }
      if (addChapterBtn) {
        addChapterBtn.textContent = "+ Add Character";
        // Replace with add character event listener
        addChapterBtn.replaceWith(addChapterBtn.cloneNode(true));
        document.getElementById("add-chapter-btn")?.addEventListener("click", () => {
          showCharacterDialog();
        });
      }
      
      // Render character list in sidebar
      renderCharactersList();
    }
    else if (view === "locations") {
      // Show locations list in the sidebar
      if (chapterBrowser) {
        chapterBrowser.classList.remove("hidden");
      }
      if (chapterHeader) {
        chapterHeader.textContent = "Locations";
      }
      if (addChapterBtn) {
        addChapterBtn.textContent = "+ Add Location";
        // Replace with add location event listener
        addChapterBtn.replaceWith(addChapterBtn.cloneNode(true));
        document.getElementById("add-chapter-btn")?.addEventListener("click", () => {
          showLocationDialog();
        });
      }
      
      // Render locations list in sidebar
      renderLocationsList();
    }
    else {
      // For other views, hide the chapter browser
      if (chapterBrowser) {
        chapterBrowser.classList.add("hidden");
      }
    }
    
    renderPanelContent(view);
  }
}

/**
 * Renders content for different panels
 */
function renderPanelContent(panel: string) {
  switch (panel) {
    case "characters":
      renderCharactersPanel();
      break;
    case "locations":
      renderLocationsPanel();
      break;
    case "assets":
      renderAssetsPanel();
      break;
    case "ai":
      renderAIPanel();
      break;
    case "settings":
      renderSettingsPanel();
      break;
  }
}

/**
 * Renders the characters list in the sidebar
 */
function renderCharactersList() {
  const chaptersList = document.getElementById('chapters-list');
  if (!chaptersList) return;

  chaptersList.innerHTML = state.characters.length > 0
    ? state.characters.map(char => `
        <div class="character-item" data-id="${char.id}">
          <div class="character-name">${char.name}</div>
        </div>
      `).join('')
    : "<p class='no-items-msg'>No characters yet.</p>";

  // Add click handlers to character items
  const characterItems = document.querySelectorAll('.character-item');
  characterItems.forEach(item => {
    item.addEventListener('click', () => {
      const characterId = parseInt(item.getAttribute('data-id') || '0', 10);
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
  document.querySelectorAll('.character-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Add active class to selected character
  const selectedItem = document.querySelector(`.character-item[data-id="${characterId}"]`);
  if (selectedItem) {
    selectedItem.classList.add('active');
  }
}

/**
 * Renders character details panel to show selected character details and relationships
 */
function renderCharacterDetails(characterId: number) {
  const character = state.characters.find(c => c.id === characterId);
  if (!character) return;
  
  // Get the character details container
  const detailsContainer = document.createElement('div');
  detailsContainer.className = 'character-detail-panel';
  
  // Get character relationships
  const relationships = character.relationships || [];
  
  // Get character locations
  const originLocation = character.originLocationId ? 
    state.locations.find(l => l.id === character.originLocationId) : null;
  const currentLocation = character.currentLocationId ? 
    state.locations.find(l => l.id === character.currentLocationId) : null;
  
  // Create the content
  detailsContainer.innerHTML = `
    <div class="character-detail-header">
      <h3>${character.name}</h3>
      <div class="character-actions">
        <button class="edit-character-btn" data-id="${character.id}">Edit</button>
      </div>
    </div>
    <div class="character-detail-body">
      <div class="detail-section">
        <h4>Description</h4>
        <p>${character.description || 'No description provided.'}</p>
      </div>
      
      ${character.traits && character.traits.length > 0 ? `
      <div class="detail-section">
        <h4>Traits</h4>
        <div class="traits-list">
          ${character.traits.map(trait => `<span class="trait-pill">${trait}</span>`).join(' ')}
        </div>
      </div>
      ` : ''}
      
      ${character.goals ? `
      <div class="detail-section">
        <h4>Goals</h4>
        <p>${character.goals}</p>
      </div>
      ` : ''}
      
      ${character.backstory ? `
      <div class="detail-section">
        <h4>Backstory</h4>
        <p>${character.backstory}</p>
      </div>
      ` : ''}
      
      <div class="detail-section">
        <h4>Locations</h4>
        <div class="character-locations">
          <div class="location-item">
            <span class="location-label">Origin:</span>
            <span class="location-value">${originLocation ? originLocation.name : 'Unknown'}</span>
          </div>
          <div class="location-item">
            <span class="location-label">Current:</span>
            <span class="location-value">${currentLocation ? currentLocation.name : 'Unknown'}</span>
          </div>
        </div>
      </div>
      
      <div class="detail-section">
        <div class="section-header">
          <h4>Relationships</h4>
          <button class="add-relationship-btn small" data-id="${character.id}">+ Add</button>
        </div>
        <div class="relationship-list">
          ${relationships.length > 0 ? 
            relationships.map(rel => {
              const relatedCharacter = state.characters.find(c => c.id === rel.characterId);
              return relatedCharacter ? `
                <div class="relationship-item">
                  <div class="relationship-info">
                    <span class="relationship-type">${rel.type}:</span>
                    <span class="relationship-name">${relatedCharacter.name}</span>
                    ${rel.description ? `<span class="relationship-desc">${rel.description}</span>` : ''}
                  </div>
                  <div class="relationship-actions">
                    <button class="edit-relationship-btn" data-character="${character.id}" data-relationship="${rel.characterId}" title="Edit Relationship">✎</button>
                    <button class="remove-relationship-btn" data-character="${character.id}" data-relationship="${rel.characterId}" title="Remove Relationship">×</button>
                  </div>
                </div>
              ` : '';
            }).join('') 
            : '<p class="empty-list">No relationships defined.</p>'
          }
        </div>
      </div>
    </div>
  `;
  
  // Create a modal to display the details
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  document.body.appendChild(modalOverlay);
  
  const modal = document.createElement('div');
  modal.className = 'modal character-detail-modal';
  modalOverlay.appendChild(modal);
  modal.appendChild(detailsContainer);
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.className = 'modal-close-btn';
  closeButton.innerHTML = '&times;';
  detailsContainer.querySelector('.character-detail-header')?.appendChild(closeButton);
  
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });
  
  // Add event listeners for relationship management
  
  // Edit character button
  const editCharacterBtn = modal.querySelector('.edit-character-btn');
  if (editCharacterBtn) {
    editCharacterBtn.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
      showCharacterDialog(characterId);
    });
  }
  
  // Add relationship button
  const addRelationshipBtn = modal.querySelector('.add-relationship-btn');
  if (addRelationshipBtn) {
    addRelationshipBtn.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
      showRelationshipDialog(parseInt(addRelationshipBtn.getAttribute('data-id') || '0'));
    });
  }
  
  // Edit relationship buttons
  const editRelationshipBtns = modal.querySelectorAll('.edit-relationship-btn');
  editRelationshipBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const charId = parseInt(btn.getAttribute('data-character') || '0');
      const relatedCharId = parseInt(btn.getAttribute('data-relationship') || '0');
      
      document.body.removeChild(modalOverlay);
      showRelationshipDialog(charId, relatedCharId);
    });
  });
  
  // Remove relationship buttons
  const removeRelationshipBtns = modal.querySelectorAll('.remove-relationship-btn');
  removeRelationshipBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const charId = parseInt(btn.getAttribute('data-character') || '0');
      const relatedCharId = parseInt(btn.getAttribute('data-relationship') || '0');
      
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
 * Renders the characters panel - now focusing on the relationship graph
 */
function renderCharactersPanel() {
  panelContent.innerHTML = `
    <div class="panel-header">
      <h2>Character Relationships</h2>
      <div class="panel-actions">
        <button id="add-relationship-btn">Add Relationship</button>
      </div>
    </div>
    <div class="character-graph-container">
      ${state.characters.length > 0 
        ? `<div id="character-graph-container" class="relationship-graph"></div>
           <div class="graph-legend">
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
           </div>`
        : "<div class='empty-state'>Add characters to start creating relationship connections</div>"
      }
    </div>
  `;

  // Add relationship button event
  const addRelationshipBtn = document.getElementById('add-relationship-btn');
  if (addRelationshipBtn) {
    addRelationshipBtn.addEventListener('click', () => {
      if (state.characters.length < 2) {
        alert('You need at least two characters to create a relationship.');
        return;
      }
      // Since we're creating a brand new relationship with no pre-selected character,
      // we'll use the first character as a default
      const defaultCharacterId = state.characters.length > 0 ? state.characters[0].id : 0;
      showRelationshipDialog(defaultCharacterId);
    });
  }

  // Initialize character relationship graph
  if (state.characters.length > 0) {
    initializeCharacterGraph();
  }
}

/**
 * Removes a relationship between characters
 */
async function removeCharacterRelationship(characterId: number, relatedCharacterId: number) {
  // Find the character
  const character = state.characters.find(c => c.id === characterId);
  if (!character || !character.relationships) return;
  
  // Ask for confirmation
  if (!confirm('Are you sure you want to remove this relationship?')) {
    return;
  }
  
  // Remove the relationship
  character.relationships = character.relationships.filter(rel => rel.characterId !== relatedCharacterId);
  
  try {
    // Save the character
    await window.electronAPI.saveCharacter(character);
    
    // Also check if there's a reverse relationship to remove
    const relatedCharacter = state.characters.find(c => c.id === relatedCharacterId);
    if (relatedCharacter && relatedCharacter.relationships) {
      relatedCharacter.relationships = relatedCharacter.relationships.filter(
        rel => rel.characterId !== characterId
      );
      
      await window.electronAPI.saveCharacter(relatedCharacter);
    }
    
    // Update the graph
    initializeCharacterGraph();
    
    // Show updated details
    showCharacterDetails(characterId);
  } catch (error) {
    console.error('Error removing relationship:', error);
    alert('Failed to remove the relationship.');
  }
}

/**
 * Shows a dialog to create or edit a relationship between characters
 */
function showRelationshipDialog(characterId: number, relatedCharacterId?: number) {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  document.body.appendChild(modalOverlay);

  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'modal relationship-modal';
  modalOverlay.appendChild(modal);

  // Find existing relationship if editing
  let existingRelationship = undefined;
  if (characterId && relatedCharacterId) {
    const character = state.characters.find(c => c.id === characterId);
    if (character && character.relationships) {
      existingRelationship = character.relationships.find(r => r.characterId === relatedCharacterId);
    }
  }

  // Create relationship dialog content
  modal.innerHTML = `
    <div class="modal-header">
      <h2>${existingRelationship ? 'Edit Relationship' : 'Character Relationship'}</h2>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <form id="relationship-form">
        <div class="form-group">
          <label for="character1-select">First Character</label>
          <select id="character1-select" required ${characterId ? 'disabled' : ''}>
            <option value="">Select a character</option>
            ${state.characters.map(char => 
              `<option value="${char.id}" ${char.id === characterId ? 'selected' : ''}>${char.name}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label for="relationship-type">Relationship Type</label>
          <select id="relationship-type" required>
            <option value="">Select relationship type</option>
            <option value="friend" ${existingRelationship?.type === 'friend' ? 'selected' : ''}>Friend</option>
            <option value="family" ${existingRelationship?.type === 'family' ? 'selected' : ''}>Family</option>
            <option value="rival" ${existingRelationship?.type === 'rival' ? 'selected' : ''}>Rival</option>
            <option value="enemy" ${existingRelationship?.type === 'enemy' ? 'selected' : ''}>Enemy</option>
            <option value="lover" ${existingRelationship?.type === 'lover' ? 'selected' : ''}>Lover</option>
            <option value="mentor" ${existingRelationship?.type === 'mentor' ? 'selected' : ''}>Mentor</option>
            <option value="colleague" ${existingRelationship?.type === 'colleague' ? 'selected' : ''}>Colleague</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="character2-select">Second Character</label>
          <select id="character2-select" required ${relatedCharacterId ? 'disabled' : ''}>
            <option value="">Select a character</option>
            ${state.characters
              .filter(char => char.id !== characterId) // Don't show the first character
              .map(char => 
                `<option value="${char.id}" ${char.id === relatedCharacterId ? 'selected' : ''}>${char.name}</option>`
              ).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label for="relationship-description">Description</label>
          <textarea id="relationship-description" rows="3" placeholder="Describe their relationship...">${existingRelationship?.description || ''}</textarea>
        </div>
        
        ${existingRelationship ? `
        <div class="form-group bidirectional-toggle">
          <label>
            <input type="checkbox" id="bidirectional-checkbox" checked>
            Also update in other direction (reciprocal relationship)
          </label>
        </div>
        ` : ''}
      </form>
    </div>
    <div class="modal-footer">
      <button id="cancel-relationship-btn" class="btn">Cancel</button>
      <button id="save-relationship-btn" class="btn primary">Save Relationship</button>
    </div>
  `;

  // Handle close button
  const closeBtn = modal.querySelector('.modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle cancel button
  const cancelBtn = modal.querySelector('#cancel-relationship-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle save button
  const saveBtn = modal.querySelector('#save-relationship-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const char1Select = document.getElementById('character1-select') as HTMLSelectElement;
      const char2Select = document.getElementById('character2-select') as HTMLSelectElement;
      const relationshipTypeSelect = document.getElementById('relationship-type') as HTMLSelectElement;
      const relationshipDescription = document.getElementById('relationship-description') as HTMLTextAreaElement;
      const bidirectionalCheckbox = document.getElementById('bidirectional-checkbox') as HTMLInputElement;
      
      const isBidirectional = bidirectionalCheckbox ? bidirectionalCheckbox.checked : true;

      // Validate form
      if (!char1Select.value || !char2Select.value || !relationshipTypeSelect.value) {
        alert('Please select both characters and a relationship type.');
        return;
      }

      if (char1Select.value === char2Select.value) {
        alert('Please select two different characters.');
        return;
      }

      // Create relationship
      const char1Id = parseInt(char1Select.value);
      const char2Id = parseInt(char2Select.value);
      const relationType = relationshipTypeSelect.value;
      const description = relationshipDescription.value.trim();

      try {
        // Add/update relationship to the first character
        const char1 = state.characters.find(c => c.id === char1Id);
        if (char1) {
          if (!char1.relationships) {
            char1.relationships = [];
          }
          
          // Check if relationship already exists
          const existingRelIdx = char1.relationships.findIndex(
            r => r.characterId === char2Id
          );
          
          if (existingRelIdx >= 0) {
            // Update existing relationship
            char1.relationships[existingRelIdx] = {
              characterId: char2Id,
              type: relationType,
              description
            };
          } else {
            // Add new relationship
            char1.relationships.push({
              characterId: char2Id,
              type: relationType,
              description
            });
          }

          // Save the character with the new relationship
          await window.electronAPI.saveCharacter(char1);
          
          // Optionally update the reciprocal relationship
          if (isBidirectional) {
            const char2 = state.characters.find(c => c.id === char2Id);
            if (char2) {
              if (!char2.relationships) {
                char2.relationships = [];
              }
              
              // Check if reverse relationship already exists
              const existingReverseRelIdx = char2.relationships.findIndex(
                r => r.characterId === char1Id
              );
              
              if (existingReverseRelIdx >= 0) {
                // Update existing reverse relationship
                char2.relationships[existingReverseRelIdx] = {
                  characterId: char1Id,
                  type: relationType,
                  description
                };
              } else {
                // Add new reverse relationship
                char2.relationships.push({
                  characterId: char1Id,
                  type: relationType,
                  description
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
        console.error('Error saving relationship:', error);
        alert('Failed to save the relationship.');
      }
    });
  }
}

/**
 * Shows character creation/edit dialog
 */
function showCharacterDialog(characterId?: number) {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  document.body.appendChild(modalOverlay);

  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'modal character-modal';
  modalOverlay.appendChild(modal);

  let character: Character = {
    id: 0,
    name: '',
    description: '',
    traits: [],
    goals: '',
    backstory: '',
    relationships: []
  };

  // If editing an existing character, load the data
  if (characterId) {
    const existingCharacter = state.characters.find(c => c.id === characterId);
    if (existingCharacter) {
      character = { ...existingCharacter };
    }
  }

  // Modal content
  modal.innerHTML = `
    <div class="modal-header">
      <h2>${characterId ? 'Edit Character' : 'Create New Character'}</h2>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <form id="character-form">
        <div class="form-group">
          <label for="character-name">Name</label>
          <input type="text" id="character-name" value="${character.name}" required>
        </div>
        
        <div class="form-group">
          <label for="character-description">Description</label>
          <textarea id="character-description" rows="3">${character.description}</textarea>
        </div>
        
        <div class="form-group">
          <label for="character-traits">Character Traits (comma separated)</label>
          <input type="text" id="character-traits" value="${Array.isArray(character.traits) ? character.traits.join(', ') : ''}">
        </div>
        
        <div class="form-group">
          <label for="character-goals">Goals and Motivations</label>
          <textarea id="character-goals" rows="3">${character.goals || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label for="character-backstory">Backstory</label>
          <textarea id="character-backstory" rows="5">${character.backstory || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label for="character-origin">Origin Location</label>
          <select id="character-origin">
            <option value="">Select a location...</option>
            ${state.locations.map(loc => 
              `<option value="${loc.id}" ${
                character.originLocationId === loc.id ? 'selected' : ''
              }>${loc.name}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label for="character-current-location">Current Location</label>
          <select id="character-current-location">
            <option value="">Select a location...</option>
            ${state.locations.map(loc => 
              `<option value="${loc.id}" ${
                character.currentLocationId === loc.id ? 'selected' : ''
              }>${loc.name}</option>`
            ).join('')}
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
  const closeBtn = modal.querySelector('.modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle cancel button
  const cancelBtn = modal.querySelector('#cancel-character-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle save button
  const saveBtn = modal.querySelector('#save-character-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const nameInput = document.getElementById('character-name') as HTMLInputElement;
      const descriptionInput = document.getElementById('character-description') as HTMLTextAreaElement;
      const traitsInput = document.getElementById('character-traits') as HTMLInputElement;
      const goalsInput = document.getElementById('character-goals') as HTMLTextAreaElement;
      const backstoryInput = document.getElementById('character-backstory') as HTMLTextAreaElement;

      if (!nameInput.value.trim()) {
        alert('Character name is required');
        return;
      }

      const originLocationSelect = document.getElementById('character-origin') as HTMLSelectElement;
      const currentLocationSelect = document.getElementById('character-current-location') as HTMLSelectElement;

      // Prepare character data
      const updatedCharacter: Character = {
        id: character.id || Date.now(),
        name: nameInput.value.trim(),
        description: descriptionInput.value.trim(),
        traits: traitsInput.value.split(',').map(t => t.trim()).filter(t => t),
        goals: goalsInput.value.trim(),
        backstory: backstoryInput.value.trim(),
        relationships: character.relationships || [],
        originLocationId: originLocationSelect.value ? parseInt(originLocationSelect.value) : undefined,
        currentLocationId: currentLocationSelect.value ? parseInt(currentLocationSelect.value) : undefined
      };

      try {
        // Save character
        const result = await window.electronAPI.saveCharacter(updatedCharacter);
        
        if (result.success) {
          // Update ID if new character
          updatedCharacter.id = result.id;
          
          // Update state
          if (characterId) {
            // Update existing character
            const index = state.characters.findIndex(c => c.id === characterId);
            if (index !== -1) {
              state.characters[index] = updatedCharacter;
            }
          } else {
            // Add new character
            state.characters.push(updatedCharacter);
          }
          
          // Re-render characters panel if currently visible
          if (state.currentView === 'characters') {
            renderCharactersPanel();
          }
          
          // Close modal
          document.body.removeChild(modalOverlay);
        } else {
          alert('Failed to save character');
        }
      } catch (error) {
        console.error('Error saving character:', error);
        alert(`Error saving character: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  // Focus on name input
  setTimeout(() => {
    const nameInput = document.getElementById('character-name') as HTMLInputElement;
    if (nameInput) {
      nameInput.focus();
    }
  }, 100);
}

/**
 * Initializes the character relationship graph
 */
function initializeCharacterGraph() {
  const graphContainer = document.getElementById("character-graph-container");
  if (!graphContainer) return;

  // Clear any existing content
  graphContainer.innerHTML = '';

  if (state.characters.length === 0) {
    graphContainer.innerHTML = '<div class="empty-graph">Add characters to visualize relationships</div>';
    return;
  }

  // For this implementation, we'll create a simple visual representation
  // In a real implementation, you'd likely use a library like D3.js or Cytoscape.js

  // Create an SVG element for the graph
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 800 600');
  graphContainer.appendChild(svg);

  // Define character positions in a circle layout
  const centerX = 400;
  const centerY = 300;
  const radius = 200;
  const characterPositions: { [id: number]: { x: number, y: number } } = {};

  // Place characters in a circle
  state.characters.forEach((character, index) => {
    const angle = (index / state.characters.length) * 2 * Math.PI;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    characterPositions[character.id] = { x, y };

    // Create character node
    const charGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Character circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', y.toString());
    circle.setAttribute('r', '30');
    circle.setAttribute('fill', '#2d2d2d');
    circle.setAttribute('stroke', '#666');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('data-id', character.id.toString());
    circle.classList.add('character-node');
    
    // Character name
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x.toString());
    text.setAttribute('y', y.toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dy', '0.3em');
    text.setAttribute('fill', '#fff');
    text.setAttribute('font-size', '12px');
    text.textContent = character.name.substring(0, 10);
    
    // Add hover and click events
    charGroup.addEventListener('mouseover', () => {
      circle.setAttribute('fill', '#3c3c3c');
      circle.setAttribute('stroke', '#9cdcfe');
    });
    
    charGroup.addEventListener('mouseout', () => {
      circle.setAttribute('fill', '#2d2d2d');
      circle.setAttribute('stroke', '#666');
    });
    
    charGroup.addEventListener('click', () => {
      selectCharacter(character.id);
      showCharacterDetails(character.id);
    });
    
    charGroup.appendChild(circle);
    charGroup.appendChild(text);
    svg.appendChild(charGroup);
  });

  // Draw relationship lines
  state.characters.forEach(character => {
    if (character.relationships && character.relationships.length > 0) {
      character.relationships.forEach(rel => {
        // Get positions
        const sourcePos = characterPositions[character.id];
        const targetPos = characterPositions[rel.characterId];
        
        if (sourcePos && targetPos) {
          // Create line
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', sourcePos.x.toString());
          line.setAttribute('y1', sourcePos.y.toString());
          line.setAttribute('x2', targetPos.x.toString());
          line.setAttribute('y2', targetPos.y.toString());
          line.setAttribute('stroke', getRelationshipColor(rel.type));
          line.setAttribute('stroke-width', '2');
          
          // Add relationship type as tooltip
          const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
          title.textContent = `${character.name} → ${
            state.characters.find(c => c.id === rel.characterId)?.name || 'Unknown'
          }: ${rel.type} ${rel.description ? '- ' + rel.description : ''}`;
          
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
    case 'friend':
      return '#4CAF50'; // Green
    case 'family':
      return '#2196F3'; // Blue
    case 'rival':
      return '#FF9800'; // Orange
    case 'enemy':
      return '#F44336'; // Red
    case 'lover':
      return '#E91E63'; // Pink
    case 'mentor':
      return '#9C27B0'; // Purple
    case 'colleague':
      return '#607D8B'; // Blue-grey
    default:
      return '#CCCCCC'; // Gray
  }
}

/**
 * Renders the locations list in the sidebar
 */
function renderLocationsList() {
  const chaptersList = document.getElementById('chapters-list');
  if (!chaptersList) return;

  chaptersList.innerHTML = state.locations.length > 0
    ? state.locations.map(location => `
        <div class="location-item" data-id="${location.id}">
          <div class="location-name">${location.name}</div>
        </div>
      `).join('')
    : "<p class='no-items-msg'>No locations yet.</p>";

  // Add click handlers to location items
  const locationItems = document.querySelectorAll('.location-item');
  locationItems.forEach(item => {
    item.addEventListener('click', () => {
      const locationId = parseInt(item.getAttribute('data-id') || '0', 10);
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
  document.querySelectorAll('.location-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Add active class to selected location
  const selectedItem = document.querySelector(`.location-item[data-id="${locationId}"]`);
  if (selectedItem) {
    selectedItem.classList.add('active');
  }
  
  // Update the location details panel to show the selected location
  const detailsContainer = document.getElementById('selected-location-details');
  if (detailsContainer) {
    renderLocationDetails(locationId);
  }
}

/**
 * Show location details in the selected-location-details panel
 */
function showLocationDetails(locationId: number) {
  // Find the location
  const location = state.locations.find(l => l.id === locationId);
  if (!location) return;
  
  // Just render the location details in the panel
  renderLocationDetails(locationId);
}

/**
 * Renders the locations panel - focusing on location map visualization
 */
function renderLocationsPanel() {
  panelContent.innerHTML = `
    <div class="panel-header">
      <h2>World Map</h2>
      <div class="panel-actions">
        <button id="add-location-connection-btn">Add Connection</button>
        <button id="add-location-btn">Add Location</button>
      </div>
    </div>
    <div class="location-map-container">
      ${state.locations.length > 0 
        ? `<div id="location-map" class="location-map"></div>
           <div class="map-legend">
             <h3>Legend</h3>
             <div class="legend-item">
               <span class="legend-color city"></span> City
             </div>
             <div class="legend-item">
               <span class="legend-color wilderness"></span> Wilderness
             </div>
             <div class="legend-item">
               <span class="legend-color landmark"></span> Landmark
             </div>
             <div class="legend-item">
               <span class="legend-color building"></span> Building
             </div>
           </div>`
        : "<div class='empty-state'>Add locations to start building your world map</div>"
      }
    </div>
    <div class="location-detail-sidebar">
      <div id="selected-location-details" class="selected-location-details">
        <div class="empty-selection">Select a location from the sidebar to view details</div>
      </div>
    </div>
  `;

  // Add location button event
  const addLocationBtn = document.getElementById('add-location-btn');
  if (addLocationBtn) {
    addLocationBtn.addEventListener('click', () => {
      showLocationDialog();
    });
  }

  // Add connection button event
  const addConnectionBtn = document.getElementById('add-location-connection-btn');
  if (addConnectionBtn) {
    addConnectionBtn.addEventListener('click', () => {
      if (state.locations.length < 2) {
        alert('You need at least two locations to create a connection.');
        return;
      }
      // No specific location is pre-selected, so we'll create a new connection
      showLocationConnectionDialog();
    });
  }

  // Initialize the location map visualization
  if (state.locations.length > 0) {
    initializeLocationMap();
  }
}

/**
 * Renders detailed view of a specific location
 */
function renderLocationDetails(locationId: number) {
  const location = state.locations.find(l => l.id === locationId);
  if (!location) return;
  
  const detailsContainer = document.getElementById('selected-location-details');
  if (!detailsContainer) return;
  
  // Get connections for this location
  const connections = location.connections || [];
  
  detailsContainer.innerHTML = `
    <div class="location-detail-header">
      <h3>${location.name}</h3>
      <div class="location-actions">
        <button class="edit-btn" data-id="${location.id}">Edit</button>
      </div>
    </div>
    <div class="location-detail-body">
      <div class="detail-section">
        <h4>Description</h4>
        <p>${location.description || 'No description provided.'}</p>
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
          <h4>Connections</h4>
          <button class="add-connection-btn small" data-id="${location.id}">+ Add</button>
        </div>
        <div class="connection-list">
          ${connections.length > 0 ? 
            connections.map(conn => {
              const connectedLocation = state.locations.find(l => l.id === conn.locationId);
              return connectedLocation ? `
                <div class="connection-item">
                  <div class="connection-info">
                    <span class="connection-type">${conn.type}:</span>
                    <span class="connection-name">${connectedLocation.name}</span>
                    ${conn.description ? `<span class="connection-desc">${conn.description}</span>` : ''}
                  </div>
                  <div class="connection-actions">
                    <button class="edit-connection-btn" data-location="${location.id}" data-connection="${conn.locationId}" title="Edit Connection">✎</button>
                    <button class="remove-connection-btn" data-location="${location.id}" data-connection="${conn.locationId}" title="Remove Connection">×</button>
                  </div>
                </div>
              ` : '';
            }).join('') 
            : '<p class="empty-list">No connections.</p>'
          }
        </div>
      </div>
      
      <div class="detail-section">
        <div class="section-header">
          <h4>Characters</h4>
        </div>
        <div class="character-in-location-list">
          ${getCharactersAtLocation(location.id).length > 0 ?
            getCharactersAtLocation(location.id).map(char => `
              <div class="character-in-location-item">
                <span class="character-name">${char.name}</span>
                <span class="location-status">${
                  char.originLocationId === location.id && char.currentLocationId === location.id ? 
                  '(Origin & Current)' : 
                  char.originLocationId === location.id ? 
                  '(Origin)' : 
                  '(Current)'
                }</span>
              </div>
            `).join('')
            : '<p class="empty-list">No characters at this location.</p>'
          }
        </div>
      </div>
    </div>
  `;
  
  // Add edit button event
  const editBtn = detailsContainer.querySelector('.edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      showLocationDialog(locationId);
    });
  }
  
  // Add connection button event
  const addConnectionBtn = detailsContainer.querySelector('.add-connection-btn');
  if (addConnectionBtn) {
    addConnectionBtn.addEventListener('click', () => {
      const locationId = parseInt(addConnectionBtn.getAttribute('data-id') || '0');
      showLocationConnectionDialog(locationId);
    });
  }
  
  // Add edit connection button events
  const editConnectionBtns = detailsContainer.querySelectorAll('.edit-connection-btn');
  editConnectionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const locationId = parseInt(btn.getAttribute('data-location') || '0');
      const connectionId = parseInt(btn.getAttribute('data-connection') || '0');
      
      if (locationId && connectionId) {
        showLocationConnectionDialog(locationId, connectionId);
      }
    });
  });
  
  // Add remove connection button events
  const removeConnectionBtns = detailsContainer.querySelectorAll('.remove-connection-btn');
  removeConnectionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const locationId = parseInt(btn.getAttribute('data-location') || '0');
      const connectionId = parseInt(btn.getAttribute('data-connection') || '0');
      
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
    char => char.originLocationId === locationId || char.currentLocationId === locationId
  );
}

/**
 * Removes a connection between locations
 */
async function removeLocationConnection(locationId: number, connectionId: number) {
  // Find the location
  const location = state.locations.find(l => l.id === locationId);
  if (!location || !location.connections) return;
  
  // Ask for confirmation
  if (!confirm('Are you sure you want to remove this connection?')) {
    return;
  }
  
  // Remove the connection
  location.connections = location.connections.filter(conn => conn.locationId !== connectionId);
  
  try {
    // Save the first location
    await window.electronAPI.saveLocation(location);
    
    // Also remove the connection from the other side
    const connectedLocation = state.locations.find(l => l.id === connectionId);
    if (connectedLocation && connectedLocation.connections) {
      connectedLocation.connections = connectedLocation.connections.filter(
        conn => conn.locationId !== locationId
      );
      
      await window.electronAPI.saveLocation(connectedLocation);
    }
    
    // Update the map and details
    initializeLocationMap();
    renderLocationDetails(locationId);
  } catch (error) {
    console.error('Error removing connection:', error);
    alert('Failed to remove the connection.');
  }
}

/**
 * Initializes the location map visualization
 */
function initializeLocationMap() {
  const mapContainer = document.getElementById('location-map');
  if (!mapContainer) return;

  // Clear any existing content
  mapContainer.innerHTML = '';

  if (state.locations.length === 0) {
    mapContainer.innerHTML = '<div class="empty-map">Add locations to visualize your world</div>';
    return;
  }

  // Create an SVG element for the map
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 800 600');
  mapContainer.appendChild(svg);

  // Define location positions in a grid layout
  const locationPositions: { [id: number]: { x: number, y: number } } = {};
  
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
    const locGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Location circle/icon
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', y.toString());
    circle.setAttribute('r', '25');
    circle.setAttribute('fill', getLocationColor(location.locationType));
    circle.setAttribute('stroke', '#666');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('data-id', location.id.toString());
    circle.classList.add('location-node');
    
    // Location name
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x.toString());
    text.setAttribute('y', (y + 40).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#fff');
    text.setAttribute('font-size', '12px');
    text.textContent = location.name;
    
    // Add hover and click events
    locGroup.addEventListener('mouseover', () => {
      circle.setAttribute('fill', getLocationHighlightColor(location.locationType));
      circle.setAttribute('stroke', '#9cdcfe');
    });
    
    locGroup.addEventListener('mouseout', () => {
      circle.setAttribute('fill', getLocationColor(location.locationType));
      circle.setAttribute('stroke', '#666');
    });
    
    locGroup.addEventListener('click', () => {
      selectLocation(location.id);
    });
    
    locGroup.appendChild(circle);
    locGroup.appendChild(text);
    svg.appendChild(locGroup);
  });
  
  // Draw connections between locations
  state.locations.forEach(location => {
    if (location.connections && location.connections.length > 0) {
      location.connections.forEach(conn => {
        // Get positions
        const sourcePos = locationPositions[location.id];
        const targetPos = locationPositions[conn.locationId];
        
        if (sourcePos && targetPos) {
          // Create connection line
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', sourcePos.x.toString());
          line.setAttribute('y1', sourcePos.y.toString());
          line.setAttribute('x2', targetPos.x.toString());
          line.setAttribute('y2', targetPos.y.toString());
          line.setAttribute('stroke', getConnectionColor(conn.type));
          line.setAttribute('stroke-width', '2');
          
          // Add connection description as tooltip
          const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
          title.textContent = `${location.name} → ${
            state.locations.find(l => l.id === conn.locationId)?.name || 'Unknown'
          }: ${conn.type} ${conn.description ? '- ' + conn.description : ''}`;
          
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
    case 'city':
      return '#4CAF50'; // Green
    case 'wilderness':
      return '#795548'; // Brown
    case 'landmark':
      return '#FFC107'; // Amber
    case 'building':
      return '#607D8B'; // Blue Grey
    default:
      return '#9E9E9E'; // Grey
  }
}

/**
 * Gets a highlight color for location type
 */
function getLocationHighlightColor(type?: string): string {
  switch (type) {
    case 'city':
      return '#81C784'; // Light Green
    case 'wilderness':
      return '#A1887F'; // Light Brown
    case 'landmark':
      return '#FFD54F'; // Light Amber
    case 'building':
      return '#90A4AE'; // Light Blue Grey
    default:
      return '#BDBDBD'; // Light Grey
  }
}

/**
 * Gets a color for connection type
 */
function getConnectionColor(type: string): string {
  switch (type) {
    case 'road':
      return '#8D6E63'; // Brown
    case 'river':
      return '#42A5F5'; // Blue
    case 'path':
      return '#FF9800'; // Orange
    case 'border':
      return '#F44336'; // Red
    case 'sea-route':
      return '#26C6DA'; // Cyan
    default:
      return '#9E9E9E'; // Grey
  }
}

/**
 * Shows dialog to create or edit a connection between locations
 * @param locationId Optional ID of the source location
 * @param connectedLocId Optional ID of the target location when editing an existing connection
 */
function showLocationConnectionDialog(locationId?: number, connectedLocId?: number) {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  document.body.appendChild(modalOverlay);

  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'modal connection-modal';
  modalOverlay.appendChild(modal);

  // Find existing connection if editing between specific locations
  let existingConnection: { locationId: number; type: string; description?: string } | undefined = undefined;
  let connectedLocationId: number | undefined = connectedLocId;
  
  // If we have both source and target location IDs, we're likely editing an existing connection
  if (locationId && connectedLocId) {
    const location = state.locations.find(l => l.id === locationId);
    if (location && location.connections && location.connections.length > 0) {
      // Look for the specific connection between these two locations
      existingConnection = location.connections.find(conn => conn.locationId === connectedLocId);
    }
  } else if (locationId) {
    // We just have the source location, we're creating a new connection from this location
    connectedLocationId = undefined;
    existingConnection = undefined;
  }

  // Create connection dialog content
  modal.innerHTML = `
    <div class="modal-header">
      <h2>${existingConnection ? 'Edit Connection' : 'Location Connection'}</h2>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <form id="connection-form">
        <div class="form-group">
          <label for="location1-select">First Location</label>
          <select id="location1-select" required ${locationId ? 'disabled' : ''}>
            <option value="">Select a location</option>
            ${state.locations.map(loc => 
              `<option value="${loc.id}" ${loc.id === locationId ? 'selected' : ''}>${loc.name}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label for="connection-type">Connection Type</label>
          <select id="connection-type" required>
            <option value="">Select connection type</option>
            <option value="road" ${existingConnection?.type === 'road' ? 'selected' : ''}>Road</option>
            <option value="river" ${existingConnection?.type === 'river' ? 'selected' : ''}>River</option>
            <option value="path" ${existingConnection?.type === 'path' ? 'selected' : ''}>Path</option>
            <option value="border" ${existingConnection?.type === 'border' ? 'selected' : ''}>Border</option>
            <option value="sea-route" ${existingConnection?.type === 'sea-route' ? 'selected' : ''}>Sea Route</option>
            <option value="other" ${existingConnection?.type === 'other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="location2-select">Second Location</label>
          <select id="location2-select" required>
            <option value="">Select a location</option>
            ${state.locations
              .filter(loc => (!locationId || loc.id !== locationId)) // Don't show the first location as an option
              .map(loc => 
                `<option value="${loc.id}" ${loc.id === connectedLocationId ? 'selected' : ''}>${loc.name}</option>`
              ).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label for="connection-description">Description</label>
          <textarea id="connection-description" rows="3" placeholder="Describe this connection...">${existingConnection?.description || ''}</textarea>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button id="cancel-connection-btn" class="btn">Cancel</button>
      <button id="save-connection-btn" class="btn primary">Save Connection</button>
    </div>
  `;

  // Handle close button
  const closeBtn = modal.querySelector('.modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle cancel button
  const cancelBtn = modal.querySelector('#cancel-connection-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle save button
  const saveBtn = modal.querySelector('#save-connection-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const loc1Select = document.getElementById('location1-select') as HTMLSelectElement;
      const loc2Select = document.getElementById('location2-select') as HTMLSelectElement;
      const connectionTypeSelect = document.getElementById('connection-type') as HTMLSelectElement;
      const connectionDescription = document.getElementById('connection-description') as HTMLTextAreaElement;

      // Validate form
      if (!loc1Select.value || !loc2Select.value || !connectionTypeSelect.value) {
        alert('Please select both locations and a connection type.');
        return;
      }

      if (loc1Select.value === loc2Select.value) {
        alert('Please select two different locations.');
        return;
      }

      // Create connection
      const loc1Id = parseInt(loc1Select.value);
      const loc2Id = parseInt(loc2Select.value);
      const connType = connectionTypeSelect.value;
      const description = connectionDescription.value.trim();

      // Add connection to the first location
      const loc1 = state.locations.find(l => l.id === loc1Id);
      if (loc1) {
        if (!loc1.connections) {
          loc1.connections = [];
        }
        
        // Check if connection already exists
        const existingConnIdx = loc1.connections.findIndex(
          c => c.locationId === loc2Id
        );
        
        if (existingConnIdx >= 0) {
          // Update existing connection
          loc1.connections[existingConnIdx] = {
            locationId: loc2Id,
            type: connType,
            description
          };
        } else {
          // Add new connection
          loc1.connections.push({
            locationId: loc2Id,
            type: connType,
            description
          });
        }

        // Save the location with the new connection
        window.electronAPI.saveLocation(loc1)
          .then(() => {
            // Also create the reverse connection for bidirectional navigation
            const loc2 = state.locations.find(l => l.id === loc2Id);
            if (loc2) {
              if (!loc2.connections) {
                loc2.connections = [];
              }
              
              // Check if reverse connection already exists
              const existingReverseConnIdx = loc2.connections.findIndex(
                c => c.locationId === loc1Id
              );
              
              if (existingReverseConnIdx >= 0) {
                // Update existing reverse connection
                loc2.connections[existingReverseConnIdx] = {
                  locationId: loc1Id,
                  type: connType,
                  description
                };
              } else {
                // Add new reverse connection
                loc2.connections.push({
                  locationId: loc1Id,
                  type: connType,
                  description
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
          .catch(error => {
            console.error('Error saving connection:', error);
            alert('Failed to save the connection.');
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
  const locationMap = document.getElementById('location-map');
  const detailsContainer = document.getElementById('selected-location-details');
  
  if (!locationMap || !detailsContainer) {
    // If the panel isn't initialized, render it first
    renderLocationsPanel();
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
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  document.body.appendChild(modalOverlay);

  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'modal location-modal';
  modalOverlay.appendChild(modal);

  let location: Location = {
    id: 0,
    name: '',
    description: '',
    geography: '',
    climate: '',
    culture: '',
    notes: ''
  };

  // If editing an existing location, load the data
  if (locationId) {
    const existingLocation = state.locations.find(l => l.id === locationId);
    if (existingLocation) {
      location = { ...existingLocation };
    }
  }

  // Modal content
  modal.innerHTML = `
    <div class="modal-header">
      <h2>${locationId ? 'Edit Location' : 'Create New Location'}</h2>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <form id="location-form">
        <div class="form-group">
          <label for="location-name">Name</label>
          <input type="text" id="location-name" value="${location.name}" required>
        </div>
        
        <div class="form-group">
          <label for="location-type">Location Type</label>
          <select id="location-type">
            <option value="" ${!location.locationType ? 'selected' : ''}>Select a type...</option>
            <option value="city" ${location.locationType === 'city' ? 'selected' : ''}>City</option>
            <option value="wilderness" ${location.locationType === 'wilderness' ? 'selected' : ''}>Wilderness</option>
            <option value="landmark" ${location.locationType === 'landmark' ? 'selected' : ''}>Landmark</option>
            <option value="building" ${location.locationType === 'building' ? 'selected' : ''}>Building</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="location-description">Description</label>
          <textarea id="location-description" rows="3">${location.description || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label for="location-geography">Geography</label>
          <textarea id="location-geography" rows="2">${location.geography || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label for="location-climate">Climate</label>
          <textarea id="location-climate" rows="2">${location.climate || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label for="location-culture">Culture</label>
          <textarea id="location-culture" rows="3">${location.culture || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label for="location-notes">Notes</label>
          <textarea id="location-notes" rows="3">${location.notes || ''}</textarea>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button id="cancel-location-btn" class="btn">Cancel</button>
      <button id="save-location-btn" class="btn primary">Save Location</button>
    </div>
  `;

  // Handle close button
  const closeBtn = modal.querySelector('.modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle cancel button
  const cancelBtn = modal.querySelector('#cancel-location-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
    });
  }

  // Handle save button
  const saveBtn = modal.querySelector('#save-location-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const nameInput = document.getElementById('location-name') as HTMLInputElement;
      const locationTypeSelect = document.getElementById('location-type') as HTMLSelectElement;
      const descriptionInput = document.getElementById('location-description') as HTMLTextAreaElement;
      const geographyInput = document.getElementById('location-geography') as HTMLTextAreaElement;
      const climateInput = document.getElementById('location-climate') as HTMLTextAreaElement;
      const cultureInput = document.getElementById('location-culture') as HTMLTextAreaElement;
      const notesInput = document.getElementById('location-notes') as HTMLTextAreaElement;

      if (!nameInput.value.trim()) {
        alert('Location name is required');
        return;
      }

      // Prepare location data
      const updatedLocation: Location = {
        id: location.id || Date.now(),
        name: nameInput.value.trim(),
        description: descriptionInput.value.trim(),
        geography: geographyInput.value.trim(),
        climate: climateInput.value.trim(),
        culture: cultureInput.value.trim(),
        notes: notesInput.value.trim(),
        locationType: locationTypeSelect.value as 'city' | 'wilderness' | 'landmark' | 'building' || undefined,
        connections: location.connections || []
      };

      try {
        // Save location
        const result = await window.electronAPI.saveLocation(updatedLocation);
        
        if (result.success) {
          // Update ID if new location
          updatedLocation.id = result.id;
          
          // Update state
          if (locationId) {
            // Update existing location
            const index = state.locations.findIndex(l => l.id === locationId);
            if (index !== -1) {
              state.locations[index] = updatedLocation;
            }
          } else {
            // Add new location
            state.locations.push(updatedLocation);
          }
          
          // Re-render locations if currently visible
          if (state.currentView === 'locations') {
            renderLocationsList();
            renderLocationsPanel(); // First update the main panel
            renderLocationDetails(updatedLocation.id); // Then show the selected location details
            
            // Also select the location in the sidebar
            selectLocation(updatedLocation.id);
          }
          
          // Close modal
          document.body.removeChild(modalOverlay);
        } else {
          alert('Failed to save location');
        }
      } catch (error) {
        console.error('Error saving location:', error);
        alert(`Error saving location: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  // Focus on name input
  setTimeout(() => {
    const nameInput = document.getElementById('location-name') as HTMLInputElement;
    if (nameInput) {
      nameInput.focus();
    }
  }, 100);
}

/**
 * Renders the assets panel
 */
function renderAssetsPanel() {
  panelContent.innerHTML = `
    <div class="panel-header">
      <h2>Assets</h2>
      <button id="add-asset-btn">Add Asset</button>
    </div>
    <div class="assets-grid">
      ${
        state.assets.length > 0
          ? state.assets
              .map(
                (asset) => `
        <div class="asset-item" data-id="${asset.id}">
          <img class="asset-preview" src="${asset.path}" alt="${asset.name}">
          <span>${asset.name}</span>
        </div>
      `
              )
              .join("")
          : "<p>No assets yet. Add one to get started.</p>"
      }
    </div>
  `;

  const addAssetBtn = document.getElementById("add-asset-btn");
  if (addAssetBtn) {
    addAssetBtn.addEventListener("click", () => {
      // Opens asset import dialog
      showAssetDialog();
    });
  }
}

/**
 * Shows asset import dialog
 */
function showAssetDialog() {
  // Asset import dialog implementation
  console.log("Asset import dialog opened");
}

/**
 * Renders the AI assistant panel
 */
function renderAIPanel() {
  panelContent.innerHTML = `
    <div class="ai-assistant">
      <h2>AI Writing Assistant</h2>
      <div class="ai-prompt">
        <label for="ai-prompt-input">What would you like help with?</label>
        <textarea id="ai-prompt-input" 
          placeholder="e.g., Help me describe a castle in a thunderstorm"></textarea>
        <button id="ai-submit-btn">Generate</button>
      </div>
      <div class="ai-response" id="ai-response-container">
        AI response will appear here...
      </div>
    </div>
  `;

  const aiSubmitBtn = document.getElementById("ai-submit-btn");
  const aiPromptInput = document.getElementById(
    "ai-prompt-input"
  ) as HTMLTextAreaElement;
  const aiResponseContainer = document.getElementById("ai-response-container");

  if (aiSubmitBtn && aiPromptInput && aiResponseContainer) {
    aiSubmitBtn.addEventListener("click", async () => {
      const prompt = aiPromptInput.value.trim();
      if (!prompt) return;

      aiResponseContainer.innerHTML = "Generating...";

      try {
        // Gets the current chapter content for context
        const currentChapterContent =
          state.currentChapter !== null
            ? state.chapters[state.currentChapter].content
            : "";

        // Calls the AI service
        const response = await window.electronAPI.generateAIContent(prompt, {
          currentChapter: currentChapterContent,
          characters: state.characters,
          locations: state.locations,
        });

        aiResponseContainer.innerHTML = response.content;

        // Adds a button to insert the generated content
        const insertBtn = document.createElement("button");
        insertBtn.textContent = "Insert into Editor";
        insertBtn.classList.add("insert-ai-btn");
        insertBtn.addEventListener("click", () => {
          // Inserts the AI-generated text at the cursor position
          const doc = editor.getDoc();
          const cursor = doc.getCursor();
          doc.replaceRange(response.content, cursor);

          // Switches back to editor view
          switchView("editor");
        });

        aiResponseContainer.appendChild(insertBtn);
      } catch (error) {
        aiResponseContainer.innerHTML = `Error: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    });
  }
}

/**
 * Saves the current document
 */
async function saveDocument() {
  try {
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

    const result = await window.electronAPI.saveFile(
      JSON.stringify(document, null, 2),
      state.currentFilePath
    );

    if (result.success) {
      state.currentFilePath = result.filePath || null;
      state.isDirty = false;
      updateFileInfo();
    } else {
      console.error("Failed to save file:", result.error);
    }
  } catch (error) {
    console.error("Error saving file:", error);
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
    console.error('Error loading characters:', error);
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
    console.error('Error loading locations:', error);
  }
}

/**
 * Initializes the application
 */
async function initialize() {
  // Initializes the editor
  initializeEditor();

  // Sets up event listeners
  toolbarSections.forEach((section) => {
    section.addEventListener("click", () => {
      const sectionName = section.getAttribute("data-section");
      if (sectionName) {
        switchView(sectionName);
      }
    });
  });

  saveBtn.addEventListener("click", saveDocument);
  openBtn.addEventListener("click", openDocument);
  addChapterBtn.addEventListener("click", addNewChapter);

  // Load stored data
  await Promise.all([
    loadCharacters(),
    loadLocations()
  ]);

  // Initializes the UI
  updateFileInfo();
  renderChaptersList();
  switchView("editor");

  // Activates the editor toolbar section
  const editorSection = document.querySelector('[data-section="editor"]');
  if (editorSection) {
    editorSection.classList.add("active");
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", initialize);

// Declares the Electron API interface
// Settings panel rendering
function renderSettingsPanel() {
  panelContent.innerHTML = `
    <div class="settings-container">
      <h2>Settings</h2>
      
      <div class="settings-section">
        <h3>AI Configuration</h3>
        <div class="form-group">
          <label for="ai-provider">AI Provider</label>
          <select id="ai-provider">
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic Claude</option>
          </select>
        </div>
        
        <div id="openai-settings">
          <div class="form-group">
            <label for="openai-api-key">OpenAI API Key</label>
            <input type="password" id="openai-api-key" placeholder="sk-...">
          </div>
          <div class="form-group">
            <label for="openai-model">OpenAI Model</label>
            <select id="openai-model">
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
        </div>
        
        <div id="anthropic-settings" style="display: none;">
          <div class="form-group">
            <label for="anthropic-api-key">Anthropic API Key</label>
            <input type="password" id="anthropic-api-key" placeholder="sk-ant-...">
          </div>
          <div class="form-group">
            <label for="anthropic-model">Claude Model</label>
            <select id="anthropic-model">
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
            </select>
          </div>
        </div>
        
        <button id="save-ai-settings" class="btn primary">Save AI Settings</button>
      </div>
      
      <div class="settings-section">
        <h3>Editor Preferences</h3>
        <div class="form-group">
          <label for="theme-select">Theme</label>
          <select id="theme-select">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div class="form-group">
          <label for="font-size">Font Size</label>
          <input type="number" id="font-size" min="12" max="24" value="16">
        </div>
        <button id="save-editor-settings" class="btn primary">Save Editor Settings</button>
      </div>
    </div>
  `;

  // Gets the current configuration
  window.electronAPI.getConfig().then((config) => {
    // Sets current AI provider
    const aiProviderSelect = document.getElementById(
      "ai-provider"
    ) as HTMLSelectElement;
    if (aiProviderSelect) {
      aiProviderSelect.value = config.aiProvider.provider;
      toggleAISettings(config.aiProvider.provider);
    }

    // Sets OpenAI settings
    const openaiKeyInput = document.getElementById(
      "openai-api-key"
    ) as HTMLInputElement;
    const openaiModelSelect = document.getElementById(
      "openai-model"
    ) as HTMLSelectElement;
    if (openaiKeyInput && config.aiProvider.openaiApiKey) {
      openaiKeyInput.value = config.aiProvider.openaiApiKey;
    }
    if (openaiModelSelect && config.aiProvider.openaiModel) {
      openaiModelSelect.value = config.aiProvider.openaiModel;
    }

    // Sets Anthropic settings
    const anthropicKeyInput = document.getElementById(
      "anthropic-api-key"
    ) as HTMLInputElement;
    const anthropicModelSelect = document.getElementById(
      "anthropic-model"
    ) as HTMLSelectElement;
    if (anthropicKeyInput && config.aiProvider.anthropicApiKey) {
      anthropicKeyInput.value = config.aiProvider.anthropicApiKey;
    }
    if (anthropicModelSelect && config.aiProvider.anthropicModel) {
      anthropicModelSelect.value = config.aiProvider.anthropicModel;
    }

    // Sets editor preferences
    const themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;
    const fontSizeInput = document.getElementById(
      "font-size"
    ) as HTMLInputElement;
    if (themeSelect && config.theme) {
      themeSelect.value = config.theme;
    }
    if (fontSizeInput && config.fontSize) {
      fontSizeInput.value = config.fontSize.toString();
    }
  });

  // AI provider switch handler
  const aiProviderSelect = document.getElementById(
    "ai-provider"
  ) as HTMLSelectElement;
  if (aiProviderSelect) {
    aiProviderSelect.addEventListener("change", () => {
      toggleAISettings(aiProviderSelect.value);
    });
  }

  // Toggles between OpenAI and Anthropic settings
  function toggleAISettings(provider: string) {
    const openaiSettings = document.getElementById("openai-settings");
    const anthropicSettings = document.getElementById("anthropic-settings");

    if (openaiSettings && anthropicSettings) {
      if (provider === "openai") {
        openaiSettings.style.display = "block";
        anthropicSettings.style.display = "none";
      } else {
        openaiSettings.style.display = "none";
        anthropicSettings.style.display = "block";
      }
    }
  }

  // Save AI settings handler
  const saveAISettingsBtn = document.getElementById("save-ai-settings");
  if (saveAISettingsBtn) {
    saveAISettingsBtn.addEventListener("click", async () => {
      const provider = (
        document.getElementById("ai-provider") as HTMLSelectElement
      ).value;
      const openaiApiKey = (
        document.getElementById("openai-api-key") as HTMLInputElement
      ).value;
      const openaiModel = (
        document.getElementById("openai-model") as HTMLSelectElement
      ).value;
      const anthropicApiKey = (
        document.getElementById("anthropic-api-key") as HTMLInputElement
      ).value;
      const anthropicModel = (
        document.getElementById("anthropic-model") as HTMLSelectElement
      ).value;

      try {
        await window.electronAPI.updateAIConfig({
          provider: provider as "openai" | "anthropic",
          openaiApiKey,
          openaiModel,
          anthropicApiKey,
          anthropicModel,
        });

        alert("AI settings saved successfully!");
      } catch (error) {
        alert(
          `Error saving settings: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });
  }

  // Save editor settings handler
  const saveEditorSettingsBtn = document.getElementById("save-editor-settings");
  if (saveEditorSettingsBtn) {
    saveEditorSettingsBtn.addEventListener("click", async () => {
      const theme = (
        document.getElementById("theme-select") as HTMLSelectElement
      ).value;
      const fontSize = parseInt(
        (document.getElementById("font-size") as HTMLInputElement).value
      );

      try {
        await window.electronAPI.updateConfig({
          theme: theme as "light" | "dark",
          fontSize,
        });

        alert("Editor settings saved successfully!");

        // Updates editor immediately if needed
        if (theme === "dark") {
          editor.setOption("theme", "ayu-mirage");
        } else {
          editor.setOption("theme", "default");
        }

        editor.getWrapperElement().style.fontSize = `${fontSize}px`;
      } catch (error) {
        alert(
          `Error saving settings: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });
  }
}

declare global {
  interface Window {
    electronAPI: {
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
      getAppInfo: () => Promise<{
        version: string;
        platform: string;
        appPath: string;
      }>;
      generateAIContent: (
        prompt: string,
        context: any
      ) => Promise<{
        content: string;
      }>;
      saveCharacter: (character: any) => Promise<{
        success: boolean;
        id: number;
      }>;
      getCharacters: () => Promise<{
        characters: any[];
      }>;
      saveLocation: (location: any) => Promise<{
        success: boolean;
        id: number;
      }>;
      getLocations: () => Promise<{
        locations: any[];
      }>;
      saveAsset: (asset: any) => Promise<{
        success: boolean;
        id: number;
      }>;
      getAssets: () => Promise<{
        assets: any[];
      }>;
      // Configuration methods
      getConfig: () => Promise<any>;
      updateConfig: (config: any) => Promise<any>;
      getAIConfig: () => Promise<any>;
      updateAIConfig: (config: any) => Promise<any>;
    };
  }
}
