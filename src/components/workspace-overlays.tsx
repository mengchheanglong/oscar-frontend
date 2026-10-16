"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { WorkspaceIcon } from "@/components/workspace-icons";
export function WorkspaceDialog({
  open,
  title,
  onClose,
  busy = false,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!node.open) node.showModal();
    return () => {
      node.close();
      previous?.isConnected && previous.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={dialog}
      className="workspace-dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) closeRef.current();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) closeRef.current();
      }}
    >
      <div className="workspace-dialog-heading">
        <h2>{title}</h2>
        <button
          type="button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
          className="workspace-icon-button"
        >
          <WorkspaceIcon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function FloatingMenu({
  anchor,
  onClose,
  label,
  children,
  placement = "right",
}: {
  placement?: "right" | "bottom";
  anchor: RefObject<HTMLElement>;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const menu = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [position, setPosition] = useState({ left: 0, top: 0 }),
    [host, setHost] = useState<Element | null>(null);
  useLayoutEffect(() => {
    const node = anchor.current;
    if (!node) return;
    setHost(node.closest("dialog") || document.body);
    const r = node.getBoundingClientRect();
    setPosition({
      left: Math.max(
        8,
        Math.min(
          placement === "bottom" ? r.left : r.right + 8,
          innerWidth - 248,
        ),
      ),
      top: Math.max(
        8,
        Math.min(
          placement === "bottom" ? r.bottom + 5 : r.top,
          innerHeight - (placement === "bottom" ? 100 : 260),
        ),
      ),
    });
  }, [anchor, placement]);
  useEffect(() => {
    if (!host) return;
    menu.current
      ?.querySelector<HTMLElement>("button:not([disabled]),a[href]")
      ?.focus();
    const pointer = (event: PointerEvent) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !anchor.current?.contains(event.target as Node)
      )
        closeRef.current();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        anchor.current?.focus();
      } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const nodes = Array.from(
            menu.current?.querySelectorAll<HTMLElement>(
              "button:not([disabled]),a[href]",
            ) || [],
          ),
          index = nodes.indexOf(document.activeElement as HTMLElement);
        nodes[
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? nodes.length - 1
              : (index + (event.key === "ArrowDown" ? 1 : nodes.length - 1)) %
                nodes.length
        ]?.focus();
      }
    };
    const menuNode = menu.current;
    document.addEventListener("pointerdown", pointer);
    menuNode?.addEventListener("keydown", key);
    const hide = () => closeRef.current();
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      menuNode?.removeEventListener("keydown", key);
      window.removeEventListener("resize", hide);
    };
  }, [anchor, host]);
  return host
    ? createPortal(
        <div
          ref={menu}
          role="menu"
          aria-label={label}
          className="workspace-floating-menu"
          style={position}
        >
          {children}
        </div>,
        host,
      )
    : null;
}
