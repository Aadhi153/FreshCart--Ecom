import type {
  HTMLAttributes,
  TableHTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
} from 'react';

export function Table({ className, children, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  const classes = ['fc-table', className].filter(Boolean).join(' ');
  return (
    <div className="fc-table-container">
      <table className={classes} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...rest}>{children}</thead>;
}

export function Tbody({ children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...rest}>{children}</tbody>;
}

export function Tr({ className, children, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  const classes = ['fc-tr', className].filter(Boolean).join(' ');
  return (
    <tr className={classes} {...rest}>
      {children}
    </tr>
  );
}

export function Th({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  const classes = ['fc-th', className].filter(Boolean).join(' ');
  return (
    <th className={classes} {...rest}>
      {children}
    </th>
  );
}

export function Td({ className, children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  const classes = ['fc-td', className].filter(Boolean).join(' ');
  return (
    <td className={classes} {...rest}>
      {children}
    </td>
  );
}
