import Link from 'next/link';
import Icon from './Icon';

/** Entrypoint card that links to the full shot-by-shot workspace
 *  for a session. Highlights cover the four trophy moments; this
 *  surfaces the long-tail — every shot with its captured video. */
export default function ShotListEntrypoint({
  sessionId,
  totalShots,
  videoShots,
}: {
  sessionId: string;
  totalShots: number;
  /** Count of shots with `hasVideo === true`. Drives the secondary line. */
  videoShots: number;
}) {
  return (
    <section className="mb-10">
      <Link
        href={`/shot-review?session=${sessionId}`}
        className="group flex items-center gap-4 bg-white rounded-2xl border border-border-subtle shadow-sm p-5 hover:shadow-md hover:border-border-default transition-all"
      >
        <div className="w-12 h-12 rounded-xl bg-rap-red text-white flex items-center justify-center shrink-0">
          <Icon name="video-camera" size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="type-h3 text-text-primary">
            Review every shot
          </div>
          <div className="text-sm text-text-secondary mt-0.5">
            Step through all {totalShots} shots with playback and annotation
            {videoShots > 0 && (
              <>
                {' · '}
                <span className="font-semibold">{videoShots}</span> with video
              </>
            )}
          </div>
        </div>
        <span className="text-text-tertiary group-hover:text-text-primary transition-colors shrink-0">
          <Icon name="arrow-right" size={20} />
        </span>
      </Link>
    </section>
  );
}
