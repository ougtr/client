const LOGO_SIZES = ['sm', 'md', 'lg'];

const Logo = ({ size = 'md', withText = false, className = '' }) => {
  const normalizedSize = LOGO_SIZES.includes(size) ? size : 'md';
  const classes = ['logo', `logo-${normalizedSize}`, className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <img
        src="/opale.jpg"
        alt="Opale Assistance"
        loading="lazy"
      />
      {withText && <span className="logo-text">Gestion Missions Auto</span>}
    </div>
  );
};

export default Logo;
