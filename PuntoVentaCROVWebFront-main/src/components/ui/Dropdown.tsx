// components/ui/Dropdown.tsx
import { useEffect, useRef, useState, ReactNode } from 'react';
import Link from 'next/link';

interface DropdownItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  items?: DropdownItem[];
}

interface DropdownProps {
  title: ReactNode;
  icon?: ReactNode;
  items: DropdownItem[];
}

export default function Dropdown({ title, icon, items }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderItems = (items: DropdownItem[]) =>
    items.map((item, index) => (
      <div
        key={index}
        className={item.items ? 'relative group' : undefined}
      >
        {item.href ? (
          <Link
            href={item.href}
            className="flex items-center gap-2 py-1 hover:text-orange-500"
            onClick={() => setOpen(false)}
          >
            {item.icon}
            {item.label}
          </Link>
        ) : (
          <div className="flex items-center gap-2 py-1">
            {item.icon}
            {item.label}
          </div>
        )}
        {item.items && (
          <div className="absolute left-full top-0 mt-0 hidden group-hover:block bg-white text-black rounded shadow z-50 min-w-max px-4 py-2">
            {renderItems(item.items)}
          </div>
        )}
      </div>
    ));

  return (
    <div className="relative inline-block" ref={ref}>
      <div
        className="flex items-center gap-1 cursor-pointer hover:underline select-none"
        onClick={() => setOpen(!open)}
      >
        {icon} {title}
      </div>

      {open && (
        <div className="absolute left-0 mt-2 bg-white text-black rounded shadow z-50 min-w-max px-4 py-2">
          {renderItems(items)}
        </div>
      )}
    </div>
  );
}
