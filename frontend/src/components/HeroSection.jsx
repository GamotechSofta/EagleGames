import React from 'react';

const heroImageDesktop =
  'https://res.cloudinary.com/dwwt5xdsz/image/upload/v1775804007/desktopBanner_nukh3f.jpg';
const heroImageMobile =
  'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804007/mobileBanner_m4eob3.jpg';

const heroStyle = (url) => ({
  backgroundImage: `url(${url})`,
  backgroundSize: 'cover',
  backgroundPosition: 'top center',
  backgroundRepeat: 'no-repeat',
});

const HeroSection = () => {
  return (
    <>
      {/* Desktop: section with aspect ratio so the background has height */}
      <section
        className="w-full max-w-full overflow-hidden mb-6 relative hidden md:block"
        style={{ aspectRatio: '1920/500' }}
      >
        <div
          className="absolute inset-0 w-full h-full mt-3"
          style={heroStyle(heroImageDesktop)}
        />
      </section>
      {/* Mobile: img at original aspect ratio */}
      <section className="w-full max-w-full overflow-hidden mb-6 md:hidden">
        <img
          src={heroImageMobile}
          alt=""
          className="w-full h-auto object-contain"
        />
      </section>
    </>
  );
};

export default HeroSection;
