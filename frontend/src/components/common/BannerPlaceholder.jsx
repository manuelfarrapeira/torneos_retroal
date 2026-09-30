import retroalBanner from '../../assets/retroal-banner.png'

export function BannerPlaceholder() {
  return (
    <div className="placeholder placeholder-banner">
      <img src={retroalBanner} alt="Retroal" className="placeholder-banner-img" />
    </div>
  )
}
