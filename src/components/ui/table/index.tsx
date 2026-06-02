import { ReactNode } from "react";


interface TableProps {
  children: ReactNode; 
  className?: string; 
}


interface TableHeaderProps {
  children: ReactNode; 
  className?: string; 
}


interface TableBodyProps {
  children: ReactNode; 
  className?: string; 
}


interface TableRowProps {
  children: ReactNode; 
  className?: string; 
}


interface TableCellProps {
  children?: ReactNode;
  isHeader?: boolean;
  className?: string;
  colSpan?: number;
  id?: string;
  style?: React.CSSProperties;
}


const Table: React.FC<TableProps> = ({ children, className = "" }) => {
  return <table className={`min-w-full ${className}`.trim()}>{children}</table>;
};


const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => {
  return <thead className={className}>{children}</thead>;
};


const TableBody: React.FC<TableBodyProps> = ({ children, className }) => {
  return <tbody className={className}>{children}</tbody>;
};


const TableRow: React.FC<TableRowProps> = ({ children, className }) => {
  return <tr className={className}>{children}</tr>;
};


const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  className,
  colSpan,
  id,
  style,
}) => {
  const CellTag = isHeader ? "th" : "td";
  return (
    <CellTag className={` ${className}`} colSpan={colSpan} id={id} style={style}>
      {children}
    </CellTag>
  );
};

export { Table, TableHeader, TableBody, TableRow, TableCell };
