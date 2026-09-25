/* Keyboard shortcut reference — compiled for TypingTestKaro */
module.exports = [
  {
    group: "General (Windows)",
    items: [
      { keys: "Ctrl + C", action: "Copy selected item" },
      { keys: "Ctrl + X", action: "Cut selected item" },
      { keys: "Ctrl + V", action: "Paste from clipboard" },
      { keys: "Ctrl + Z", action: "Undo last action" },
      { keys: "Ctrl + Y", action: "Redo last undone action" },
      { keys: "Ctrl + A", action: "Select all items" },
      { keys: "Alt + Tab", action: "Switch between open windows" },
      { keys: "Alt + F4", action: "Close the active window or app" },
      { keys: "Win", action: "Open or close the Start menu" },
      { keys: "Win + D", action: "Show or hide the desktop" },
      { keys: "Win + E", action: "Open File Explorer" },
      { keys: "Win + L", action: "Lock the computer" },
      { keys: "Win + R", action: "Open the Run dialog box" },
      { keys: "Win + I", action: "Open Settings" },
      { keys: "Win + Tab", action: "Open Task View" },
      { keys: "Win + V", action: "Open clipboard history" },
      { keys: "Win + Shift + S", action: "Take a screenshot of a selected area" },
      { keys: "Win + Left / Right Arrow", action: "Snap the window to the left or right half of the screen" },
      { keys: "Ctrl + Shift + Esc", action: "Open Task Manager" },
      { keys: "Print Screen", action: "Capture the full screen to the clipboard" }
    ]
  },
  {
    group: "Text Editing",
    items: [
      { keys: "Home", action: "Move cursor to the start of the line" },
      { keys: "End", action: "Move cursor to the end of the line" },
      { keys: "Ctrl + Home", action: "Move cursor to the beginning of the document" },
      { keys: "Ctrl + End", action: "Move cursor to the end of the document" },
      { keys: "Ctrl + Left / Right Arrow", action: "Move cursor one word left or right" },
      { keys: "Ctrl + Backspace", action: "Delete the previous word" },
      { keys: "Ctrl + Delete", action: "Delete the next word" },
      { keys: "Shift + Left / Right Arrow", action: "Extend selection one character at a time" },
      { keys: "Ctrl + Shift + Left / Right Arrow", action: "Extend selection one word at a time" },
      { keys: "Shift + Home", action: "Select from cursor to the start of the line" },
      { keys: "Shift + End", action: "Select from cursor to the end of the line" },
      { keys: "Ctrl + Shift + Home / End", action: "Select from cursor to the start or end of the document" },
      { keys: "Page Up / Page Down", action: "Scroll up or down one screen" },
      { keys: "Ctrl + B", action: "Bold selected text" },
      { keys: "Ctrl + I", action: "Italicise selected text" },
      { keys: "Ctrl + U", action: "Underline selected text" }
    ]
  },
  {
    group: "MS Word",
    items: [
      { keys: "Ctrl + N", action: "Create a new document" },
      { keys: "Ctrl + O", action: "Open an existing document" },
      { keys: "Ctrl + S", action: "Save the document" },
      { keys: "F12", action: "Save As" },
      { keys: "Ctrl + P", action: "Print the document" },
      { keys: "Ctrl + E", action: "Center align the paragraph" },
      { keys: "Ctrl + L", action: "Left align the paragraph" },
      { keys: "Ctrl + R", action: "Right align the paragraph" },
      { keys: "Ctrl + J", action: "Justify the paragraph" },
      { keys: "Ctrl + F", action: "Find text" },
      { keys: "Ctrl + H", action: "Find and Replace" },
      { keys: "Ctrl + G", action: "Go To a page, line or section" },
      { keys: "Ctrl + Enter", action: "Insert a page break" },
      { keys: "Ctrl + K", action: "Insert a hyperlink" },
      { keys: "Ctrl + ] / Ctrl + [", action: "Increase or decrease font size by one point" },
      { keys: "Shift + F3", action: "Change case of selected text" },
      { keys: "F7", action: "Run Spelling and Grammar check" },
      { keys: "Ctrl + D", action: "Open the Font dialog box" }
    ]
  },
  {
    group: "MS Excel",
    items: [
      { keys: "Ctrl + N", action: "Create a new workbook" },
      { keys: "F2", action: "Edit the active cell" },
      { keys: "Alt + =", action: "Insert AutoSum" },
      { keys: "Ctrl + ;", action: "Insert the current date" },
      { keys: "Ctrl + Shift + ;", action: "Insert the current time" },
      { keys: "Alt + Enter", action: "Start a new line within the same cell" },
      { keys: "F4", action: "Toggle absolute and relative references while editing a formula" },
      { keys: "Ctrl + Arrow Key", action: "Jump to the edge of the current data region" },
      { keys: "Ctrl + Home", action: "Go to cell A1" },
      { keys: "Ctrl + End", action: "Go to the last used cell" },
      { keys: "Ctrl + Space", action: "Select the entire column" },
      { keys: "Shift + Space", action: "Select the entire row" },
      { keys: "Ctrl + D", action: "Fill down from the cell above" },
      { keys: "Ctrl + R", action: "Fill right from the cell on the left" },
      { keys: "Ctrl + 1", action: "Open the Format Cells dialog box" },
      { keys: "Ctrl + Shift + L", action: "Turn filters on or off" },
      { keys: "Ctrl + Page Down / Page Up", action: "Move to the next or previous worksheet" },
      { keys: "Shift + F11", action: "Insert a new worksheet" },
      { keys: "F11", action: "Create a chart on a new sheet" }
    ]
  },
  {
    group: "Web Browser",
    items: [
      { keys: "Ctrl + T", action: "Open a new tab" },
      { keys: "Ctrl + W", action: "Close the current tab" },
      { keys: "Ctrl + Shift + T", action: "Reopen the last closed tab" },
      { keys: "Ctrl + Tab", action: "Go to the next tab" },
      { keys: "Ctrl + Shift + Tab", action: "Go to the previous tab" },
      { keys: "Ctrl + N", action: "Open a new window" },
      { keys: "Ctrl + Shift + N", action: "Open a new private (Incognito/InPrivate) window in Chrome or Edge" },
      { keys: "Ctrl + L", action: "Focus the address bar" },
      { keys: "F5 / Ctrl + R", action: "Reload the page" },
      { keys: "Ctrl + F5", action: "Reload the page ignoring cached content" },
      { keys: "Ctrl + D", action: "Bookmark the current page" },
      { keys: "Ctrl + H", action: "Open browsing history" },
      { keys: "Ctrl + J", action: "Open downloads" },
      { keys: "Ctrl + F", action: "Find text on the page" },
      { keys: "Ctrl + + / Ctrl + -", action: "Zoom in or out" },
      { keys: "Ctrl + 0", action: "Reset zoom to default" },
      { keys: "Alt + Left / Right Arrow", action: "Go back or forward" },
      { keys: "F11", action: "Toggle full-screen mode" },
      { keys: "Ctrl + Shift + Delete", action: "Open Clear browsing data" }
    ]
  },
  {
    group: "Windows Explorer / File Management",
    items: [
      { keys: "Win + E", action: "Open File Explorer" },
      { keys: "Ctrl + Shift + N", action: "Create a new folder" },
      { keys: "F2", action: "Rename the selected file or folder" },
      { keys: "Delete", action: "Move the selected item to the Recycle Bin" },
      { keys: "Shift + Delete", action: "Delete permanently without using the Recycle Bin" },
      { keys: "Alt + Enter", action: "Open Properties of the selected item" },
      { keys: "Alt + Up Arrow", action: "Go up one folder level" },
      { keys: "Alt + Left / Right Arrow", action: "Go back or forward" },
      { keys: "Ctrl + A", action: "Select all files and folders" },
      { keys: "Ctrl + Click", action: "Select multiple individual items" },
      { keys: "Shift + Click", action: "Select a continuous range of items" },
      { keys: "Ctrl + F / F3", action: "Search in the current folder" },
      { keys: "Alt + D", action: "Focus the address bar" },
      { keys: "Alt + P", action: "Show or hide the preview pane" },
      { keys: "F5", action: "Refresh the folder view" },
      { keys: "Ctrl + W", action: "Close the current Explorer window" }
    ]
  },
  {
    group: "Function Keys (F1–F12)",
    items: [
      { keys: "F1", action: "Open Help in most programs" },
      { keys: "F2", action: "Rename a file in Explorer or edit the active cell in Excel" },
      { keys: "F3", action: "Open search in File Explorer" },
      { keys: "F4", action: "Repeat the last action in Word or toggle absolute references in Excel; Alt + F4 closes a window" },
      { keys: "F5", action: "Refresh a page or folder, or start a slide show in PowerPoint" },
      { keys: "F6", action: "Cycle focus between screen elements, such as the browser address bar" },
      { keys: "F7", action: "Run Spelling and Grammar check in MS Office" },
      { keys: "F8", action: "Turn on extend-selection mode in Word; opens Advanced Boot Options at startup on older Windows versions" },
      { keys: "F9", action: "Update fields in Word or recalculate formulas in Excel" },
      { keys: "F10", action: "Activate the menu bar or ribbon key tips" },
      { keys: "F11", action: "Toggle full-screen mode in a browser or create a chart in Excel" },
      { keys: "F12", action: "Open Save As in MS Office or developer tools in a browser" }
    ]
  }
];
