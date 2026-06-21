import { memo, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

interface Props {
  scrollRef: RefObject<HTMLDivElement | null>;
  totalWidth: number;
  todayIdx: number;
  dayWidth: number;
  marginLeft: number;
}

/**
 * Custom horizontal scrollbar for the timeline. Decoupled from React state
 * so the parent grid never re-renders on scroll — the thumb position/size is
 * written straight to the DOM inside an rAF tick driven by the source
 * scroll container.
 *
 * Visual behaviour: the thumb is largest when the viewport is centred on
 * "today" and shrinks the further the user drags in either direction.
 */
export const TimelineScrollbar = memo(function TimelineScrollbar({
  scrollRef,
  totalWidth,
  todayIdx,
  dayWidth,
  marginLeft,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  // Latest geometry kept in a ref so the rAF loop & pointer handlers always
  // read fresh values without re-binding listeners.
  const geomRef = useRef({ totalWidth, todayIdx, dayWidth, trackWidth: 0 });
  geomRef.current.totalWidth = totalWidth;
  geomRef.current.todayIdx = todayIdx;
  geomRef.current.dayWidth = dayWidth;

  // Recompute and write thumb size + position directly to the DOM.
  //
  // Behaviour: the thumb follows the real scroll position from start to end.
  // Its size is largest around "today" and smoothly shrinks toward the
  // minimum as the user scrolls farther away, without remapping or jumping
  // the position back to the middle.
  const renderThumb = (scrollLeft: number) => {
    const thumb = thumbRef.current;
    const track = trackRef.current;
    if (!thumb || !track) return;
    const g = geomRef.current;
    const visibleWidth = g.trackWidth;
    if (visibleWidth <= 0) return;
    const maxScroll = Math.max(0, g.totalWidth - visibleWidth);
    const todayLeft = Math.max(
      0,
      Math.min(maxScroll, g.todayIdx * g.dayWidth - visibleWidth / 2 + g.dayWidth / 2),
    );
    const proportional =
      g.totalWidth > 0 ? (visibleWidth * visibleWidth) / g.totalWidth : visibleWidth;
    const baseThumb = Math.max(60, proportional);
    const maxThumb = Math.min(visibleWidth * 0.6, baseThumb * 2.6);
    const minThumb = 20;
    const distLeft = todayLeft;
    const distRight = Math.max(0, maxScroll - todayLeft);
    const safeMaxScroll = Math.max(1, maxScroll);
    const clampedScroll = Math.max(0, Math.min(maxScroll, scrollLeft));
    const delta = clampedScroll - todayLeft;
    const sideMax = delta < 0 ? Math.max(1, distLeft) : Math.max(1, distRight);
    const absRatio = Math.min(1, Math.abs(delta) / sideMax);
    // Quadratic ease so the thumb stays large near today and shrinks
    // faster as the user drags further away.
    const eased = absRatio * absRatio;
    const thumbWidth = maxThumb - (maxThumb - minThumb) * eased;
    const usable = Math.max(0, visibleWidth - thumbWidth);
    const thumbLeft = usable * (clampedScroll / safeMaxScroll);
    thumb.style.width = `${thumbWidth}px`;
    thumb.style.transform = `translate3d(${thumbLeft}px, 0, 0)`;
  };

  // Subscribe to the source scroll element, throttled with rAF.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        renderThumb(el.scrollLeft);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    renderThumb(el.scrollLeft);
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollRef]);

  // Track width via ResizeObserver — also triggers a thumb redraw.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      geomRef.current.trackWidth = track.clientWidth;
      renderThumb(scrollRef.current?.scrollLeft ?? 0);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(track);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render thumb when totalWidth / today shifts (e.g. load-more prepend).
  useEffect(() => {
    renderThumb(scrollRef.current?.scrollLeft ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalWidth, todayIdx, dayWidth]);

  // Drag the thumb — bypass React entirely.
  // The thumb uses the same proportional position as the real timeline
  // scrollLeft, so dragging it can never snap the timeline back toward
  // today or any artificial midpoint.
  const onThumbPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const src = scrollRef.current;
    if (!src) return;
    const startX = e.clientX;
    const startScroll = src.scrollLeft;
    const g = geomRef.current;
    const visibleWidth = g.trackWidth;
    const maxScroll = Math.max(0, g.totalWidth - visibleWidth);
    const thumbW = thumbRef.current?.offsetWidth ?? 60;
    const usable = Math.max(1, visibleWidth - thumbW);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const next = Math.max(0, Math.min(maxScroll, startScroll + (dx / usable) * maxScroll));
      src.scrollLeft = next;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
  };

  // Click on the track jumps to the matching real scroll position.
  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const src = scrollRef.current;
    if (!src) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const g = geomRef.current;
    const visibleWidth = g.trackWidth;
    const maxScroll = Math.max(0, g.totalWidth - visibleWidth);
    const thumbW = thumbRef.current?.offsetWidth ?? 60;
    const usable = Math.max(1, visibleWidth - thumbW);
    const ratio = Math.max(0, Math.min(1, (clickX - thumbW / 2) / usable));
    const next = Math.max(0, Math.min(maxScroll, ratio * maxScroll));
    src.scrollTo({ left: next, behavior: 'smooth' });
  };

  return (
    <div
      ref={trackRef}
      className="shrink-0 relative z-30"
      onPointerDown={onTrackPointerDown}
      style={{
        marginLeft,
        height: 16,
        background:
          'linear-gradient(180deg, hsl(var(--primary-hsl) / 0.04), hsl(var(--primary-hsl) / 0.10))',
        borderRadius: 999,
        cursor: 'pointer',
        contain: 'layout paint size',
      }}
    >
      <div
        ref={thumbRef}
        onPointerDown={onThumbPointerDown}
        style={{
          position: 'absolute',
          top: 2,
          bottom: 2,
          left: 0,
          width: 60,
          willChange: 'transform, width',
          borderRadius: 999,
          background:
            'linear-gradient(180deg, hsl(var(--primary-hsl) / 0.85), hsl(var(--primary-hsl) / 0.55))',
          boxShadow:
            '0 1px 3px hsl(var(--primary-hsl) / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.25)',
          cursor: 'grab',
          touchAction: 'none',
        }}
      />
    </div>
  );
});
