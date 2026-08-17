import { SPLASH_POSTERS, showcaseImageUrl } from '../../showcase';

/** Intrinsic size of the generated placeholders, used to reserve space before they load. */
const IMG_W = 900;
const IMG_H = 1273;

/**
 * Three posters held like a hand of cards: one face-on in front, two fanned behind showing only
 * their outer edges.
 *
 * The rotation origin sits at the bottom of each card so the two behind pivot outward like cards
 * held in a hand, rather than sliding sideways. Exact offsets live in CSS, where the responsive
 * tightening happens.
 */
export function PosterFan() {
  const [primary, left, right] = SPLASH_POSTERS;

  return (
    <div className="fan">
      <div className="fan__card fan__card--left">
        <img
          src={showcaseImageUrl(left.image)}
          alt={left.description}
          width={IMG_W}
          height={IMG_H}
          loading="eager"
        />
      </div>
      <div className="fan__card fan__card--right">
        <img
          src={showcaseImageUrl(right.image)}
          alt={right.description}
          width={IMG_W}
          height={IMG_H}
          loading="eager"
        />
      </div>
      <div className="fan__card fan__card--primary">
        <img
          src={showcaseImageUrl(primary.image)}
          alt={primary.description}
          width={IMG_W}
          height={IMG_H}
          loading="eager"
          fetchPriority="high"
        />
      </div>
    </div>
  );
}
