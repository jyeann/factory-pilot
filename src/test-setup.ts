import '@testing-library/jest-dom/vitest'
import { resetCategoriesForTests } from './lib/categories'

// Every test starts with empty storage and a fresh category store, so features never
// see each other's data.
afterEach(() => {
  localStorage.clear()
  resetCategoriesForTests()
})

// jsdom has no HTMLDialogElement.showModal/close; minimal polyfill for <dialog> tests.
if (typeof HTMLDialogElement !== 'undefined') {
  const proto = HTMLDialogElement.prototype
  if (!proto.showModal) {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true
    }
  }
  if (!proto.show) {
    proto.show = function show(this: HTMLDialogElement) {
      this.open = true
    }
  }
  if (!proto.close) {
    proto.close = function close(this: HTMLDialogElement, returnValue?: string) {
      if (!this.open) return
      this.open = false
      if (returnValue !== undefined) this.returnValue = returnValue
      this.dispatchEvent(new Event('close'))
    }
  }
}
