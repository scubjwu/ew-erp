import "@testing-library/jest-dom/vitest";

/** Radix Select / portals expect DOM APIs that jsdom omits or stubs poorly. */
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  Element.prototype.scrollIntoView = function () {
    /* noop for Radix Select focus management in tests */
  };
}
