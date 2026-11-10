'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

type DropdownContextType = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rootRef: React.RefObject<HTMLDivElement | null>;
  popupRef: React.RefObject<HTMLDivElement | null>;
};

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

function useDropdown() {
  const context = useContext(DropdownContext);
  if (!context) throw new Error('Dropdown components must be used within DropdownMenu');
  return context;
}

interface DropdownMenuProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function DropdownMenu({ children, className = 'ac-menu', style }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // The popup is portaled to <body>, so it lives outside `ref` in the DOM.
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideRoot = ref.current?.contains(target);
      const insidePopup = popupRef.current?.contains(target);
      if (!insideRoot && !insidePopup) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen, rootRef: ref, popupRef }}>
      <div className={className} ref={ref} style={style}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

interface DropdownTriggerProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  asChild?: boolean;
}

function DropdownTrigger({ children, className, onClick, style, asChild }: DropdownTriggerProps) {
  const { open, setOpen } = useDropdown();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) onClick(e);
    setOpen((v) => !v);
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        if (child.props.onClick) child.props.onClick(e);
        handleClick(e);
      },
      className: `${child.props.className || ''} ${className || ''}`.trim(),
      style: { ...child.props.style, ...style },
      'aria-expanded': open,
    });
  }

  return (
    <div
      className={className}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Re-dispatch as a click so the same handler runs for keyboard users
          e.currentTarget.click();
        }
      }}
      role="button"
      tabIndex={0}
      style={style}
      aria-expanded={open}
    >
      {children}
    </div>
  );
}
DropdownMenu.Trigger = DropdownTrigger;

interface DropdownContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function DropdownContent({ children, className = 'ac-menu-pop', style }: DropdownContentProps) {
  const { open, rootRef, popupRef } = useDropdown();

  // Position the popup with `position: fixed` relative to the trigger's viewport
  // rect. Rendering it in a portal means no scrollable ancestor (e.g. a horizontal
  // scroller) can clip it. Flips above the trigger when there is no room below.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const popup = popupRef.current;
      const root = rootRef.current;
      if (!popup || !root) return;
      const rect = root.getBoundingClientRect();
      const height = popup.offsetHeight;
      const below = rect.bottom + 4;
      const above = rect.top - 4 - height;
      const top = below + height > window.innerHeight && above >= 0 ? above : below;
      popup.style.top = `${top}px`;
      popup.style.right = `${window.innerWidth - rect.right}px`;
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, rootRef, popupRef]);

  if (!open) return null;
  return createPortal(
    <div
      ref={popupRef}
      className={className}
      style={{ ...style, position: 'fixed', top: 0, right: 0, zIndex: 1000 }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
DropdownMenu.Content = DropdownContent;

interface DropdownItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  variant?: 'default' | 'danger';
  style?: React.CSSProperties;
  closeOnClick?: boolean;
}

function DropdownItem({ children, className, onClick, variant = 'default', style, closeOnClick = true }: DropdownItemProps) {
  const { setOpen } = useDropdown();
  return (
    <button
      className={`ac-menu-item ${variant === 'danger' ? 'ac-menu-item--danger' : ''} ${className || ''}`.trim()}
      style={style}
      onClick={(e) => {
        if (onClick) onClick(e);
        if (closeOnClick) setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
DropdownMenu.Item = DropdownItem;

function DropdownLabel({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={`ac-menu-label ${className || ''}`.trim()}>{children}</div>;
}
DropdownMenu.Label = DropdownLabel;

function DropdownSeparator({ className }: { className?: string }) {
  return <div className={`ac-menu-sep ${className || ''}`.trim()}></div>;
}
DropdownMenu.Separator = DropdownSeparator;
