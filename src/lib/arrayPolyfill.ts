// ponytail: keep the fallback until the browser target requires ES2023.
if (!Array.prototype.toSorted) {
    Object.defineProperty(Array.prototype, 'toSorted', {
        configurable: true,
        enumerable: false,
        writable: true,
        value<T>(this: T[], compareFn?: (left: T, right: T) => number) {
            return Array.from(this).sort(compareFn);
        }
    });
}

export {};
