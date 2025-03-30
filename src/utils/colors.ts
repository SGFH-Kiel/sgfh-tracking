// Convert hex color to RGB values
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate relative luminance using WCAG formula
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Get contrasting text color (black or white) based on background color
export function getContrastColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

// Predefined color palette for boats
export const boatColors = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Light Blue
  '#96CEB4', // Sage Green
  '#FFEEAD', // Light Yellow
  '#D4A5A5', // Dusty Rose
  '#9B5DE5', // Purple
  '#F15BB5', // Pink
  '#00BBF9', // Bright Blue
  '#00F5D4', // Mint
  '#FEE440', // Yellow
  '#8AC926', // Lime Green
  '#FF99C8', // Light Pink
  '#FCF6BD', // Light Yellow
  '#A8E6CF', // Light Green
];

export function getRandomBoatColor(): string {
  return boatColors[Math.floor(Math.random() * boatColors.length)];
}
