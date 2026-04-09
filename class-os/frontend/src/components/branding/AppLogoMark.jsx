/**
 * Raster logo served from /public/logo.png (Vite root URL).
 */
export const APP_LOGO_SRC = '/logo.png';

export default function AppLogoMark({ className = '', height = 40 }) {
  return (
    <img
      src={APP_LOGO_SRC}
      alt=""
      className={`object-contain shrink-0 ${className}`}
      style={{ height, width: 'auto' }}
      decoding="async"
    />
  );
}
