// Minimal pub/sub event bus shared across web components
const target = new EventTarget();

export const bus = {
  emit(name, detail) {
    target.dispatchEvent(new CustomEvent(name, { detail }));
  },
  on(name, handler) {
    target.addEventListener(name, handler);
    return () => target.removeEventListener(name, handler);
  },
};
