/**
 * An icon image that crossfades to a pre-drawn "darker" variant on hover,
 * for icons whose color is baked into the image itself (so a CSS
 * background/brightness change can't selectively darken just one part of
 * it). The parent clickable element must have the `group` class.
 *
 * Props:
 * - src: the default icon
 * - hoverSrc: the darker variant shown on hover
 * - alt: alt text (put on the base image; the overlay is decorative)
 * - imgClassName: sizing classes applied to both images identically
 */
function HoverIcon({ src, hoverSrc, alt = '', imgClassName = '' }) {
  return (
    <span className="relative inline-block">
      <img src={src} alt={alt} className={`block ${imgClassName}`} />
      <img
        src={hoverSrc}
        alt=""
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${imgClassName}`}
      />
    </span>
  );
}

export default HoverIcon;
