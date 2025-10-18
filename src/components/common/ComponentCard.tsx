import React from "react";

interface ComponentCardProps {
  title: string;
  children?: React.ReactNode; // Make children optional
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
  headerContent?: React.ReactNode; // Content to be rendered in the header
  footerContent?: React.ReactNode; // Content for the footer
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  headerContent,
  footerContent,
}) => {
  const hasRenderableChildren = React.Children.count(children) > 0;

  return (
    <div
      className={`flex flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {title}
          </h3>
          {desc && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {desc}
            </p>
          )}
        </div>
        {headerContent}
      </div>

      {/* Card Body */}
      {hasRenderableChildren && (
        <div className="flex-grow p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
          {children}
        </div>
      )}

      {/* Card Footer */}
      {footerContent && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
          {footerContent}
        </div>
      )}
    </div>
  );
};

export default ComponentCard;
