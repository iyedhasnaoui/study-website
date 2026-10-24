export function AboutPage() {
  return (
    <main className="about-page section-shell">
      <section className="about-page__hero">
        <div>
          <p className="eyebrow">About the circle</p>
          <h1>Students building bridges across Africa and beyond.</h1>
          <p>
            Ifriqiya Academic Circle brings curious students together to exchange academic experience,
            create practical learning paths, and make international opportunities easier to navigate.
          </p>
        </div>
        <img src="/assets/iac-logo.jpeg" alt="Ifriqiya Academic Circle" />
      </section>

      <section className="about-page__grid">
        <article><span>01</span><h2>Academic exchange</h2><p>We connect students across universities, programs, scholarships, research, and early-career roles.</p></article>
        <article><span>02</span><h2>Knowledge systems</h2><p>Our Zitouna tools turn lived experience into searchable discussions, roadmaps, materials, and trusted answers.</p></article>
        <article><span>03</span><h2>Community events</h2><p>Talks, workshops, and member-led sessions create room for the questions that do not fit inside a lecture.</p></article>
      </section>

      <section className="about-page__departments">
        <p className="eyebrow">One club, many contributions</p>
        <h2>Our departments</h2>
        <div><span>Academic programs</span><span>Partnerships</span><span>Community</span><span>Technology</span><span>Events</span></div>
      </section>
    </main>
  )
}
