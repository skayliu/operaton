import { useRef } from "preact/hooks";
import { PANEL_SIZE, clamp_panel_width, panel_width_from_pointer } from "./modeler_helpers.js";

/** Pointer travel below this is a click, not a drag. */
const DRAG_THRESHOLD = 2;

/**
 * The divider between canvas and properties panel.
 *
 * Two jobs on one small surface: drag to resize, click to collapse/expand.
 * They do not conflict because a drag is only recognised after a few pixels of
 * travel, so releasing after a plain click still toggles.
 *
 * The separator itself is keyboard-operable (arrow keys resize, Home/End go to
 * the bounds, Enter/Space toggles); the chevron is a separate, properly
 * labelled button sitting on top for mouse users who would not guess that the
 * thin bar is clickable.
 */
export const PanelSplitter = ({
  width,
  collapsed,
  on_width,
  on_toggle,
  label,
  expand_label,
  collapse_label,
}) => {
  const drag = useRef(null);

  /**
   * The box the divider is measured against.
   *
   * The bar is only a few pixels wide and sits between canvas and panel, so its
   * own parent is the bar, not the surface: measuring that would report a width
   * of a few pixels, which clamps the panel to its minimum and freezes it there.
   */
  const surface_rect = (element) =>
    (element.closest(".modeler-surface") ?? element.parentElement.parentElement)
      .getBoundingClientRect();

  const on_pointer_down = (event) => {
    if (event.button !== 0 || collapsed) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { pointer_id: event.pointerId, x: event.clientX, moved: false };
    // Without this the drag selects text in the toolbar instead of resizing.
    event.preventDefault();
  };

  const on_pointer_move = (event) => {
    const state = drag.current;
    if (!state || state.pointer_id !== event.pointerId) return;
    if (Math.abs(event.clientX - state.x) > DRAG_THRESHOLD) state.moved = true;
    if (!state.moved) return;

    const rect = surface_rect(event.currentTarget);
    // The panel sits on the right: dragging left widens it.
    on_width(
      clamp_panel_width(
        panel_width_from_pointer(rect.right, event.clientX),
        rect.width,
      ),
    );
  };

  const end_drag = (event) => {
    const state = drag.current;
    if (!state || state.pointer_id !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!state.moved) on_toggle();
  };

  const on_key_down = (event) => {
    if (collapsed) return;

    const deltas = { ArrowLeft: PANEL_SIZE.step, ArrowRight: -PANEL_SIZE.step };
    if (event.key in deltas) {
      event.preventDefault();
      const rect = surface_rect(event.currentTarget);
      on_width(clamp_panel_width(width + deltas[event.key], rect.width));
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      on_width(event.key === "Home" ? PANEL_SIZE.min : PANEL_SIZE.max);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      on_toggle();
    }
  };

  return (
    <div class={`modeler-split${collapsed ? " collapsed" : ""}`}>
      {/*
        `separator` is a focusable widget role here (tabIndex, aria-valuenow,
        arrow-key resizing), which the a11y rule does not model — it only sees
        a non-interactive element with listeners.
      */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        class="modeler-splitter"
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-controls="modeler-properties"
        aria-valuenow={collapsed ? undefined : width}
        aria-valuemin={PANEL_SIZE.min}
        aria-valuemax={PANEL_SIZE.max}
        tabIndex={collapsed ? -1 : 0}
        onPointerDown={on_pointer_down}
        onPointerMove={on_pointer_move}
        onPointerUp={end_drag}
        onPointerCancel={end_drag}
        onKeyDown={on_key_down}
      />
      <button
        type="button"
        class="modeler-split-toggle"
        aria-expanded={!collapsed}
        aria-controls="modeler-properties"
        aria-label={collapsed ? expand_label : collapse_label}
        title={collapsed ? expand_label : collapse_label}
        onClick={on_toggle}
      >
        <span aria-hidden="true">{collapsed ? "‹" : "›"}</span>
      </button>
    </div>
  );
};
