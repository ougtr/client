const SkeletonBlock = ({ lines = 4, className = '' }) => {
  const safeLines = Math.max(1, Number(lines) || 1);
  return (
    <div className={`skeleton-card ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: safeLines }).map((_, index) => (
        <div
          key={`skeleton-line-${index}`}
          className={`skeleton-line ${index % 3 === 0 ? 'skeleton-wide' : ''}`.trim()}
        />
      ))}
    </div>
  );
};

export default SkeletonBlock;