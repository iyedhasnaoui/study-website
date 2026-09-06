import { useEffect, useState } from 'react'

interface HomePageProps {
  onOpenForum: () => void
  onOpenRoadmaps: () => void
  onJoin: () => void
}

const focusCards = [
  { number: '01', label: 'Discover', detail: 'Find trusted explanations from people learning beside you.' },
  { number: '02', label: 'Connect', detail: 'Turn a difficult question into a generous conversation.' },
  { number: '03', label: 'Contribute', detail: 'Share a roadmap that helps the next student move faster.' },
]

const features = [
  {
    icon: '↗',
    label: 'Learning roadmaps',
    title: 'See the path, not just the destination.',
    copy: 'Community-built learning sequences transform ambitious goals into clear, practical next steps.',
    action: 'Explore roadmaps',
    kind: 'roadmaps',
  },
  {
    icon: '◎',
    label: 'Academic forum',
    title: 'Questions become shared momentum.',
    copy: 'Ask openly, reply thoughtfully, and keep useful context attached to every academic discussion.',
    action: 'Enter the forum',
    kind: 'forum',
  },
  {
    icon: '✦',
    label: 'Trusted resources',
    title: 'Knowledge gains a reputation.',
    copy: 'Ratings, verification, and contribution history help the strongest material rise to the surface.',
    action: 'Join the contributors',
    kind: 'join',
  },
]

export function HomePage({ onOpenForum, onOpenRoadmaps, onJoin }: HomePageProps) {
  const [activeFocus, setActiveFocus] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveFocus((current) => (current + 1) % focusCards.length)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [])

  const runFeatureAction = (kind: string) => {
    if (kind === 'roadmaps') onOpenRoadmaps()
    else if (kind === 'forum') onOpenForum()
    else onJoin()
  }

  return (
    <main>
      <section className="hero section-shell" aria-labelledby="hero-heading">
        <div className="hero__glow hero__glow--one" />
        <div className="hero__glow hero__glow--two" />

        <div className="hero__copy reveal-in">
          <p className="eyebrow"><span /> Built by learners, shaped by trust</p>
          <h1 id="hero-heading">
            Knowledge grows
            <em>in circles.</em>
          </h1>
          <p className="hero__lead">
            Ifriqiya Academic Circle is where students turn questions into clarity, experience into roadmaps,
            and individual progress into shared academic strength.
          </p>
          <div className="hero__actions">
            <button className="button button--gold" type="button" onClick={onJoin}>
              Join the circle <span aria-hidden="true">↗</span>
            </button>
            <button className="button button--ghost" type="button" onClick={onOpenRoadmaps}>
              Explore knowledge
            </button>
          </div>
          <div className="hero__proof" aria-label="Platform values">
            <span><i>✓</i> Community-led</span>
            <span><i>✓</i> Practical learning</span>
            <span><i>✓</i> Open exchange</span>
          </div>
        </div>

        <div className="hero__visual reveal-in reveal-in--delay" aria-label="Ifriqiya Academic Circle identity">
          <div className="orbit orbit--outer" />
          <div className="orbit orbit--inner" />
          <div className="hero__logo-card">
            <img src="/assets/iac-logo.jpeg" alt="Ifriqiya Academic Circle palm tree logo" />
          </div>
          <div className="floating-note floating-note--top">
            <span>Live circle</span>
            <strong>12 learners online</strong>
          </div>
          <div className="floating-note floating-note--bottom">
            <b>87%</b>
            <span>roadmap completion</span>
          </div>
          <div className="gold-star gold-star--one">✦</div>
          <div className="gold-star gold-star--two">✦</div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Community highlights">
        <div className="section-shell signal-strip__inner">
          <p>One circle</p><span />
          <p>Many disciplines</p><span />
          <p>Knowledge that travels</p><span />
          <p>Progress that stays</p>
        </div>
      </section>

      <section className="section-shell story-section" id="about">
        <div className="section-heading">
          <p className="eyebrow">A living academic network</p>
          <h2>From “I’m stuck” to “let me show you.”</h2>
          <p>Designed around the small moments where real learning happens—and the people who make them possible.</p>
        </div>

        <div className="focus-stage">
          <div className="focus-stage__panel">
            <p className="focus-stage__number">{focusCards[activeFocus].number}</p>
            <div>
              <span>Our rhythm</span>
              <h3>{focusCards[activeFocus].label}</h3>
              <p>{focusCards[activeFocus].detail}</p>
            </div>
          </div>
          <div className="focus-stage__steps">
            {focusCards.map((card, index) => (
              <button
                type="button"
                key={card.label}
                className={index === activeFocus ? 'is-active' : ''}
                onClick={() => setActiveFocus(index)}
              >
                <span>{card.number}</span>
                <strong>{card.label}</strong>
                <i />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-section" id="platform">
        <div className="section-shell">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">Inside the circle</p>
              <h2>Three ways to move learning forward.</h2>
            </div>
            <p>Start with what you need today. Leave something useful for the student arriving tomorrow.</p>
          </div>

          <div className="feature-grid">
            {features.map((feature, index) => (
              <article className={`feature-card feature-card--${index + 1}`} key={feature.title}>
                <div className="feature-card__top">
                  <span className="feature-card__icon">{feature.icon}</span>
                  <span className="feature-card__index">0{index + 1}</span>
                </div>
                <p className="feature-card__label">{feature.label}</p>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
                <button type="button" onClick={() => runFeatureAction(feature.kind)}>
                  {feature.action} <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell impact-section">
        <div className="impact-card">
          <div className="impact-card__copy">
            <p className="eyebrow">A culture of contribution</p>
            <h2>Your understanding can shorten someone else’s journey.</h2>
            <p>
              A precise reply, a well-ordered roadmap, or one carefully reviewed resource can become the turning point
              in another student’s week.
            </p>
            <button className="button button--light" type="button" onClick={onOpenForum}>See current discussions</button>
          </div>
          <div className="impact-card__stats">
            <div><strong>01</strong><span>shared question can unlock a group</span></div>
            <div><strong>24h</strong><span>for a secure sign-in session</span></div>
            <div><strong>∞</strong><span>ways for knowledge to travel</span></div>
          </div>
        </div>
      </section>

      <section className="section-shell closing-cta">
        <img src="/assets/iac-logo.jpeg" alt="" />
        <p className="eyebrow">The next insight starts here</p>
        <h2>Bring your question.<br />Leave with a direction.</h2>
        <button className="button button--gold" type="button" onClick={onJoin}>Create your academic identity</button>
      </section>
    </main>
  )
}
