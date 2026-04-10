import React from 'react';

const heroImageDesktop =
  'https://res.cloudinary.com/dwwt5xdsz/image/upload/v1775804007/desktopBanner_nukh3f.jpg';
const heroImageMobile =
  'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804007/mobileBanner_m4eob3.jpg';
const featuredGames = [
  {
    id: 'aviator',
    title: 'Aviator',
    image:
      'https://res.cloudinary.com/dwwt5xdsz/image/upload/v1775804006/aviatorGame_qfug5k.jpg',
  },
  {
    id: 'chicken-road',
    title: 'Chicken Road',
    image:
      'https://res.cloudinary.com/dwwt5xdsz/image/upload/v1775804006/chickenRoadMap_vsvc1a.jpg',
  },
  {
    id: 'roulette',
    title: 'Roulette',
    image:
      'https://res.cloudinary.com/dwwt5xdsz/image/upload/v1775804007/roulletGame_a719um.jpg',
  },
];

const heroStyle = (url) => ({
  backgroundImage: `url(${url})`,
  backgroundSize: 'cover',
  backgroundPosition: 'top center',
  backgroundRepeat: 'no-repeat',
});
const hideScrollbarStyle = {
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
};

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
      <section className="w-full max-w-full px-4 md:px-6 pb-3 md:pb-5">
        <div className="w-full rounded-2xl bg-gradient-to-br from-[#172033] to-[#111827] border border-[#26344f] p-3.5 md:p-4 shadow-lg">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-white text-lg md:text-xl font-semibold leading-tight">
                Play &amp; Win
              </h2>
              <p className="text-[#AAB3C5] text-xs md:text-sm mt-0.5">
                Instant games, tap to play now
              </p>
            </div>
            <span className="hidden sm:inline-flex shrink-0 rounded-full bg-[#1a74e5]/20 border border-[#1a74e5]/50 text-[#cbe0ff] text-[10px] md:text-xs font-semibold px-2.5 py-1">
              Tap &amp; Play
            </span>
          </div>
          <div
            className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={hideScrollbarStyle}
          >
            {featuredGames.map((game) => (
              <article
                key={game.id}
                className="group relative w-[150px] sm:w-[180px] md:w-[220px] aspect-[4/3] rounded-xl overflow-hidden shrink-0 snap-start ring-1 ring-white/10 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <img
                  src={game.image}
                  alt={game.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                <span className="absolute top-2 right-2 text-[10px] md:text-xs font-semibold text-white bg-[#1a74e5] px-2 py-0.5 rounded-full shadow-md">
                  Play
                </span>
                <div className="absolute left-3 bottom-2.5">
                  <p className="text-[10px] md:text-xs text-white/65 leading-none">
                    Game
                  </p>
                  <h3 className="text-white text-sm md:text-base font-medium leading-tight flex items-center gap-1">
                    {game.title}
                    <span className="text-xs text-white/80">{'->'}</span>
                  </h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
