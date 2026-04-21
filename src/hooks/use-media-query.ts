import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  const [value, setValue] = useState(false);

  useEffect(() => {
    // Only run on client
    const mql = window.matchMedia(query);

    const onChange = (event: MediaQueryListEvent) => {
      setValue(event.matches);
    };

    // Set initial value inside useEffect to avoid hydration mismatch
    // But we need to avoid synchronous setState inside effect if possible or accept it
    // The warning says: Calling setState synchronously within an effect can trigger cascading renders
    // We can't avoid it if we want to sync with browser state immediately on mount
    // However, we can use useLayoutEffect or just accept that initial render might be wrong (false) then update to true
    // Or we can initialize state with a function if we accept SSR mismatch warning, but we don't want that.
    // The clean way is to let the effect run and update.
    // But to avoid the warning, we can check if the value is different before setting it? No, it's about the sync call.

    // Actually, setting it immediately is fine if we want to catch the initial state.
    // The warning comes because we are updating state immediately after mount.
    // If we want to avoid it, we can wrap it in a condition or just let the event listener handle future changes,
    // but we need the initial value.

    // Let's try to set it only if it's different to minimize updates, but effect runs after render anyway.
    if (mql.matches !== value) {
      setValue(mql.matches);
    }

    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]); // Removed 'value' from dependency to avoid loop, though logic suggests we just need to run on query change.

  return value;
}
