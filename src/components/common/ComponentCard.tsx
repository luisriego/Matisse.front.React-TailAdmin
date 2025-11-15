import React from "react";

interface ComponentCardProps {
  title: string;
  children?: React.ReactNode; // Make children optional
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
  headerContent?: React.ReactNode; // Content to be rendered in the header
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  headerContent,
}) => {
  const hasRenderableChildren = React.Children.count(children) > 0;

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {/* Card Header */}
      <div className="relative flex items-center justify-center px-6 py-5">
        <div className="text-center">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {title}
          </h3>
          {desc && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {desc}
            </p>
          )}
        </div>
        <div className="absolute top-1/2 right-6 -translate-y-1/2">
          {headerContent}
        </div>
      </div>

      {/* Conditionally render Card Body only if there are actual children to render */}
      {hasRenderableChildren && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
          <div className="space-y-6">{children}</div>
        </div>
      )}
    </div>
  );
};

export default ComponentCard;
