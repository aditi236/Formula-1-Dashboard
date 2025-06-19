// ----------------------------------------------------------------------
// 1) Helper Function: arraysEqual
// ----------------------------------------------------------------------
/**
 * Checks if two arrays are equal.
 * Two arrays are considered equal if they have the same length and each corresponding element is equal.
 *
 * @param {Array} a - The first array.
 * @param {Array} b - The second array.
 * @returns {boolean} - True if the arrays are equal; otherwise, false.
 */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ----------------------------------------------------------------------
// 2) Class: SelectionManager
// ----------------------------------------------------------------------
/**
 * The SelectionManager class maintains a shared selection state (an array of constructor IDs).
 * It provides methods to modify the selection (set, add, remove, toggle) and to subscribe/unsubscribe
 * to changes in the selection. When the selection state changes, all subscribed listeners are notified.
 */
class SelectionManager {
  // --------------------------------------------------------------------
  // 2.1) Constructor
  // --------------------------------------------------------------------
  /**
   * @param {Array} [initialSelection=[]] - Optional initial selection array.
   */
  constructor(initialSelection = []) {
    // Copy initial selection to avoid external mutations
    this.selection = initialSelection.slice();
    // Array to store listener functions that are notified on selection changes
    this.listeners = [];
  }

  // --------------------------------------------------------------------
  // 2.2) Method: setSelection
  // --------------------------------------------------------------------
  /**
   * Sets the selection state to a new array of IDs.
   * Notifies subscribers only if the new selection differs from the current state.
   *
   * @param {Array} newSelection - The new selection array.
   */
  setSelection(newSelection) {
    if (!arraysEqual(newSelection, this.selection)) {
      this.selection = newSelection.slice();
      this.notify();
    }
  }

  // --------------------------------------------------------------------
  // 2.3) Method: add
  // --------------------------------------------------------------------
  /**
   * Adds a new ID to the selection if it is not already present.
   * If adding the ID would exceed the maximum allowed selection (5), an alert is shown.
   *
   * @param {string} id - The constructor ID to add.
   */
  add(id) {
    if (!this.selection.includes(id)) {
      if (this.selection.length >= 5) {
        alert("Maximum of 5 constructors allowed.");
        return;
      }
      this.selection.push(id);
      this.notify();
    }
  }

  // --------------------------------------------------------------------
  // 2.4) Method: remove
  // --------------------------------------------------------------------
  /**
   * Removes an ID from the selection if it exists.
   *
   * @param {string} id - The constructor ID to remove.
   */
  remove(id) {
    if (this.selection.includes(id)) {
      this.selection = this.selection.filter(x => x !== id);
      this.notify();
    }
  }

  // --------------------------------------------------------------------
  // 2.5) Method: toggle
  // --------------------------------------------------------------------
  /**
   * Toggles the selection state for a given ID.
   * If the ID is present, it is removed; if not, it is added.
   *
   * @param {string} id - The constructor ID to toggle.
   */
  toggle(id) {
    if (this.selection.includes(id)) {
      this.remove(id);
    } else {
      this.add(id);
    }
  }

  // --------------------------------------------------------------------
  // 2.6) Method: subscribe
  // --------------------------------------------------------------------
  /**
   * Subscribes a listener function to selection changes.
   * The listener is called with the new selection array whenever it changes.
   *
   * @param {Function} listener - The function to subscribe.
   */
  subscribe(listener) {
    this.listeners.push(listener);
  }

  // --------------------------------------------------------------------
  // 2.7) Method: unsubscribe
  // --------------------------------------------------------------------
  /**
   * Unsubscribes a listener function from selection changes.
   *
   * @param {Function} listener - The function to unsubscribe.
   */
  unsubscribe(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // --------------------------------------------------------------------
  // 2.8) Method: notify
  // --------------------------------------------------------------------
  /**
   * Notifies all subscribed listeners about the current selection state.
   */
  notify() {
    this.listeners.forEach(listener => listener(this.selection));
  }
}

// ----------------------------------------------------------------------
// 3) Global Instance of SelectionManager
// ----------------------------------------------------------------------
// Create and attach a global instance of SelectionManager. This instance is
// accessible via window.selectionManager and is used by other parts of the application.
window.selectionManager = new SelectionManager();
