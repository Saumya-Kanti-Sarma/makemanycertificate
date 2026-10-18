const Navbar = () => {
  return (
    <nav className="relative z-10 flex h-19 items-center justify-between border-b border-white/8 px-5 sm:px-12 lg:px-24">
      <a href="/" className="flex items-center gap-3">
        <img src={"/MMC.svg"} alt="MMC-logo" className="w-15" />
        <h1 className="text-2xl font-black">MAKE MANY CERTIFICATE</h1>
      </a>
    </nav>
  )
}

export default Navbar