// Dark Theme Toggle
const darkModeToggle = document.getElementById("dark-mode-toggle");
const htmlElement = document.documentElement;

// Check for saved theme preference
const savedTheme = localStorage.getItem("dark-theme");
if (savedTheme === "true") {
  htmlElement.setAttribute("data-theme", "dark");
  darkModeToggle.querySelector("i").classList.replace("fa-moon", "fa-sun");
}

// Toggle dark theme
darkModeToggle.addEventListener("click", () => {
  const isDark = htmlElement.getAttribute("data-theme") === "dark";
  const icon = darkModeToggle.querySelector("i");

  if (isDark) {
    htmlElement.removeAttribute("data-theme");
    icon.classList.replace("fa-sun", "fa-moon");
    localStorage.setItem("dark-theme", "false");
  } else {
    htmlElement.setAttribute("data-theme", "dark");
    icon.classList.replace("fa-moon", "fa-sun");
    localStorage.setItem("dark-theme", "true");
  }
});

// Custom Cursor
const cursor = document.querySelector(".custom-cursor");

document.addEventListener("mousemove", (e) => {
  cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
});

// Theme Switching with cursor color update
const themeSwitchers = document.querySelectorAll(".theme-switcher button");
themeSwitchers.forEach((button) => {
  button.addEventListener("click", () => {
    const theme = button.dataset.theme;
    document.body.className = `theme-${theme}`;
    themeSwitchers.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Update cursor color based on theme
    const computedStyle = getComputedStyle(button);
    const buttonColor = computedStyle.backgroundColor;
    cursor.style.background = buttonColor;
    cursor.style.boxShadow = `0 0 10px ${buttonColor}`;

    // Save current theme to localStorage
    localStorage.setItem("current-theme", theme);
  });
});

// Interactive elements cursor effect
document.addEventListener("mouseover", (e) => {
  const target = e.target;
  if (
    target.matches(
      "button, .note-content, .tag-input, .btn-icon, .note-resize-handle"
    )
  ) {
    cursor.classList.add("hover");
    if (target.matches(".btn-primary, .theme-switcher button.active")) {
      const computedStyle = getComputedStyle(target);
      cursor.style.background = computedStyle.backgroundColor;
    }
  }
});

document.addEventListener("mouseout", (e) => {
  const target = e.target;
  if (
    target.matches(
      "button, .note-content, .tag-input, .btn-icon, .note-resize-handle"
    )
  ) {
    cursor.classList.remove("hover");
    // Restore theme color
    const currentTheme = document.body.className.replace("theme-", "");
    const themeButton = document.querySelector(
      `.theme-switcher button[data-theme="${currentTheme}"]`
    );
    const computedStyle = getComputedStyle(themeButton);
    cursor.style.background = computedStyle.backgroundColor;
  }
});

// Mouse click animation
document.addEventListener("mousedown", () => {
  cursor.classList.add("active");
});

document.addEventListener("mouseup", () => {
  cursor.classList.remove("active");
});

// Note Management
class Note {
  constructor(content = "", theme = "calm", shouldSave = true) {
    if (
      typeof content !== "string" ||
      !["calm", "energetic", "focus", "creative"].includes(theme)
    ) {
      console.error("Invalid note parameters");
      return;
    }

    this.id = Date.now();
    this.content = content;
    this.tagInputContent = ""; // Only keep tag input content
    this.timestamp = new Date();
    this.theme = theme;
    this.isDragging = false;
    this.element = this.createNoteElement();

    if (!this.element) {
      console.error("Failed to create note element");
      return;
    }

    if (shouldSave) {
      this.save();
    }
  }

  createNoteElement() {
    const template = document.getElementById("note-template");
    if (!template) {
      console.error("Note template not found");
      return null;
    }

    const element = template.content.firstElementChild.cloneNode(true);
    element.id = `note-${this.id}`;

    const contentDiv = element.querySelector(".note-content");
    if (contentDiv) {
      contentDiv.textContent = this.content;
      contentDiv.setAttribute("contenteditable", "true");
    }

    const timestamp = element.querySelector(".timestamp");
    if (timestamp) {
      timestamp.textContent = this.formatTimestamp();
    }

    this.element = element;
    this.setupEventListeners();
    this.setupDragging();
    this.setupResizing();

    return element;
  }

  setupEventListeners() {
    const contentDiv = this.element.querySelector(".note-content");
    const tagInput = this.element.querySelector(".tag-input");
    const deleteBtn = this.element.querySelector(".delete");

    if (contentDiv) {
      contentDiv.addEventListener("input", () => {
        this.content = contentDiv.textContent;
        this.save();
      });
    }

    if (tagInput) {
      // Save tag input content as user types
      tagInput.addEventListener("input", () => {
        this.tagInputContent = tagInput.value;
        this.save();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        this.delete();
      });
    }
  }

  setupDragging() {
    if (!this.element) return;

    let initialX, initialY;

    this.element.addEventListener("mousedown", (e) => {
      // Don't initiate drag if clicking on interactive elements
      if (
        e.target.closest(
          ".note-content, .tag-input, .btn-icon, .note-resize-handle"
        )
      ) {
        return;
      }

      e.preventDefault();

      // Store initial position
      const rect = this.element.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      // Store original scroll position
      const originalScrollX = window.scrollX;
      const originalScrollY = window.scrollY;

      // Prepare for dragging
      this.element.style.position = "absolute";
      this.element.style.zIndex = "1000";
      this.isDragging = true;
      this.element.classList.add("dragging");

      const mouseMoveHandler = (e) => {
        if (!this.isDragging) return;

        // Calculate scroll difference
        const scrollDiffX = window.scrollX - originalScrollX;
        const scrollDiffY = window.scrollY - originalScrollY;

        // Position note closer to cursor (using smaller offset)
        const offsetX = this.element.offsetWidth / 4; // Reduced from half to quarter
        const offsetY = this.element.offsetHeight / 4; // Reduced from half to quarter

        this.element.style.left = `${e.clientX - offsetX + scrollDiffX}px`;
        this.element.style.top = `${e.clientY - offsetY + scrollDiffY}px`;
      };

      const mouseUpHandler = () => {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.element.classList.remove("dragging");

        // Get the current container and important measurements
        const currentTheme =
          document.body.className.replace("theme-", "") || "calm";
        const container = document.querySelector(`#${currentTheme}-notes`);

        if (container) {
          const containerRect = container.getBoundingClientRect();
          const noteRect = this.element.getBoundingClientRect();
          const headerHeight = document
            .querySelector("header")
            .getBoundingClientRect().height;
          const controlsHeight = document
            .querySelector(".controls")
            .getBoundingClientRect().height;

          // Get current position relative to viewport
          const currentX = noteRect.left;
          const currentY = noteRect.top;

          // Function to check if a position is valid
          const isValidPosition = (x, y) => {
            if (
              x < containerRect.left ||
              x + noteRect.width > containerRect.right ||
              y < containerRect.top ||
              y + noteRect.height > containerRect.bottom
            ) {
              return false;
            }

            if (y < headerHeight + controlsHeight) {
              return false;
            }

            const otherNotes = Array.from(
              container.querySelectorAll(".note")
            ).filter((note) => note !== this.element);
            return !otherNotes.some((note) => {
              const otherRect = note.getBoundingClientRect();
              return !(
                x + noteRect.width + 5 <= otherRect.left ||
                x >= otherRect.right + 5 ||
                y + noteRect.height + 5 <= otherRect.top ||
                y >= otherRect.bottom + 5
              );
            });
          };

          if (!isValidPosition(currentX, currentY)) {
            // Find nearest valid position
            let found = false;
            let nearestX = currentX;
            let nearestY = currentY;
            let minDistance = Number.MAX_VALUE;

            const step = 5;
            const maxRadius = 300;

            for (
              let radius = step;
              radius <= maxRadius && !found;
              radius += step
            ) {
              for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
                const tryX = currentX + radius * Math.cos(angle);
                const tryY = currentY + radius * Math.sin(angle);

                if (isValidPosition(tryX, tryY)) {
                  const distance = Math.hypot(tryX - currentX, tryY - currentY);
                  if (distance < minDistance) {
                    minDistance = distance;
                    nearestX = tryX;
                    nearestY = tryY;
                    found = true;
                  }
                }
              }
            }

            if (!found) {
              // Return to initial position if no valid spot found
              nearestX = initialX;
              nearestY = initialY;
            }

            // Smooth transition to new position
            this.element.style.transition = "all 0.2s ease-out";
            this.element.style.left = `${nearestX + window.scrollX}px`;
            this.element.style.top = `${nearestY + window.scrollY}px`;

            setTimeout(() => {
              this.element.style.transition = "";
            }, 200);
          }
        }

        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);

        // Save the new position
        this.save();
      };

      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
    });
  }

  setupResizing() {
    const handle = this.element.querySelector(".note-resize-handle");
    if (!handle) return;

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(getComputedStyle(this.element).width, 10);
      startHeight = parseInt(getComputedStyle(this.element).height, 10);

      const mouseMoveHandler = (e) => {
        if (!isResizing) return;

        const width = startWidth + (e.clientX - startX);
        const height = startHeight + (e.clientY - startY);

        this.element.style.width = `${Math.max(200, width)}px`;
        this.element.style.height = `${Math.max(150, height)}px`;
      };

      const mouseUpHandler = () => {
        isResizing = false;
        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);
        this.save();
      };

      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
    });
  }

  save() {
    const noteData = {
      id: this.id,
      content: this.content,
      tagInputContent: this.tagInputContent,
      timestamp: this.timestamp,
      theme: this.theme,
      position: {
        left: this.element.style.left,
        top: this.element.style.top,
      },
    };

    const notes = JSON.parse(localStorage.getItem("notes") || "[]");
    const existingIndex = notes.findIndex((note) => note.id === this.id);

    if (existingIndex !== -1) {
      notes[existingIndex] = noteData;
    } else {
      notes.push(noteData);
    }

    localStorage.setItem("notes", JSON.stringify(notes));
  }

  delete() {
    this.element.style.animation = "noteDisappear 0.3s ease-out forwards";
    setTimeout(() => {
      this.element.remove();
      const notes = JSON.parse(localStorage.getItem("notes") || "[]");
      const updatedNotes = notes.filter((note) => note.id !== this.id);
      localStorage.setItem("notes", JSON.stringify(updatedNotes));
    }, 300);
  }

  formatTimestamp() {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(this.timestamp);
  }

  static loadFromStorage() {
    const savedNotes = JSON.parse(localStorage.getItem("notes") || "[]");

    if (Array.isArray(savedNotes)) {
      savedNotes.forEach((noteData) => {
        if (
          noteData &&
          noteData.id &&
          noteData.theme &&
          ["calm", "energetic", "focus", "creative"].includes(noteData.theme) &&
          typeof noteData.content === "string"
        ) {
          const note = new Note(noteData.content, noteData.theme, false);
          note.id = noteData.id;
          note.timestamp = new Date(noteData.timestamp);
          note.tagInputContent = noteData.tagInputContent || "";

          // Restore tag input value
          const tagInput = note.element.querySelector(".tag-input");
          if (tagInput && noteData.tagInputContent) {
            tagInput.value = noteData.tagInputContent;
          }

          // Restore position
          if (noteData.position) {
            note.element.style.position = "absolute";
            note.element.style.left = noteData.position.left || "0px";
            note.element.style.top = noteData.position.top || "0px";
          }

          // Add to container
          const container = document.querySelector(`#${noteData.theme}-notes`);
          if (container) {
            container.appendChild(note.element);
          }
        }
      });
    }
  }
}

// Clear all notes (helper function)
function clearAllNotes() {
  // Clear localStorage
  localStorage.removeItem("notes");

  // Clear all containers
  document.querySelectorAll(".notes-container").forEach((container) => {
    container.innerHTML = "";
  });
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  const addNoteBtn = document.getElementById("add-note");
  const deleteAllBtn = document.getElementById("delete-all");
  const gridViewBtn = document.getElementById("grid-view");
  const timelineViewBtn = document.getElementById("timeline-view");

  // Restore the saved theme
  const savedTheme = localStorage.getItem("current-theme") || "calm";
  document.body.className = `theme-${savedTheme}`;
  const savedThemeButton = document.querySelector(
    `.theme-switcher button[data-theme="${savedTheme}"]`
  );
  if (savedThemeButton) {
    themeSwitchers.forEach((btn) => btn.classList.remove("active"));
    savedThemeButton.classList.add("active");

    // Update cursor color for the saved theme
    const computedStyle = getComputedStyle(savedThemeButton);
    const buttonColor = computedStyle.backgroundColor;
    cursor.style.background = buttonColor;
    cursor.style.boxShadow = `0 0 10px ${buttonColor}`;
  }

  // Clear all containers before loading notes
  document.querySelectorAll(".notes-container").forEach((container) => {
    container.innerHTML = "";
  });

  // Load saved notes
  Note.loadFromStorage();

  // Delete all notes in current theme section
  deleteAllBtn.addEventListener("click", () => {
    const currentTheme =
      document.body.className.replace("theme-", "") || "calm";
    const container = document.querySelector(`#${currentTheme}-notes`);

    if (container) {
      // Add fade-out animation to all notes
      const notes = container.querySelectorAll(".note");
      notes.forEach((note) => {
        note.style.animation = "noteDisappear 0.3s ease-out forwards";
      });

      // Remove notes after animation
      setTimeout(() => {
        container.innerHTML = "";

        // Update localStorage to remove notes of current theme
        const savedNotes = JSON.parse(localStorage.getItem("notes") || "[]");
        const updatedNotes = savedNotes.filter(
          (note) => note.theme !== currentTheme
        );
        localStorage.setItem("notes", JSON.stringify(updatedNotes));
      }, 300);
    }
  });

  // Add New Note
  addNoteBtn.addEventListener("click", () => {
    const currentTheme =
      document.body.className.replace("theme-", "") || "calm";
    const container = document.querySelector(`#${currentTheme}-notes`);

    if (!container) {
      console.error(`Container not found for theme: ${currentTheme}`);
      return;
    }

    const note = new Note("", currentTheme, true); // Save new notes created by user
    if (!note.element) {
      console.error("Failed to create new note");
      return;
    }

    container.appendChild(note.element);

    // Find empty space for the new note
    const noteWidth = 300; // Width of note
    const noteHeight = 200; // Height of note
    const padding = 32; // Padding between notes (2rem)
    const headerHeight = document
      .querySelector("header")
      .getBoundingClientRect().height;
    const controlsHeight = document
      .querySelector(".controls")
      .getBoundingClientRect().height;

    // Get all existing notes in the container
    const existingNotes = Array.from(
      container.querySelectorAll(".note")
    ).filter((n) => n !== note.element);

    // Function to check if a position is occupied
    const isPositionOccupied = (x, y) => {
      return existingNotes.some((existingNote) => {
        const rect = existingNote.getBoundingClientRect();
        return !(
          x + noteWidth + padding <= rect.left ||
          x >= rect.right + padding ||
          y + noteHeight + padding <= rect.top ||
          y >= rect.bottom + padding
        );
      });
    };

    // Function to check if position is within container bounds
    const isWithinBounds = (x, y) => {
      const containerRect = container.getBoundingClientRect();
      return (
        x >= containerRect.left &&
        x + noteWidth <= containerRect.right &&
        y >= headerHeight + controlsHeight &&
        y + noteHeight <= containerRect.bottom
      );
    };

    // Find the first empty position
    let foundPosition = false;
    let posX = container.getBoundingClientRect().left + padding;
    let posY = headerHeight + controlsHeight + padding;
    const maxY = Math.max(
      container.scrollHeight,
      window.innerHeight - headerHeight - controlsHeight
    );

    // Grid-based positioning
    const gridX = noteWidth + padding;
    const gridY = noteHeight + padding;

    for (let y = posY; y < maxY && !foundPosition; y += gridY) {
      for (
        let x = posX;
        x < container.getBoundingClientRect().right - noteWidth;
        x += gridX
      ) {
        if (!isPositionOccupied(x, y) && isWithinBounds(x, y)) {
          note.element.style.position = "absolute";
          note.element.style.left = `${x}px`;
          note.element.style.top = `${y}px`;
          foundPosition = true;
          break;
        }
      }
    }

    // If no empty space found, place at the bottom
    if (!foundPosition) {
      const lastNote = existingNotes[existingNotes.length - 1];
      const y = lastNote
        ? lastNote.getBoundingClientRect().bottom + padding
        : headerHeight + controlsHeight + padding;

      note.element.style.position = "absolute";
      note.element.style.left = `${posX}px`;
      note.element.style.top = `${y}px`;
    }

    // Focus the content area
    const contentDiv = note.element.querySelector(".note-content");
    if (contentDiv) {
      contentDiv.focus();
    }

    // Save the position
    note.save();
  });

  // View Switching
  gridViewBtn.addEventListener("click", () => {
    document.querySelectorAll(".notes-container").forEach((container) => {
      container.classList.remove("timeline-view");
      container.classList.add("grid-view");
    });
    gridViewBtn.classList.add("active");
    timelineViewBtn.classList.remove("active");
  });

  timelineViewBtn.addEventListener("click", () => {
    document.querySelectorAll(".notes-container").forEach((container) => {
      container.classList.remove("grid-view");
      container.classList.add("timeline-view");
    });
    timelineViewBtn.classList.add("active");
    gridViewBtn.classList.remove("active");
  });
});
