import clsx from 'clsx';

/**
 * Rapsodo Design System icon renderer.
 *
 * Uses CSS mask-image so the DS SVG (with `fill="currentColor"`) inherits
 * the current text colour — same as inlining, but without needing every
 * icon as a React component.
 *
 * Sources:
 *  - UI icons:      /design-system/assets/icons/stroke/<name>.svg   (24×24)
 *  - Sport metric:  /design-system/assets/icons/metric/<name>.svg   (48×48)
 */

export type StrokeIconName =
  | 'arrow-down' | 'arrow-left' | 'arrow-right' | 'arrow-up'
  | 'badge-check' | 'bell' | 'briefcase' | 'calendar' | 'camera'
  | 'chart-bar' | 'chart-pie' | 'chart-square'
  | 'check' | 'check-circle'
  | 'chevron-down' | 'chevron-left' | 'chevron-right' | 'chevron-up'
  | 'clipboard' | 'clock' | 'cog'
  | 'desktop-computer' | 'device-tablet'
  | 'document' | 'document-text'
  | 'dots-horizontal' | 'dots-vertical'
  | 'download' | 'upload'
  | 'exclamation' | 'exclamation-circle'
  | 'external-link' | 'eye' | 'eye-off'
  | 'filter' | 'fire' | 'flag' | 'folder'
  | 'globe' | 'globe-alt' | 'heart' | 'home'
  | 'info-circle' | 'key' | 'light-bulb' | 'lightning-bolt' | 'link'
  | 'location-marker' | 'lock-closed'
  | 'mail' | 'map' | 'menu' | 'menu-alt-1'
  | 'minus-circle' | 'moon'
  | 'pause-circle' | 'pencil' | 'pencil-alt'
  | 'photograph' | 'play-circle' | 'plus' | 'plus-circle'
  | 'question-mark' | 'refresh' | 'search' | 'share'
  | 'shield-check' | 'shopping-bag' | 'shopping-cart'
  | 'sparkles' | 'star' | 'sun' | 'tag'
  | 'thumb-down' | 'thumb-up' | 'trash'
  | 'trending-down' | 'trending-up'
  | 'user' | 'user-add' | 'user-circle' | 'user-group'
  | 'video-camera' | 'view-grid' | 'view-list'
  | 'x' | 'x-circle';

export type MetricIconName =
  | 'angle-of-attack' | 'apex' | 'ball-speed'
  | 'carry' | 'club-path' | 'club-speed'
  | 'descent-angle' | 'launch-angle' | 'launch-direction'
  | 'shot-type' | 'side-carry' | 'smash-factor'
  | 'spin-axis' | 'spin-rate' | 'total-carry';

interface IconProps {
  name: StrokeIconName;
  size?: number;
  className?: string;
}

export default function Icon({ name, size = 20, className }: IconProps) {
  const url = `/design-system/assets/icons/stroke/${name}.svg`;
  return (
    <span
      role="img"
      aria-hidden
      className={clsx('inline-block shrink-0 align-middle', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
}

interface MetricIconProps {
  name: MetricIconName;
  size?: number;
  className?: string;
}

export function MetricIcon({ name, size = 24, className }: MetricIconProps) {
  const url = `/design-system/assets/icons/metric/${name}.svg`;
  return (
    <span
      role="img"
      aria-hidden
      className={clsx('inline-block shrink-0 align-middle', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
}
