export const createDeferredChannelCleanup = (
    subscribe: () => any,
    removeChannel: (channel: any) => Promise<unknown>
) => {
    let channel: any = null;
    let disposed = false;
    const timeoutId = globalThis.setTimeout(() => {
        if (disposed) return;
        channel = subscribe();
    }, 0);

    return () => {
        disposed = true;
        globalThis.clearTimeout(timeoutId);
        if (channel) {
            void removeChannel(channel).catch(() => undefined);
        }
    };
};
