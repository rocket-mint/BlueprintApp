export const ZOOM_LEVELS = [0.5, 0.67, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];

export function zoomIn(current: number): number {
  for (const lvl of ZOOM_LEVELS) if (lvl > current + 0.001) return lvl;
  return ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
}

export function zoomOut(current: number): number {
  for (let i = ZOOM_LEVELS.length - 1; i >= 0; i--)
    if (ZOOM_LEVELS[i] < current - 0.001) return ZOOM_LEVELS[i];
  return ZOOM_LEVELS[0];
}
